import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.data.providers import SyntheticProvider
from app.main import create_app
from app.services.snapshot import SnapshotService


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(market_data_provider="synthetic")


@pytest.fixture(scope="session")
def snapshot(settings):
    return SnapshotService(SyntheticProvider(), settings).get("US")


@pytest.fixture
def client():
    get_settings.cache_clear()
    with TestClient(create_app(provider=SyntheticProvider())) as test_client:
        yield test_client
    get_settings.cache_clear()
