"""
Urban Environmental Digital Twin - Environmental Observations API Route
========================================================================
Exposes hourly observed in-situ pollution and co-located sensor records.
Preserves NULL values and strictly rejects fabricated or zero-filled data.
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.observation_service import ObservationService
from backend.app.schemas.observation import PaginatedObservations, ObservationItem
from backend.app.config.settings import settings

router = APIRouter(prefix="/stations", tags=["Environmental Observations"])


@router.get(
    "/{station_id}/observations",
    response_model=PaginatedObservations,
    summary="Get Station Environmental Observations",
    description="Returns paginated historical hourly pollution observations (PM2.5, PM10, NO2, SO2, CO, O3). NULLs are preserved."
)
def get_station_observations(
    station_id: int,
    start: Optional[datetime] = Query(default=None, description="Start timestamp filter in UTC (ISO 8601)"),
    end: Optional[datetime] = Query(default=None, description="End timestamp filter in UTC (ISO 8601)"),
    limit: int = Query(default=settings.DEFAULT_PAGE_LIMIT, ge=1, le=settings.MAX_PAGE_LIMIT, description="Page limit (1 to 1000)"),
    offset: int = Query(default=0, ge=0, description="Page offset (0 or positive integer)"),
    db: Session = Depends(get_db)
):
    # Validate temporal ordering
    if start is not None and end is not None and start >= end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid temporal query parameters: 'start' ({start.isoformat()}) must be strictly earlier than 'end' ({end.isoformat()})."
        )

    items, total = ObservationService.get_station_observations(
        db=db,
        station_id=station_id,
        start=start,
        end=end,
        limit=limit,
        offset=offset
    )

    if items is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitoring station {station_id} not found."
        )

    page = (offset // limit) + 1
    pages = (total + limit - 1) // limit if total > 0 else 0

    return PaginatedObservations(
        station_id=station_id,
        total=total,
        page=page,
        limit=limit,
        offset=offset,
        pages=pages,
        items=[ObservationItem.model_validate(item) for item in items]
    )
