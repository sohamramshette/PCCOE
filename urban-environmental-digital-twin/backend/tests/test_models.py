"""
Urban Environmental Digital Twin - Model Registry API Tests
===========================================================
Tests model registry listing, detailed model metadata, validation/test metrics, and 404 handling.
"""

from fastapi import status


def test_list_models(client):
    """Verifies that /api/v1/models returns all 4 registered baseline models."""
    response = client.get("/api/v1/models")
    assert response.status_code == status.HTTP_200_OK
    models = response.json()
    assert len(models) == 4

    model_ids = {m["model_id"] for m in models}
    expected_ids = {
        "gradient_boosting_baseline",
        "random_forest_baseline",
        "ridge_baseline",
        "persistence_baseline"
    }
    assert model_ids == expected_ids

    for m in models:
        assert "model_name" in m
        assert "model_type" in m
        assert "validation_mae" in m
        assert "test_mae" in m
        assert m["validation_mae"] > 0
        assert m["test_mae"] > 0
        # Verify filesystem paths are NOT exposed in summary
        assert "artifact_path" not in m


def test_get_model_detail(client):
    """Verifies that /api/v1/models/gradient_boosting_baseline returns complete metrics."""
    response = client.get("/api/v1/models/gradient_boosting_baseline")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["model_id"] == "gradient_boosting_baseline"
    assert data["model_type"] == "GRADIENT_BOOSTING"
    assert data["target"] == "target_pm25_t_plus_1"
    assert data["horizon"] == "t+1 hour (next-hour ambient PM2.5)"

    # Verify structured metrics dictionary
    assert "metrics" in data
    assert "validation" in data["metrics"]
    assert "test" in data["metrics"]
    assert data["metrics"]["validation"]["mae"] == 4.6686
    assert round(data["metrics"]["test"]["rmse"], 2) == 9.11

    # Verify temporal split boundaries
    assert "training_start" in data
    assert "training_end" in data
    assert "validation_start" in data
    assert "test_end" in data

    # Verify filesystem paths are NOT exposed
    assert "artifact_path" not in data


def test_get_nonexistent_model(client):
    """Verifies that requesting an unregistered model returns HTTP 404."""
    response = client.get("/api/v1/models/unknown_deep_learning_v9")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    err = response.json()
    assert "not found" in err["detail"].lower()
