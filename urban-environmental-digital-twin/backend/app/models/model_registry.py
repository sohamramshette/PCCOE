"""
Urban Environmental Digital Twin - Model Registry Entity
========================================================
Tracks registered ML models, forecasting horizons, training boundaries,
reproducible artifact paths, and empirical validation/test metrics.
"""

from sqlalchemy import Column, String, Boolean, DateTime, JSON, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    model_id = Column(String(100), primary_key=True, index=True, comment="Unique model identifier slug")
    model_name = Column(String(150), nullable=False, comment="Descriptive human-readable model name")
    model_type = Column(String(50), nullable=False, comment="Algorithm family: GRADIENT_BOOSTING, RANDOM_FOREST, LINEAR_RIDGE, PERSISTENCE_HEURISTIC")
    version = Column(String(20), nullable=False, default="1.0.0", comment="Semantic version string")
    target = Column(String(100), nullable=False, default="target_pm25_t_plus_1", comment="Target variable name")
    horizon = Column(String(100), nullable=False, default="t+1 hour (next-hour ambient PM2.5)", comment="Forecasting horizon")
    feature_set = Column(String(50), nullable=False, comment="Feature configuration: CORE_UNIVERSAL_98 or EXTENDED_POLLUTANT_108")
    
    # Chronological Split Temporal Boundaries
    training_start = Column(DateTime(timezone=True), nullable=False)
    training_end = Column(DateTime(timezone=True), nullable=False)
    validation_start = Column(DateTime(timezone=True), nullable=False)
    validation_end = Column(DateTime(timezone=True), nullable=False)
    test_start = Column(DateTime(timezone=True), nullable=False)
    test_end = Column(DateTime(timezone=True), nullable=False)
    
    # Validation & Test Metrics Dictionary (MAE, RMSE, R2, MedAE, Explained Variance)
    metrics = Column(JSON, nullable=False, comment="Structured metrics across validation and test splits")
    artifact_path = Column(String(255), nullable=False, comment="Relative path to serialized joblib/model weights")
    is_active = Column(Boolean, default=True, nullable=False, comment="Flag indicating active serving capability")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    predictions = relationship("ModelPrediction", back_populates="model", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="model")

    def __repr__(self) -> str:
        return f"<ModelRegistry(id='{self.model_id}', type='{self.model_type}', active={self.is_active})>"
