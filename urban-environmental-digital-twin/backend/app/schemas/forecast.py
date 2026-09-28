"""
Urban Environmental Digital Twin - Forecast Serving Schemas
===========================================================
Defines request and response models for next-hour PM2.5 forecasting.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ForecastResponse(BaseModel):
    station_id: int = Field(description="Monitoring station ID")
    station_name: str = Field(description="Name of monitoring station")
    prediction_time_utc: datetime = Field(description="Forecast initialization hour (t) in UTC")
    target_time_utc: datetime = Field(description="Target forecasted hour (t+1) in UTC")
    horizon_hours: int = Field(default=1, description="Forecast lead time (hours)")
    model_id: str = Field(description="Model identifier used for inference")
    model_type: str = Field(description="Model algorithm family")
    predicted_pm25: float = Field(description="Predicted ambient PM2.5 concentration (ug/m3)")
    unit: str = Field(default="ug/m3", description="Concentration measurement unit")
    data_availability_status: str = Field(
        default="HISTORICAL_INPUTS_VERIFIED",
        description="Confirms that all required real past inputs existed at prediction time"
    )
    input_features_summary: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Key contemporaneous features used (pm25_t, temp_c, wind_speed_ms, ventilation_index, traffic_proxy_index)"
    )
    feature_attributions: list[Dict[str, Any]] = Field(
        default_factory=list,
        description="Top SHAP-style feature contributions driving the prediction for this forecast instance"
    )


class ForecastUnavailableResponse(BaseModel):
    station_id: int = Field(description="Monitoring station ID")
    requested_time_utc: Optional[datetime] = Field(default=None, description="Requested initialization time")
    status: str = Field(default="UNAVAILABLE", description="Forecast availability indicator")
    detail: str = Field(description="Detailed explanation why current forecast inputs are unavailable")
    latest_available_data_utc: Optional[datetime] = Field(
        default=None,
        description="Latest timestamp with complete observations and weather inputs in the system"
    )
