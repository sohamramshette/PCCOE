"""
Urban Environmental Digital Twin - Model Registry Service
=========================================================
Business logic for querying MLOps model registry metadata and performance metrics.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.model_registry import ModelRegistry


class ModelService:
    @staticmethod
    def get_all_models(db: Session, active_only: bool = False) -> List[ModelRegistry]:
        """Retrieves all registered models."""
        query = db.query(ModelRegistry)
        if active_only:
            query = query.filter(ModelRegistry.is_active == True)
        return query.order_by(ModelRegistry.model_id).all()

    @staticmethod
    def get_model_by_id(db: Session, model_id: str) -> Optional[ModelRegistry]:
        """Retrieves a single registered model by its identifier."""
        return db.query(ModelRegistry).filter(ModelRegistry.model_id == model_id).first()
