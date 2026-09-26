"""
Urban Environmental Digital Twin - Model Registry Schemas
=========================================================
Defines response models for MLOps model governance and empirical evaluation metrics.
Omits internal filesystem absolute paths for security and cleanliness.
"""

from typing import Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ModelRegistrySummary(BaseModel):
    model_id: str = Field(description="Unique model identifier slug")
    model_name: str = Field(description="Descriptive human-readable model name")
    model_type: str = Field(description="Algorithm family (GRADIENT_BOOSTING, RANDOM_FOREST, LINEAR_RIDGE, PERSISTENCE_HEURISTIC)")
    version: str = Field(description="Semantic version string")
    target: str = Field(description="Target variable name")
    horizon: str = Field(description="Forecasting horizon description")
    feature_set: str = Field(description="Feature set configuration identifier")
    is_active: bool = Field(description="Active model flag")
    validation_mae: float = Field(description="Validation set Mean Absolute Error (ug/m3)")
    test_mae: float = Field(description="Test holdout Mean Absolute Error (ug/m3)")

    model_config = ConfigDict(from_attributes=True)


class ModelRegistryDetail(BaseModel):
    model_id: str = Field(description="Unique model identifier slug")
    model_name: str = Field(description="Descriptive human-readable model name")
    model_type: str = Field(description="Algorithm family")
    version: str = Field(description="Semantic version string")
    target: str = Field(description="Target variable name")
    horizon: str = Field(description="Forecasting horizon description")
    feature_set: str = Field(description="Feature set configuration identifier")
    
    # Chronological Split Periods
    training_start: datetime = Field(description="Start of chronological training period (UTC)")
    training_end: datetime = Field(description="End of chronological training period (UTC)")
    validation_start: datetime = Field(description="Start of validation period (UTC)")
    validation_end: datetime = Field(description="End of validation period (UTC)")
    test_start: datetime = Field(description="Start of test holdout period (UTC)")
    test_end: datetime = Field(description="End of test holdout period (UTC)")
    
    metrics: Dict[str, Any] = Field(description="Complete structured evaluation metrics dictionary (MAE, RMSE, R2, MedAE)")
    is_active: bool = Field(description="Active model flag")
    created_at: datetime = Field(description="Model registration timestamp (UTC)")

    model_config = ConfigDict(from_attributes=True)
