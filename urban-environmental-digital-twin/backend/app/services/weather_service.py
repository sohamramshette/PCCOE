"""
Urban Environmental Digital Twin - Weather Reanalysis Service
=============================================================
Business logic for querying ECMWF ERA5-Land numerical reanalysis.
Exposes data explicitly as REANALYSIS with temporal filtering and pagination.
"""

from typing import Optional, Tuple, List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.weather import WeatherReanalysis
from backend.app.models.station import Station


class WeatherService:
    @staticmethod
    def get_station_weather(
        db: Session,
        station_id: int,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
        order: str = "asc"
    ) -> Tuple[Optional[List[WeatherReanalysis]], int]:
        """
        Retrieves paginated meteorological reanalysis records for a station.
        Returns (items, total_count). If station does not exist, returns (None, 0).
        """
        # Verify station exists
        station_exists = db.query(Station.station_id).filter(Station.station_id == station_id).scalar()
        if not station_exists:
            return None, 0

        query = db.query(WeatherReanalysis).filter(
            WeatherReanalysis.station_id == station_id
        )

        if start is not None:
            query = query.filter(WeatherReanalysis.datetime_utc >= start)
        if end is not None:
            query = query.filter(WeatherReanalysis.datetime_utc <= end)

        total = query.count()
        order_col = (
            WeatherReanalysis.datetime_utc.desc()
            if order.lower() == "desc"
            else WeatherReanalysis.datetime_utc.asc()
        )
        items = (
            query.order_by(order_col)
            .offset(offset)
            .limit(limit)
            .all()
        )

        return items, total

    @staticmethod
    def get_latest_weather(db: Session, station_id: int) -> Optional[WeatherReanalysis]:
        """Retrieves the most recent weather reanalysis record for a station."""
        return (
            db.query(WeatherReanalysis)
            .filter(WeatherReanalysis.station_id == station_id)
            .order_by(WeatherReanalysis.datetime_utc.desc())
            .first()
        )
