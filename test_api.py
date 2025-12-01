import requests
import json
import time

BASE_URL = "https://phishingagent.onrender.com"
API_KEY = "test_secret"

def test_health():
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Health Check Failed: {e}")

def test_phishing_check_safe():
    try:
        headers = {"X-API-Key": API_KEY}
        data = {"url": "https://google.com"}
        response = requests.post(f"{BASE_URL}/check-phishing", json=data, headers=headers)
        print(f"Safe Check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Safe Check Failed: {e}")

def test_phishing_check_unknown():
    try:
        headers = {"X-API-Key": API_KEY}
        data = {"url": "https://example.com"}
        response = requests.post(f"{BASE_URL}/check-phishing", json=data, headers=headers)
        print(f"Unknown Check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"Unknown Check Failed: {e}")

if __name__ == "__main__":
    # Wait for server to start
    time.sleep(5)
    test_health()
    test_phishing_check_safe()
    test_phishing_check_unknown()
