"""
Urban Environmental Digital Twin - Model Predictions API Tests
==============================================================
Tests prediction querying, model filtering, and absolute error computation.
"""

from fastapi import status


def test_get_predictions_pagination(client):
    """Verifies that model predictions are returned with correct pagination."""
    response = client.get("/api/v1/stations/11613/predictions?limit=10&offset=0")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["station_id"] == 11613
    assert data["total"] > 0
    assert len(data["items"]) == 10

    item = data["items"][0]
    assert "model_id" in item
    assert "predicted_pm25" in item
    assert "target_time_utc" in item
    assert "prediction_time_utc" in item
    assert item["horizon_hours"] == 1


def test_filter_predictions_by_model(client):
    """Verifies filtering by specific model_id (gradient_boosting_baseline)."""
    response = client.get("/api/v1/stations/11613/predictions?model_id=gradient_boosting_baseline&limit=20")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) == 20
    for item in data["items"]:
        assert item["model_id"] == "gradient_boosting_baseline"


def test_absolute_error_computation(client):
    """Verifies that absolute_error is accurately computed when actual_pm25 is populated."""
    response = client.get("/api/v1/stations/11613/predictions?limit=50")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    found_actual = False
    for item in data["items"]:
        if item["actual_pm25"] is not None:
            found_actual = True
            expected_abs_err = round(abs(item["predicted_pm25"] - item["actual_pm25"]), 4)
            assert item["absolute_error"] == expected_abs_err
            break
    assert found_actual, "Expected at least one prediction with ground truth actual_pm25."


def test_predictions_nonexistent_station(client):
    """Verifies that querying predictions for an unknown station returns HTTP 404."""
    response = client.get("/api/v1/stations/999999/predictions")
    assert response.status_code == status.HTTP_404_NOT_FOUND
