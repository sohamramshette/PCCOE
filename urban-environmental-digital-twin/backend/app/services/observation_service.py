"""
Urban Environmental Digital Twin - Environmental Observation Service
=====================================================================
Business logic for querying in-situ air quality observations.
Preserves NULL values and supports indexed temporal filtering.
"""

from typing import Optional, Tuple, List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.observation import EnvironmentalObservation
from backend.app.models.station import Station


class ObservationService:
    @staticmethod
    def get_station_observations(
        db: Session,
        station_id: int,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[Optional[List[EnvironmentalObservation]], int]:
        """
        Retrieves paginated historical observations for a specific station.
        Returns (items, total_count). If station does not exist, returns (None, 0).
        """
        # Verify station exists
        station_exists = db.query(Station.station_id).filter(Station.station_id == station_id).scalar()
        if not station_exists:
            return None, 0

        query = db.query(EnvironmentalObservation).filter(
            EnvironmentalObservation.station_id == station_id
        )

        if start is not None:
            query = query.filter(EnvironmentalObservation.datetime_utc >= start)
        if end is not None:
            query = query.filter(EnvironmentalObservation.datetime_utc <= end)

        total = query.count()
        items = (
            query.order_by(EnvironmentalObservation.datetime_utc.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return items, total

    @staticmethod
    def get_latest_observation(db: Session, station_id: int) -> Optional[EnvironmentalObservation]:
        """Retrieves the most recent hourly observation for a station."""
        return (
            db.query(EnvironmentalObservation)
            .filter(EnvironmentalObservation.station_id == station_id)
            .order_by(EnvironmentalObservation.datetime_utc.desc())
            .first()
        )
