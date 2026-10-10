"""
Unit and regression tests for Upgrade 1 (Quantiles) and Upgrade 2 (Direct Multi-Horizon).
"""
import pytest
import pandas as pd
import numpy as np
from backend.app.services.model_serving import model_serving


@pytest.fixture(scope="module", autouse=True)
def init_models():
    model_serving.initialize()


def test_advanced_models_loaded():
    assert "10" in model_serving.quantile_models
    assert "50" in model_serving.quantile_models
    assert "90" in model_serving.quantile_models
    for h in ["1h", "3h", "6h", "12h", "24h"]:
        assert h in model_serving.multi_horizon_models


def test_predict_quantiles_monotonicity():
    feat_dict = {f: 0.0 for f in model_serving.core_features}
    feat_dict["station_id"] = 11609
    feat_dict["zone_type"] = "Commercial / Educational Urban Core"
    feat_dict["pm25_completeness_flag"] = "COMPLETE"
    feat_dict["dominant_landuse"] = "residential"
    feat_dict["pm25"] = 35.0
    feat_dict["pm25_lag_1h"] = 34.0
    feat_dict["wind_speed_ms"] = 2.0
    feat_dict["pbl_height_m"] = 600.0
    feat_dict["ventilation_index"] = 1200.0

    df = pd.DataFrame([feat_dict])
    p10, p50, p90 = model_serving.predict_quantiles(df)

    assert p10 >= 0.0
    assert p50 >= 0.0
    assert p90 >= 0.0
    assert p10 <= p50 <= p90


def test_predict_horizon_anchors():
    feat_dict = {f: 0.0 for f in model_serving.core_features}
    feat_dict["station_id"] = 11609
    feat_dict["zone_type"] = "Commercial / Educational Urban Core"
    feat_dict["pm25_completeness_flag"] = "COMPLETE"
    feat_dict["dominant_landuse"] = "residential"
    feat_dict["pm25"] = 35.0

    df = pd.DataFrame([feat_dict])
    for h in ["1h", "t+1h", "3h", "t+3h", "6h", "t+6h", "12h", "t+12h", "24h", "t+24h"]:
        val = model_serving.predict_horizon(h, df)
        assert val is not None
        assert val > 0.0
