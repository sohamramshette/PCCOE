"""
Urban Environmental Digital Twin - Pytest Test Fixtures
========================================================
Configures TestClient, initializes in-memory model serving, and provides database session fixtures.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.model_serving import model_serving


@pytest.fixture(scope="session", autouse=True)
def setup_model_serving():
    """Ensure model serving manager is initialized with trained Phase 7 baseline artifacts."""
    model_serving.initialize()
    yield


@pytest.fixture(scope="session")
def client():
    """Provides a FastAPI test client instance."""
    with TestClient(app) as test_client:
        yield test_client
