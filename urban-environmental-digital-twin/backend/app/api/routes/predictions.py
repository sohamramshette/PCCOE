"""
Urban Environmental Digital Twin - Model Predictions API Route
==============================================================
Exposes historical evaluation predictions and serving outputs across stations and models.
Computes absolute_error on the fly when ground truth observations are available.
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.prediction_service import PredictionService
from backend.app.schemas.prediction import PaginatedPredictions, PredictionItem
from backend.app.config.settings import settings

router = APIRouter(prefix="/stations", tags=["Model Predictions"])


@router.get(
    "/{station_id}/predictions",
    response_model=PaginatedPredictions,
    summary="Get Station Model Predictions",
    description="Returns paginated model predictions with targets, actuals, and absolute errors across validation and test splits."
)
def get_station_predictions(
    station_id: int,
    model_id: Optional[str] = Query(default=None, description="Optional model filter (e.g., gradient_boosting_baseline)"),
    start: Optional[datetime] = Query(default=None, description="Start target timestamp filter in UTC"),
    end: Optional[datetime] = Query(default=None, description="End target timestamp filter in UTC"),
    limit: int = Query(default=settings.DEFAULT_PAGE_LIMIT, ge=1, le=settings.MAX_PAGE_LIMIT, description="Page limit (1 to 1000)"),
    offset: int = Query(default=0, ge=0, description="Page offset (0 or positive integer)"),
    db: Session = Depends(get_db)
):
    if start is not None and end is not None and start >= end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid temporal query parameters: 'start' ({start.isoformat()}) must be strictly earlier than 'end' ({end.isoformat()})."
        )

    items, total = PredictionService.get_station_predictions(
        db=db,
        station_id=station_id,
        model_id=model_id,
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

    return PaginatedPredictions(
        station_id=station_id,
        model_id=model_id,
        total=total,
        page=page,
        limit=limit,
        offset=offset,
        pages=pages,
        items=[PredictionItem.model_validate(item) for item in items]
    )
