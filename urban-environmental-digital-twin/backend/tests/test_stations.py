"""
Urban Environmental Digital Twin - Stations API Tests
=====================================================
Tests station listing, detailed spatial exposures, and 404 handling for invalid stations.
"""

from fastapi import status


def test_list_stations(client):
    """Verifies that /api/v1/stations returns all 6 active Pune monitoring stations."""
    response = client.get("/api/v1/stations")
    assert response.status_code == status.HTTP_200_OK
    stations = response.json()
    assert len(stations) == 6

    station_ids = {s["station_id"] for s in stations}
    expected_ids = {11609, 11613, 60658, 3409331, 3409438, 3409526}
    assert station_ids == expected_ids

    # Check station attributes
    for s in stations:
        assert "station_name" in s
        assert "latitude" in s
        assert "longitude" in s
        assert "zone_type" in s
        assert "city" in s
        assert s["is_active"] is True


def test_get_station_detail(client):
    """Verifies that /api/v1/stations/11613 returns Shivajinagar details with spatial exposures."""
    response = client.get("/api/v1/stations/11613")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["station_id"] == 11613
    assert "Revenue Colony-Shivajinagar" in data["station_name"]
    assert data["city"] == "Pune"

    # Verify static spatial exposures are populated
    assert data["traffic_exposure"] is not None
    assert data["traffic_exposure"]["total_road_length_km"] > 0
    assert data["activity_exposure"] is not None
    assert data["activity_exposure"]["poi_total_count_1_5km"] > 0


def test_get_nonexistent_station(client):
    """Verifies that requesting an invalid station returns HTTP 404."""
    response = client.get("/api/v1/stations/999999")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    err = response.json()
    assert "not found" in err["detail"].lower()
