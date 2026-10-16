"""Core configuration and settings."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "F1 Intelligence System"
    app_version: str = "0.1.0"
    debug: bool = True

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # FastF1
    fastf1_cache_dir: str = str(Path(__file__).parent.parent / "f1_cache")
    fastf1_min_year: int = 2018  # FastF1 timing data starts in 2018; max is the current year

    # LLM (for AI Engineer — Phase 3)
    llm_provider: str = "gemini"  # "gemini", "openai", "claude"
    llm_api_key: str = ""
    llm_model: str = "gemini-2.0-flash"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
