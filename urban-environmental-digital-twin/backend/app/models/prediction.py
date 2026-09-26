"""
Urban Environmental Digital Twin - Model Prediction Entity
==========================================================
Persists historical model evaluations (validation/test splits) and live inference
forecasts across stations, models, and temporal horizons.
"""

from sqlalchemy import (
    Column, Integer, BigInteger, Float, String, DateTime,
    ForeignKey, Index, func
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class ModelPrediction(Base):
    __tablename__ = "model_predictions"

    prediction_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    model_id = Column(String(100), ForeignKey("model_registry.model_id", ondelete="CASCADE"), nullable=False, index=True)
    station_id = Column(Integer, ForeignKey("stations.station_id", ondelete="CASCADE"), nullable=False, index=True)
    
    prediction_time_utc = Column(DateTime(timezone=True), nullable=False, index=True, comment="Initialization hour t (UTC)")
    target_time_utc = Column(DateTime(timezone=True), nullable=False, index=True, comment="Forecasted target hour t+h (UTC)")
    horizon_hours = Column(Integer, nullable=False, default=1, comment="Forecast lead time in hours")
    
    predicted_pm25 = Column(Float, nullable=False, comment="Predicted PM2.5 concentration (µg/m³)")
    actual_pm25 = Column(Float, nullable=True, comment="Ground truth observed PM2.5 (µg/m³; populated if available)")
    split = Column(String(50), nullable=False, default="INFERENCE", comment="Dataset split: VALIDATION, TEST, INFERENCE")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    model = relationship("ModelRegistry", back_populates="predictions")
    station = relationship("Station", back_populates="predictions")

    __table_args__ = (
        Index("ix_model_preds_station_target", "station_id", "target_time_utc"),
        Index("ix_model_preds_model_target", "model_id", "target_time_utc"),
        Index("ix_model_preds_model_station_target", "model_id", "station_id", "target_time_utc"),
    )

    def __repr__(self) -> str:
        return f"<ModelPrediction(model='{self.model_id}', station={self.station_id}, target='{self.target_time_utc}', pred={self.predicted_pm25:.2f})>"
