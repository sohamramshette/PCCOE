"""
Urban Environmental Digital Twin - Forecast Serving API Tests
=============================================================
Tests real-time next-hour PM2.5 forecasting, model selection, input validation,
and handling of unavailable future timestamps.
"""

from fastapi import status


def test_forecast_default_model(client):
    """
    Verifies that GET /api/v1/stations/11613/forecast returns a valid next-hour forecast
    using the designated production baseline model (gradient_boosting_baseline).
    """
    response = client.get("/api/v1/stations/11613/forecast")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["station_id"] == 11613
    assert "Revenue Colony-Shivajinagar" in data["station_name"]
    assert data["model_id"] == "gradient_boosting_baseline"
    assert data["model_type"] == "GRADIENT_BOOSTING"
    assert data["horizon_hours"] == 1
    assert data["unit"] == "ug/m3"
    assert data["predicted_pm25"] >= 0.0  # Physically bounded PM2.5
    assert data["data_availability_status"] == "HISTORICAL_INPUTS_VERIFIED"
    assert data["input_features_summary"] is not None


def test_forecast_specific_timestamp(client):
    """Verifies forecast generation for a specific valid historical hour."""
    ts = "2026-06-15T12:00:00Z"
    response = client.get(f"/api/v1/stations/11613/forecast?timestamp={ts}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["station_id"] == 11613
    assert data["prediction_time_utc"].startswith("2026-06-15T12:00:00")
    assert data["target_time_utc"].startswith("2026-06-15T13:00:00")
    assert data["predicted_pm25"] > 0.0


def test_forecast_alternative_model(client):
    """Verifies that user can select other registered models such as random_forest_baseline."""
    response = client.get("/api/v1/stations/11613/forecast?model_id=random_forest_baseline")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["model_id"] == "random_forest_baseline"
    assert data["model_type"] == "RANDOM_FOREST"
    assert data["predicted_pm25"] > 0.0


def test_forecast_persistence_model(client):
    """Verifies that heuristic persistence model can be evaluated through the forecast endpoint."""
    response = client.get("/api/v1/stations/11613/forecast?model_id=persistence_baseline")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["model_id"] == "persistence_baseline"
    assert data["predicted_pm25"] > 0.0


def test_forecast_nonexistent_station(client):
    """Verifies that forecasting on an invalid station returns HTTP 404."""
    response = client.get("/api/v1/stations/999999/forecast")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_forecast_unavailable_future_data(client):
    """
    Verifies that requesting a future timestamp where environmental inputs do NOT exist
    returns HTTP 422 with a structured UNAVAILABLE response, without fabricating data.
    """
    future_ts = "2030-01-01T12:00:00Z"
    response = client.get(f"/api/v1/stations/11613/forecast?timestamp={future_ts}")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    err = response.json()
    # Detail is structured error payload
    detail = err["detail"]
    assert detail["status"] == "UNAVAILABLE"
    assert detail["station_id"] == 11613
    assert "unavailable" in detail["detail"].lower()
    assert detail["latest_available_data_utc"] is not None


def test_forecast_shap_contributions_present(client):
    """Verifies that the forecast response includes a ranked SHAP-style explanation for the prediction."""
    response = client.get("/api/v1/stations/11613/forecast")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "feature_attributions" in data
    assert isinstance(data["feature_attributions"], list)
    assert len(data["feature_attributions"]) > 0

    first = data["feature_attributions"][0]
    assert "feature" in first
    assert "contribution" in first
    assert "direction" in first


def test_forecast_shap_contributions_are_meaningful(client):
    """SHAP values should reflect real feature influence, not all-zero placeholders."""
    response = client.get("/api/v1/stations/11613/forecast")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    contributions = [abs(item["contribution"]) for item in data["feature_attributions"]]
    assert contributions, "No feature attribution values generated"
    assert max(contributions) > 0.001, "SHAP contributions are collapsing to zero instead of real feature influence"


def test_forecast_trajectory_default_24h(client):
    """
    Verifies that GET /api/v1/stations/11613/forecast/trajectory returns a valid
    24-hour continuous multi-step forecast trajectory with compounding confidence bounds.
    """
    response = client.get("/api/v1/stations/11613/forecast/trajectory")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["station_id"] == 11613
    assert data["horizon_hours"] == 24
    assert len(data["trajectory"]) == 24
    assert data["peak_predicted_pm25"] >= data["min_predicted_pm25"]
    assert data["average_predicted_pm25"] >= 0.0
    assert data["dominant_naqi_category"] in ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]
    assert "uncertainty_note" in data

    for i, pt in enumerate(data["trajectory"]):
        assert pt["step"] == i + 1
        assert pt["predicted_pm25"] >= 0.0
        assert pt["lower_bound_pm25"] <= pt["predicted_pm25"]
        assert pt["upper_bound_pm25"] >= pt["predicted_pm25"]
        assert pt["lower_bound_pm25"] >= 0.0
        assert pt["aqi_category"] in ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]


def test_forecast_trajectory_custom_horizon(client):
    """Verifies that user can query custom horizon lengths (e.g. 12 hours)."""
    response = client.get("/api/v1/stations/11613/forecast/trajectory?horizon_hours=12")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["horizon_hours"] == 12
    assert len(data["trajectory"]) == 12


def test_forecast_trajectory_unavailable_future(client):
    """Verifies that requesting trajectory from a future timestamp without historical inputs returns 422."""
    response = client.get("/api/v1/stations/11613/forecast/trajectory?timestamp=2030-01-01T12:00:00Z")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert response.json()["detail"]["status"] == "UNAVAILABLE"

