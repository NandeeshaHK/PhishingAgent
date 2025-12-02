import json
import os
import re
import httpx
import asyncio
from datetime import datetime, timezone
from collections import OrderedDict
from urllib.parse import urlparse
from playwright.async_api import async_playwright
from app.services.llm import get_llm
from langchain_core.messages import HumanMessage, SystemMessage

from pymongo import MongoClient
from pymongo.server_api import ServerApi
from app.core.config import settings

# Global MongoDB Client
mongo_client = None

def get_mongo_client():
    global mongo_client
    if mongo_client is None and settings.MONGO_URI:
        try:
            mongo_client = MongoClient(settings.MONGO_URI, server_api=ServerApi('1'))
        except Exception as e:
            print(f"Failed to connect to MongoDB: {e}")
    return mongo_client

def increment_admin_metric(metric_name: str, value: int = 1):
    client = get_mongo_client()
    if not client:
        return
    try:
        db = client[settings.MONGO_DB_NAME]
        collection = db["admin"]
        collection.update_one(
            {"metric": metric_name},
            {"$inc": {"value": value}},
            upsert=True
        )
    except Exception as e:
        print(f"Failed to update metric {metric_name}: {e}")

class LRUCache:
    def __init__(self, capacity: int = 1000):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key: str):
        if key not in self.cache:
            return None
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: str, value: int):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

# Global Cache
domain_reputation_cache = LRUCache(capacity=1000)


class DomainExtractor:
    def extract_domain(self, url: str) -> str:
        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        parsed = urlparse(url)
        domain = parsed.netloc.lower().strip()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain

class DomainChecker:
    def check_reputation(self, domain: str) -> int:
        # 1. Check Cache
        cached_safe = domain_reputation_cache.get(domain)
        if cached_safe is not None:
            increment_admin_metric("used_cache")
            return cached_safe

        client = get_mongo_client()
        if not client:
            return -1 # Fallback if DB not available
        
        try:
            db = client[settings.MONGO_DB_NAME]
            collection = db["domain_reputation"]
            doc = collection.find_one({"domain": domain})
            if doc:
                safe_val = doc.get("safe", -1)
                # Update Cache
                domain_reputation_cache.put(domain, safe_val)
                return safe_val
            return -1
        except Exception as e:
            print(f"Error checking reputation: {e}")
            return -1

class DomainUpdater:
    def update_map(self, raw_url: str, safe_value: int):
        extractor = DomainExtractor()
        domain = extractor.extract_domain(raw_url)
        
        client = get_mongo_client()
        if not client:
            return {"raw_url": raw_url, "safe": safe_value, "error": "DB not connected"}

        try:
            db = client[settings.MONGO_DB_NAME]
            collection = db["domain_reputation"]
            collection.update_one(
                {"domain": domain},
                {"$set": {"domain": domain, "safe": safe_value}},
                upsert=True
            )
            # Update Cache
            domain_reputation_cache.put(domain, safe_value)
            return {"raw_url": raw_url, "safe": safe_value}
        except Exception as e:
             print(f"Error updating reputation: {e}")
             return {"raw_url": raw_url, "safe": safe_value, "error": str(e)}

