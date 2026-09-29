"""
Urban Environmental Digital Twin - Model Prediction Service
===========================================================
Business logic for querying model evaluations and historical forecasts.
"""

from typing import Optional, Tuple, List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.prediction import ModelPrediction
from backend.app.models.station import Station


class PredictionService:
    @staticmethod
    def get_station_predictions(
        db: Session,
        station_id: int,
        model_id: Optional[str] = None,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
        order: str = "asc"
    ) -> Tuple[Optional[List[ModelPrediction]], int]:
        """
        Retrieves paginated historical predictions for a station.
        Returns (items, total_count). If station does not exist, returns (None, 0).
        """
        station_exists = db.query(Station.station_id).filter(Station.station_id == station_id).scalar()
        if not station_exists:
            return None, 0

        query = db.query(ModelPrediction).filter(
            ModelPrediction.station_id == station_id
        )

        if model_id:
            query = query.filter(ModelPrediction.model_id == model_id)
        if start is not None:
            query = query.filter(ModelPrediction.target_time_utc >= start)
        if end is not None:
            query = query.filter(ModelPrediction.target_time_utc <= end)

        total = query.count()
        order_col = (
            ModelPrediction.target_time_utc.desc()
            if order.lower() == "desc"
            else ModelPrediction.target_time_utc.asc()
        )
        items = (
            query.order_by(order_col)
            .offset(offset)
            .limit(limit)
            .all()
        )

        return items, total
