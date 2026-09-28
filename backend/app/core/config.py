from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "okDriver CCTV Intelligence Platform"
    environment: str = "development"
    secret_key: str  # Required — no default; must be set via env var
    access_token_expire_minutes: int = 60
    database_url: str = "sqlite+aiosqlite:///./okdriver.db"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:5173"
    mediamtx_hls_base_url: str = "http://localhost:8888"
    mediamtx_webrtc_base_url: str = "http://localhost:8889"
    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "okdriver-evidence"
    s3_access_key: str = "minioadmin"  # Override in production via S3_ACCESS_KEY env var
    s3_secret_key: str = "minioadmin"  # Override in production via S3_SECRET_KEY env var
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
