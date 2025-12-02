from fastapi import FastAPI, Depends, HTTPException, Security, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
from app.core.config import settings
from app.models.schemas import PhishingCheckInput, PhishingCheckOutput
from app.services.phishing import PhishingService, increment_admin_metric, get_mongo_client

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now, or specify the admin dashboard URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to count API calls
@app.middleware("http")
from fastapi import FastAPI, Depends, HTTPException, Security, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
from app.core.config import settings
from app.models.schemas import PhishingCheckInput, PhishingCheckOutput
from app.services.phishing import PhishingService, increment_admin_metric, get_mongo_client

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now, or specify the admin dashboard URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to count API calls
@app.middleware("http")
async def count_api_calls(request: Request, call_next):
    if request.url.path != "/health" and not request.url.path.startswith("/static"):
        increment_admin_metric("api_calls")
    response = await call_next(request)
    return response

# Admin Dashboard is deployed separately, so we don't# Mount Admin Dashboard - REMOVED as it is deployed separately
# app.mount("/admin", StaticFiles(directory="admin_panel", html=True), name="admin")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == settings.API_KEY:
        return api_key_header
    raise HTTPException(
        status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
    )

@app.get("/")
def root():
    return {"message": "Phishing Agent API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/check-phishing", response_model=PhishingCheckOutput)
async def check_phishing(input_data: PhishingCheckInput, api_key: str = Depends(get_api_key)):
    service = PhishingService()
    result = await service.check_url(input_data.url)
    return result

# --- Admin Routes ---

class AdminLogin(BaseModel):
    password: str

class ReviewUpdate(BaseModel):
    raw_url: str
    safe: int

@app.post(f"{settings.API_V1_STR}/admin/login")
async def admin_login(login: AdminLogin):
    if login.password == settings.ADMIN_PASSWORD:
        return {"status": "ok", "message": "Authenticated"}
    raise HTTPException(status_code=403, detail="Invalid password")

@app.get(f"{settings.API_V1_STR}/admin/stats")
async def get_admin_stats(api_key: str = Depends(get_api_key)):
    client = get_mongo_client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not available")
    
    db = client[settings.MONGO_DB_NAME]
    stats = {}
    cursor = db["admin"].find({})
    for doc in cursor:
        stats[doc["metric"]] = doc["value"]
    
    return stats

@app.get(f"{settings.API_V1_STR}/admin/reviews")
async def get_pending_reviews(api_key: str = Depends(get_api_key)):
    client = get_mongo_client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not available")
    
    db = client[settings.MONGO_DB_NAME]
    # Find documents where reviewed is 0 or False (for backward compatibility)
    reviews = list(db["unsafe_reviews"].find({"reviewed": {"$in": [0, False]}}, {"_id": 0}).limit(50))
    return reviews

@app.post(f"{settings.API_V1_STR}/admin/review")
async def submit_review(review: ReviewUpdate, api_key: str = Depends(get_api_key)):
    client = get_mongo_client()
    if not client:
        raise HTTPException(status_code=500, detail="Database not available")
    
    db = client[settings.MONGO_DB_NAME]
    
    # 1. Update Domain Reputation
    service = PhishingService()
    service.updater.update_map(review.raw_url, review.safe)
    
    # 2. Mark as Reviewed (Set to 1)
    db["unsafe_reviews"].update_one(
        {"raw_url": review.raw_url},
        {"$set": {"reviewed": 1}}
    )
    
    # 3. Increment Human Reviewed Metric
    increment_admin_metric("human_reviewed")
    
    return {"status": "ok", "message": "Review submitted"}
