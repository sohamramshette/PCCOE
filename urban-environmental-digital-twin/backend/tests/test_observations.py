"""
Urban Environmental Digital Twin - Environmental Observations API Tests
========================================================================
Tests observation pagination, temporal filtering, NULL value preservation, and parameter validation.
"""

from fastapi import status


def test_get_observations_pagination(client):
    """Verifies that observations are returned with correct pagination structure and default limit."""
    response = client.get("/api/v1/stations/11613/observations?limit=10&offset=0")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["station_id"] == 11613
    assert data["total"] == 14016
    assert data["limit"] == 10
    assert data["offset"] == 0
    assert len(data["items"]) == 10

    # Verify chronological ordering
    item0 = data["items"][0]
    item1 = data["items"][1]
    assert item0["datetime_utc"] <= item1["datetime_utc"]
    assert "pm25" in item0
    assert "data_provenance" in item0


def test_null_value_preservation(client):
    """
    Verifies that unmonitored or missing pollutants remain strictly NULL.
    At Station 11609 (Mhada Colony), PM10 sensor does not exist, so pm10 must be None/null.
    """
    response = client.get("/api/v1/stations/11609/observations?limit=5")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) == 5
    for item in data["items"]:
        # PM10 must be null (None), NEVER converted to 0.0
        assert item["pm10"] is None, f"Expected null PM10 at station 11609, got {item['pm10']}"


def test_temporal_filtering(client):
    """Verifies filtering by start and end UTC timestamps."""
    start_str = "2025-06-01T00:00:00Z"
    end_str = "2025-06-02T23:00:00Z"
    response = client.get(f"/api/v1/stations/11613/observations?start={start_str}&end={end_str}&limit=100")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total"] == 48  # Exactly 48 hours in 2 days
    assert len(data["items"]) == 48


def test_invalid_temporal_parameters(client):
    """Verifies that start >= end returns HTTP 400."""
    start_str = "2025-06-02T00:00:00Z"
    end_str = "2025-06-01T00:00:00Z"
    response = client.get(f"/api/v1/stations/11613/observations?start={start_str}&end={end_str}")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    err = response.json()
    assert "strictly earlier" in err["detail"].lower()


def test_invalid_limit_bounds(client):
    """Verifies that limit=0 or limit > 1000 triggers HTTP 422 validation error."""
    res_zero = client.get("/api/v1/stations/11613/observations?limit=0")
    assert res_zero.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    res_excess = client.get("/api/v1/stations/11613/observations?limit=1001")
    assert res_excess.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_observations_nonexistent_station(client):
    """Verifies that querying observations for an unknown station returns HTTP 404."""
    response = client.get("/api/v1/stations/999999/observations")
    assert response.status_code == status.HTTP_404_NOT_FOUND
