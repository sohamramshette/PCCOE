"""
Urban Environmental Digital Twin - Health API Tests
===================================================
Tests health probe status, database connectivity checks, and database failure handling.
"""

from unittest.mock import MagicMock
from fastapi import status
from backend.app.database.session import get_db
from backend.app.main import app


def test_health_success(client):
    """Verifies that /health returns 200 with database='connected' and active station counts."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["service"] == "urban-environmental-digital-twin"
    assert data["active_stations"] == 6
    assert data["registered_models"] >= 4


def test_api_v1_health_success(client):
    """Verifies that /api/v1/health returns the same health contract."""
    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_health_database_failure(client):
    """Verifies that a database connectivity error returns HTTP 503 and database='disconnected'."""
    def mock_broken_db():
        broken_session = MagicMock()
        broken_session.execute.side_effect = RuntimeError("Connection pool exhausted / Network timeout")
        try:
            yield broken_session
        finally:
            pass

    app.dependency_overrides[get_db] = mock_broken_db
    try:
        response = client.get("/health")
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "disconnected"
    finally:
        app.dependency_overrides.pop(get_db, None)
