"""
Urban Environmental Digital Twin - Spatial Interpolation API Routes
===================================================================
Provides endpoints for continuous geospatial PM2.5 heatmap generation (IDW)
and pinpoint coordinate interpolation.
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.spatial import (
    SpatialInterpolationResponse,
    CoordinateInterpolationRequest,
    CoordinateInterpolationResponse
)
from backend.app.services.spatial_service import SpatialInterpolationService

router = APIRouter(prefix="/spatial", tags=["Spatial Interpolation"])


@router.get(
    "/interpolation",
    response_model=SpatialInterpolationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get 2D Spatial Air Quality Heatmap Grid (IDW)",
    description=(
        "Computes continuous spatial Inverse Distance Weighting (IDW) interpolation "
        "across the Pune & PCMC metropolitan monitoring boundary using real-time station observations."
    )
)
def get_spatial_interpolation(
    grid_step: float = Query(0.015, ge=0.005, le=0.05, description="Geographic grid step in degrees"),
    power: float = Query(2.0, ge=1.0, le=5.0, description="Inverse distance weighting power (p)"),
    timestamp: Optional[datetime] = Query(None, description="Target UTC timestamp for historical re-interpolation"),
    db: Session = Depends(get_db)
):
    return SpatialInterpolationService.generate_grid_interpolation(
        db=db,
        grid_step=grid_step,
        power=power,
        target_timestamp=timestamp
    )


@router.post(
    "/interpolate-coordinate",
    response_model=CoordinateInterpolationResponse,
    status_code=status.HTTP_200_OK,
    summary="Interpolate PM2.5 for an Arbitrary Map Coordinate",
    description=(
        "Calculates the estimated ambient PM2.5, confidence metric, and sensor attribution breakdown "
        "for any point clicked on the digital twin map."
    )
)
def interpolate_coordinate(
    request: CoordinateInterpolationRequest,
    db: Session = Depends(get_db)
):
    return SpatialInterpolationService.interpolate_single_coordinate(
        db=db,
        lat=request.latitude,
        lon=request.longitude,
        power=request.power
    )
