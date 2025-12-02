from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Phishing Agent"
    API_KEY: str
    GROQ_API_KEYS: Optional[str] = None # Comma separated keys
    OPENAI_API_KEY: Optional[str] = None
    MONGO_URI: Optional[str] = None
    MONGO_DB_NAME: str = "phishing_agent_db"
    ADMIN_PASSWORD: str = "123asd!@#"

    @property
    def groq_api_key_list(self):
        if self.GROQ_API_KEYS:
            return [key.strip() for key in self.GROQ_API_KEYS.split(",") if key.strip()]
        return []

    class Config:
        env_file = ".env"

settings = Settings()
