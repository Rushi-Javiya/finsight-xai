from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, overridable through ML_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="ML_", env_file=".env", extra="ignore")

    market_data_provider: Literal["yahoo", "synthetic"] = "yahoo"
    history_period_days: int = 760
    snapshot_ttl_seconds: int = 3600
    fundamentals_workers: int = 8
    risk_free_rate: float = 0.04
    api_key: str | None = None
    log_level: str = "INFO"

    ml_forward_horizon_days: int = 21
    ml_sample_stride_days: int = 5
    ml_min_history_days: int = 200


@lru_cache
def get_settings() -> Settings:
    return Settings()
