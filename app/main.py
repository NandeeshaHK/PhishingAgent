from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN
from app.core.config import settings
from app.models.schemas import PhishingCheckInput, PhishingCheckOutput
from app.services.phishing import PhishingService

app = FastAPI(title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json")

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
