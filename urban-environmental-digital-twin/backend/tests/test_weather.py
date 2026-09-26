"""
Urban Environmental Digital Twin - Weather Reanalysis API Tests
===============================================================
Tests weather reanalysis pagination, temporal filtering, and explicit REANALYSIS data labeling.
"""

from fastapi import status


def test_get_weather_pagination_and_provenance(client):
    """Verifies that weather records are returned with explicit REANALYSIS labeling."""
    response = client.get("/api/v1/stations/11613/weather?limit=10&offset=0")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["station_id"] == 11613
    assert data["total"] == 14016
    assert "REANALYSIS" in data["data_classification"]
    assert len(data["items"]) == 10

    item = data["items"][0]
    assert "temp_c" in item
    assert "humidity_pct" in item
    assert "pbl_height_m" in item
    assert "wind_speed_ms" in item
    assert "solar_rad_wm2" in item
    assert "REANALYSIS" in item["data_provenance"]


def test_weather_temporal_filtering(client):
    """Verifies filtering by start and end timestamps."""
    start_str = "2025-08-01T00:00:00Z"
    end_str = "2025-08-01T23:00:00Z"
    response = client.get(f"/api/v1/stations/11613/weather?start={start_str}&end={end_str}&limit=50")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total"] == 24
    assert len(data["items"]) == 24


def test_weather_invalid_time_range(client):
    """Verifies that start >= end returns HTTP 400."""
    start_str = "2025-08-02T00:00:00Z"
    end_str = "2025-08-01T00:00:00Z"
    response = client.get(f"/api/v1/stations/11613/weather?start={start_str}&end={end_str}")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_weather_nonexistent_station(client):
    """Verifies that querying weather for an unknown station returns HTTP 404."""
    response = client.get("/api/v1/stations/999999/weather")
    assert response.status_code == status.HTTP_404_NOT_FOUND
