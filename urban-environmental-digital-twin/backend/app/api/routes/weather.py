"""
Urban Environmental Digital Twin - Weather Reanalysis API Route
===============================================================
Exposes hourly atmospheric dispersion and meteorological variables.
Explicitly labeled as REANALYSIS (ECMWF ERA5-Land numerical model outputs).
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.weather_service import WeatherService
from backend.app.schemas.weather import PaginatedWeather, WeatherItem
from backend.app.config.settings import settings

router = APIRouter(prefix="/stations", tags=["Weather Reanalysis"])


@router.get(
    "/{station_id}/weather",
    response_model=PaginatedWeather,
    summary="Get Station Meteorological Reanalysis",
    description="Returns paginated atmospheric parameters from ECMWF ERA5-Land numerical reanalysis. Explicitly labeled as REANALYSIS."
)
def get_station_weather(
    station_id: int,
    start: Optional[datetime] = Query(default=None, description="Start timestamp filter in UTC (ISO 8601)"),
    end: Optional[datetime] = Query(default=None, description="End timestamp filter in UTC (ISO 8601)"),
    limit: int = Query(default=settings.DEFAULT_PAGE_LIMIT, ge=1, le=settings.MAX_PAGE_LIMIT, description="Page limit (1 to 1000)"),
    offset: int = Query(default=0, ge=0, description="Page offset (0 or positive integer)"),
    order: str = Query(default="asc", pattern="^(asc|desc)$", description="Sort order by timestamp ('asc' or 'desc')"),
    db: Session = Depends(get_db)
):
    if start is not None and end is not None and start >= end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid temporal query parameters: 'start' ({start.isoformat()}) must be strictly earlier than 'end' ({end.isoformat()})."
        )

    items, total = WeatherService.get_station_weather(
        db=db,
        station_id=station_id,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
        order=order
    )

    if items is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitoring station {station_id} not found."
        )

    page = (offset // limit) + 1
    pages = (total + limit - 1) // limit if total > 0 else 0

    return PaginatedWeather(
        station_id=station_id,
        total=total,
        page=page,
        limit=limit,
        offset=offset,
        pages=pages,
        data_classification="REANALYSIS (ECMWF ERA5-Land via Open-Meteo)",
        items=[WeatherItem.model_validate(item) for item in items]
    )