class AdvancedURLAnalyzer:
    AFFILIATE_PATTERNS = [
        r"amazon\.in", r"amazon\.[a-z]+", r"amzn\.to",
        r"flipkart\.com", r"affiliate", r"ref=", r"utm_source=affiliate"
    ]
    MALICIOUS_PATTERNS = [
        r"<script[^>]*>.*eval", r"obfuscate", r"base64_decode",
        r"document\.location", r"malware", r"phishing",
        r"onclick=\"window\.open", r"redirect"
    ]

    def normalize_url(self, url):
        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        return url

    def count_affiliates(self, html):
        return sum(len(re.findall(p, html, re.IGNORECASE)) for p in self.AFFILIATE_PATTERNS)

    def detect_malicious(self, html):
        return sum(len(re.findall(p, html, re.IGNORECASE | re.DOTALL)) for p in self.MALICIOUS_PATTERNS)

    def extract_text(self, html):
        cleaned = re.sub("<script.*?>.*?</script>", "", html, flags=re.DOTALL)
        cleaned = re.sub("<style.*?>.*?</style>", "", cleaned, flags=re.DOTALL)
        cleaned = re.sub("<[^>]+>", " ", cleaned)
        return " ".join(cleaned.split())

    async def fetch_with_playwright(self, url):
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                try:
                    context = await browser.new_context(
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36"
                    )
                    page = await context.new_page()
                    await page.goto(url, wait_until="networkidle", timeout=15000)
                    html = await page.content()
                finally:
                    await browser.close()
                return html
        except Exception as e:
            return f"[Playwright Error: {str(e)}]"

    async def analyze(self, raw_url: str):
        try:
            url = self.normalize_url(raw_url)
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
            }
            
            async with httpx.AsyncClient(follow_redirects=True, timeout=10, headers=headers) as client:
                try:
                    response = await client.get(url)
                    redirects = len(response.history)
                    status = response.status_code
                    html = response.text or ""
                except Exception:
                     # Fallback if httpx fails
                    redirects = 0
                    status = 0
                    html = ""

            require_js = (
                status in [403, 503] or
                "cloudflare" in html.lower() or
                "attention required" in html.lower() or
                len(html.strip()) < 50
            )

            if require_js or not html:
                html = await self.fetch_with_playwright(url)

            affiliates = self.count_affiliates(html)
            malicious = self.detect_malicious(html)
            text_only = self.extract_text(html)

            score = (malicious * 2) + redirects + (1 if "cloudflare" in html.lower() else 0)

            return {
                "url": url,
                "status_code": status,
                "redirects": redirects,
                "affiliated_links": affiliates,
                "malicious_hits": malicious,
                "suspicious_score": score,
                "require_js_render": require_js,
                "text_only": text_only[:500]
            }
        except Exception as e:
            return {"error": str(e)}

class PhishingService:
    def __init__(self):
        self.extractor = DomainExtractor()
        self.checker = DomainChecker()
        self.updater = DomainUpdater()
        self.analyzer = AdvancedURLAnalyzer()

    async def check_url(self, raw_url: str):
        # 1. Extract Domain
        domain = self.extractor.extract_domain(raw_url)
        
        # 2. Check Reputation
        reputation = self.checker.check_reputation(domain)
        
        # 3. Routing
        if reputation in [0, 1]:
            return {
                "raw_url": raw_url,
                "safe": reputation,
                "analysis": "Known domain"
            }
        
        # 4. Unknown - Deep Analysis
        analysis_result = await self.analyzer.analyze(raw_url)
        
        # 5. LLM Analysis
        llm = get_llm()
        if not llm:
             return {
                "raw_url": raw_url,
                "safe": 0, # Default to unsafe if no LLM
                "analysis": "LLM not configured, cannot verify unknown domain. Analysis data: " + str(analysis_result)
            }

        prompt_content = f"""You are an expert security and content analyst. Analyze the following data extracted from a URL:

{json.dumps(analysis_result, indent=2)}

Provide the final format:
RAW_URL: {raw_url}
SAFE: <1 for safe, 0 for not so Safe>
"""
        messages = [
            SystemMessage(content="After analyzing the INPUT CONTENT. If the content is SAFE -> 1, otherwise SAFE -> 0. Return the in THIS YAML FORMAT:\nRAW_URL: <url>\nSAFE: <int>"),
            HumanMessage(content=prompt_content)
        ]
        
        try:
            increment_admin_metric("total_LLM_calls", 2)
            response = llm.invoke(messages)
            content = response.content
            
            # 6. Parse Output
            # Simple parsing logic based on ParsedSafetyOutput
            safe = 1
            if "SAFE: 0" in content or "SAFE:0" in content:
                safe = 0
            
            # 7. Update Reputation
            self.updater.update_map(raw_url, safe)
            
            # 8. Log Unsafe Reviews
            if safe == 0:
                try:
                    client = get_mongo_client()
                    if client:
                        db = client[settings.MONGO_DB_NAME]
                        review_collection = db["unsafe_reviews"]
                        review_collection.insert_one({
                            "raw_url": raw_url,
                            "domain": domain,
                            "analysis": analysis_result,
                            "llm_output": content,
                            "timestamp": datetime.now(timezone.utc),
                            "reviewed": False
                        })
                except Exception as e:
                    print(f"Failed to log unsafe review: {e}")

            return {
                "raw_url": raw_url,
                "safe": safe,
                "analysis": analysis_result
            }
            
        except Exception as e:
             return {
                "raw_url": raw_url,
                "safe": 0,
                "analysis": f"Error during LLM analysis: {str(e)}"
            }
