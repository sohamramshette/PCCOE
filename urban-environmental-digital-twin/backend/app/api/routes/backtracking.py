"""
Urban Environmental Digital Twin - Pollution Backtracking API Routes
====================================================================
FastAPI route handlers for 2D kinematic backward atmospheric transport
trajectories and historical pollution episode analysis.
"""

import logging
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.backtracking import (
    BacktrackingRequest,
    BacktrackingResponse,
    CuratedEventsResponse,
)
from backend.app.services.backtracking_service import BacktrackingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtracking", tags=["Pollution Backtracking"])


@router.post(
    "/simulate",
    response_model=BacktrackingResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute 2D Kinematic Backward Atmospheric Trajectory",
    description=(
        "Calculates an hourly 2D kinematic backward atmospheric transport trajectory from "
        "a selected receptor station using time-aligned ECMWF ERA5-Land reanalysis horizontal "
        "wind fields. Produces timestamped waypoints, multi-station evidence correlation, "
        "and a structured investigation summary separating empirical facts from hypotheses."
    )
)
def simulate_backward_trajectory(
    request: BacktrackingRequest,
    db: Session = Depends(get_db)
):
    try:
        return BacktrackingService.calculate_backward_trajectory(db=db, request=request)
    except ValueError as e:
        err_msg = str(e)
        logger.warning("Backtracking calculation validation error: %s", err_msg)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err_msg)
    except Exception as e:
        logger.error("Unexpected error in backtracking simulation: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while computing the backward trajectory."
        )


@router.get(
    "/curated-events",
    response_model=CuratedEventsResponse,
    status_code=status.HTTP_200_OK,
    summary="List Curated Historical Pollution Events",
    description=(
        "Returns cataloged historical pollution episodes from the Pune-PCMC observation archive "
        "with audited data-quality statuses (e.g. multi-station episodes vs unverified local spikes) "
        "suitable for one-click atmospheric backtracking analysis."
    )
)
def get_curated_events():
    return BacktrackingService.get_curated_events()
