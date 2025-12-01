from pydantic import BaseModel
from typing import Optional, Any

class PhishingCheckInput(BaseModel):
    url: str
    message: Optional[str] = None

class PhishingCheckOutput(BaseModel):
    raw_url: str
    safe: int
    analysis: Optional[Any] = None
