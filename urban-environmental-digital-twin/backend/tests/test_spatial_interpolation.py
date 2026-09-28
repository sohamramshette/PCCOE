"""
Urban Environmental Digital Twin - Spatial Interpolation Tests
=============================================================
Tests IDW geospatial interpolation grid generation, coordinate interpolation,
and parameter bounds validation.
"""

from fastapi import status


def test_spatial_interpolation_grid_default(client):
    """Verifies that GET /api/v1/spatial/interpolation returns a valid 2D grid."""
    response = client.get("/api/v1/spatial/interpolation")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["method"] == "INVERSE_DISTANCE_WEIGHTING_V1"
    assert data["power"] == 2.0
    assert data["total_grid_points"] > 0
    assert len(data["grid_points"]) == data["total_grid_points"]
    assert data["min_pm25"] >= 0.0
    assert data["max_pm25"] >= data["min_pm25"]
    assert data["mean_pm25"] >= data["min_pm25"]
    assert data["active_stations_count"] >= 1

    # Verify structure of sample grid point
    sample = data["grid_points"][0]
    assert "lat" in sample
    assert "lon" in sample
    assert "pm25" in sample
    assert "aqi_category" in sample
    assert "color" in sample
    assert "confidence" in sample
    assert 0.0 <= sample["confidence"] <= 1.0


def test_spatial_interpolation_custom_power(client):
    """Verifies grid generation with custom IDW power and grid resolution."""
    response = client.get("/api/v1/spatial/interpolation?power=3.0&grid_step=0.03")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["power"] == 3.0
    assert data["grid_step"] == 0.03
    assert data["total_grid_points"] > 0


def test_spatial_interpolation_invalid_step(client):
    """Verifies that out-of-bounds grid steps are rejected with HTTP 422."""
    # Step too small (< 0.005)
    res_small = client.get("/api/v1/spatial/interpolation?grid_step=0.001")
    assert res_small.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Step too large (> 0.05)
    res_large = client.get("/api/v1/spatial/interpolation?grid_step=0.1")
    assert res_large.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_coordinate_interpolation_pune_center(client):
    """Verifies single coordinate interpolation for a central Pune coordinate."""
    payload = {
        "latitude": 18.5304,
        "longitude": 73.8567,
        "power": 2.0
    }
    response = client.post("/api/v1/spatial/interpolate-coordinate", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["latitude"] == 18.5304
    assert data["longitude"] == 73.8567
    assert data["interpolated_pm25"] >= 0.0
    assert data["aqi_category"] in ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]
    assert data["color"].startswith("#")
    assert 0.0 <= data["confidence_score"] <= 1.0
    assert len(data["contributing_stations"]) >= 1

    # Verify sensor weight sum
    total_weights = sum(s["weight_percentage"] for s in data["contributing_stations"])
    assert 99.0 <= total_weights <= 101.0  # Around 100% accounting for rounding
