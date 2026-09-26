"""
Urban Environmental Digital Twin - Application Settings & Configuration
========================================================================
Centralizes environment configuration, database connection parameters, and
application constants using Pydantic Settings (Pydantic v2).
"""

import os
from pathlib import Path
from typing import Optional
from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory paths
BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent
ENV_FILE_PATH = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH) if ENV_FILE_PATH.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Project metadata
    PROJECT_NAME: str = "Urban Environmental Digital Twin"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = Field(default="development", description="Environment: development, testing, production")

    # PostgreSQL Connection Components
    POSTGRES_USER: str = Field(default="postgres", description="PostgreSQL database user")
    POSTGRES_PASSWORD: str = Field(default="postgres", description="PostgreSQL database password")
    POSTGRES_HOST: str = Field(default="localhost", description="PostgreSQL host")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL port")
    POSTGRES_DB: str = Field(default="urban_digital_twin", description="PostgreSQL database name")

    # Direct database connection URL (overrides individual components if specified)
    DATABASE_URL: Optional[str] = Field(default=None, description="Complete SQLAlchemy database connection URL")

    # Fallback local SQLite URL for test execution and offline model validation
    SQLITE_DEV_URL: str = Field(
        default=f"sqlite:///{BACKEND_DIR.as_posix()}/dev_digital_twin.db",
        description="Local SQLite fallback path"
    )

    # CORS Configuration
    CORS_ORIGINS_RAW: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173",
        alias="CORS_ORIGINS",
        description="Comma-separated allowed CORS origins"
    )

    # Model & Feature Artifacts
    DEFAULT_FORECAST_MODEL_ID: str = Field(
        default="gradient_boosting_baseline",
        description="Default production baseline model identifier"
    )
    MODELS_DIR: Path = Field(
        default=PROJECT_ROOT / "ml" / "models",
        description="Path to serialized ML model artifacts"
    )
    FEATURES_DATASET_PATH: Path = Field(
        default=PROJECT_ROOT / "ml" / "data" / "processed" / "features" / "feature_dataset.csv",
        description="Path to processed feature store CSV"
    )

    # Pagination Defaults
    DEFAULT_PAGE_LIMIT: int = Field(default=50, description="Default pagination page limit")
    MAX_PAGE_LIMIT: int = Field(default=1000, description="Maximum allowable page limit")

    # API Keys & Secrets
    OPENAQ_API_KEY: Optional[str] = Field(default=None, description="OpenAQ REST API v3 key")
    LLM_API_KEY: Optional[str] = Field(default=None, description="LLM integration API key")

    @property
    def cors_origins(self) -> list[str]:
        """Parse comma-separated CORS origins into a list of strings."""
        return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]

    @computed_field
    @property
    def sqlalchemy_database_uri(self) -> str:
        """Returns the active SQLAlchemy database URI."""
        if self.DATABASE_URL:
            # Normalize postgres:// to postgresql+psycopg2:// if needed
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and "+psycopg2" not in url and "+psycopg" not in url:
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url
        
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
