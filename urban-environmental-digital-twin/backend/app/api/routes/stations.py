"""
Urban Environmental Digital Twin - Stations API Route
=====================================================
Exposes Pune continuous ambient air quality monitoring stations and spatial exposure profiles.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.station_service import StationService
from backend.app.schemas.station import StationRead, StationDetail

router = APIRouter(prefix="/stations", tags=["Stations"])


@router.get(
    "",
    response_model=List[StationRead],
    summary="List All Active Monitoring Stations",
    description="Returns all active continuous ambient air quality monitoring stations in Pune and PCMC."
)
def list_stations(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    stations = StationService.get_all_stations(db, active_only=active_only)
    return stations


@router.get(
    "/{station_id}",
    response_model=StationDetail,
    summary="Get Station Detail & Spatial Exposures",
    description="Returns detailed station metadata including static road network and activity exposures."
)
def get_station(
    station_id: int,
    db: Session = Depends(get_db)
):
    station = StationService.get_station_detail(db, station_id=station_id)
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitoring station {station_id} not found."
        )
    return station
