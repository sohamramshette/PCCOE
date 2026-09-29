"""
Urban Environmental Digital Twin - OpenAQ Real-Time Sync Tests
=============================================================
Tests sync health status, manual sync triggers, and data ingestion logic.
"""

from fastapi import status
from datetime import datetime, timezone
from backend.app.services.openaq_service import OpenAQSyncService


def test_get_sync_status(client):
    """Verifies that GET /api/v1/sync/status returns the sync pipeline health."""
    response = client.get("/api/v1/sync/status")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["service_status"] in ["ONLINE", "STANDBY_NO_API_KEY"]
    assert "openaq_api_configured" in data
    assert data["active_stations_monitored"] == 6
    assert data["total_realtime_records"] >= 0


def test_trigger_openaq_sync_with_mock(client, monkeypatch):
    """Verifies that POST /api/v1/sync/openaq successfully ingests telemetry readings."""
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00:00Z")
    sample_api_response = [
        {
            "sensorsId": 12236463,
            "value": 42.8,
            "parameter": {"name": "pm25"},
            "datetime": {
                "utc": now_iso,
                "local": now_iso
            }
        },
        {
            "sensorsId": 12236462,
            "value": 75.3,
            "parameter": {"name": "pm10"},
            "datetime": {
                "utc": now_iso,
                "local": now_iso
            }
        }
    ]

    monkeypatch.setattr(
        OpenAQSyncService,
        "_fetch_location_latest",
        lambda station_id: sample_api_response
    )

    response = client.post("/api/v1/sync/openaq")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["status"] in ["SUCCESS", "PARTIAL"]
    assert data["stations_attempted"] == 6
    assert data["stations_successful"] == 6
    assert len(data["details"]) == 6

    # Verify that readings were parsed
    first_st = data["details"][0]
    assert first_st["pm25"] == 42.8
    assert first_st["pm10"] == 75.3
    assert first_st["status"] in ["INGESTED", "ALREADY_PRESENT", "UPDATED"]

    # Clean up test rows to preserve database purity
    from backend.app.database.session import SessionLocal
    from backend.app.models.observation import EnvironmentalObservation
    db = SessionLocal()
    try:
        db.query(EnvironmentalObservation).filter(
            EnvironmentalObservation.datetime_utc == datetime(2026, 9, 28, 12, 0, tzinfo=timezone.utc),
            EnvironmentalObservation.pm25 == 42.8
        ).delete()
        db.commit()
    finally:
        db.close()

