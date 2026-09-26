"""
Urban Environmental Digital Twin - Station Service
==================================================
Business logic for querying monitoring stations and geospatial exposure profiles.
"""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from backend.app.models.station import Station


class StationService:
    @staticmethod
    def get_all_stations(db: Session, active_only: bool = True) -> List[Station]:
        """Retrieves all monitoring stations sorted by station_id."""
        query = db.query(Station)
        if active_only:
            query = query.filter(Station.is_active == True)
        return query.order_by(Station.station_id).all()

    @staticmethod
    def get_station_by_id(db: Session, station_id: int) -> Optional[Station]:
        """Retrieves a single monitoring station by ID."""
        return db.query(Station).filter(Station.station_id == station_id).first()

    @staticmethod
    def get_station_detail(db: Session, station_id: int) -> Optional[Station]:
        """Retrieves a station with its static traffic and activity exposures eagerly loaded."""
        return (
            db.query(Station)
            .options(
                joinedload(Station.traffic_exposure),
                joinedload(Station.activity_exposure)
            )
            .filter(Station.station_id == station_id)
            .first()
        )
