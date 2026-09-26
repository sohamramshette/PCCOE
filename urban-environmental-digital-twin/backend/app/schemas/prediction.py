"""
Urban Environmental Digital Twin - Model Prediction Schemas
============================================================
Defines response models for model predictions and evaluation outputs.
Computes absolute_error dynamically when ground truth actual_pm25 is present.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, computed_field


class PredictionItem(BaseModel):
    prediction_id: int = Field(description="Unique prediction record identifier")
    model_id: str = Field(description="Forecasting model identifier slug")
    station_id: int = Field(description="Associated monitoring station ID")
    prediction_time_utc: datetime = Field(description="Forecast initialization time (t)")
    target_time_utc: datetime = Field(description="Target forecast hour (t+h)")
    horizon_hours: int = Field(default=1, description="Forecast horizon in hours")
    predicted_pm25: float = Field(description="Model predicted PM2.5 (ug/m3)")
    actual_pm25: Optional[float] = Field(default=None, description="Observed ground truth PM2.5 (ug/m3) if available")
    split: str = Field(description="Dataset split: VALIDATION, TEST, or INFERENCE")

    @computed_field
    @property
    def absolute_error(self) -> Optional[float]:
        """Calculates absolute error |predicted - actual| if actual is present."""
        if self.actual_pm25 is not None:
            return round(abs(self.predicted_pm25 - self.actual_pm25), 4)
        return None

    model_config = ConfigDict(from_attributes=True)


class PaginatedPredictions(BaseModel):
    station_id: int = Field(description="Associated monitoring station ID")
    model_id: Optional[str] = Field(default=None, description="Filter model identifier if supplied")
    total: int = Field(description="Total predictions matching query criteria")
    page: int = Field(description="Current 1-based page number")
    limit: int = Field(description="Records requested per page")
    offset: int = Field(description="Record offset")
    pages: int = Field(description="Total available pages")
    items: List[PredictionItem] = Field(description="Chronological prediction records")
