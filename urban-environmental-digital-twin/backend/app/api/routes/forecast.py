"""
Urban Environmental Digital Twin - Next-Hour Forecast Serving API Route
=======================================================================
Serves real-time inference for next-hour PM2.5 forecasting using pre-loaded
Phase 7 baseline models (defaulting to the active production model gradient_boosting_baseline).
Enforces strict input data checks and rejects fabricated future inputs.
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.forecast_service import ForecastService, ForecastDataUnavailableException
from backend.app.services.llm_service import LLMExplanationService
from backend.app.schemas.forecast import (
    ForecastResponse, ForecastUnavailableResponse, ForecastTrajectoryResponse
)
from backend.app.schemas.llm import ForecastExplanationResponse
from backend.app.config.settings import settings

router = APIRouter(prefix="/stations", tags=["Model Serving & Forecasting"])


@router.get(
    "/{station_id}/forecast",
    response_model=ForecastResponse,
    responses={
        200: {"model": ForecastResponse, "description": "Successful next-hour PM2.5 forecast."},
        404: {"description": "Station or model not found."},
        422: {"model": ForecastUnavailableResponse, "description": "Current forecast inputs unavailable at prediction time."}
    },
    summary="Get Next-Hour PM2.5 Forecast",
    description=(
        "Serves next-hour (t+1) ambient PM2.5 forecast for a monitoring station using pre-loaded "
        "production ML models. Defaults to the designated production baseline (gradient_boosting_baseline). "
        "Uses verified multi-domain features available at prediction time. "
        "If inputs for the requested timestamp are missing, returns an explicit unavailability response."
    )
)
def get_station_forecast(
    station_id: int,
    timestamp: Optional[datetime] = Query(
        default=None,
        description="Forecast initialization hour in UTC (ISO 8601). If omitted, defaults to the latest complete historical hour in the database."
    ),
    model_id: Optional[str] = Query(
        default=None,
        description=f"Model identifier to execute (defaults to configured active baseline: '{settings.DEFAULT_FORECAST_MODEL_ID}')"
    ),
    db: Session = Depends(get_db)
):
    try:
        forecast = ForecastService.generate_next_hour_forecast(
            db=db,
            station_id=station_id,
            timestamp=timestamp,
            model_id=model_id
        )
    except ForecastDataUnavailableException as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "status": "UNAVAILABLE",
                "station_id": exc.station_id,
                "detail": str(exc),
                "latest_available_data_utc": exc.latest_available_dt.isoformat() if exc.latest_available_dt else None
            }
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )

    if forecast is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitoring station {station_id} not found."
        )

    return forecast


@router.get(
    "/{station_id}/forecast/trajectory",
    response_model=ForecastTrajectoryResponse,
    responses={
        200: {"model": ForecastTrajectoryResponse, "description": "Successful 24-hour PM2.5 multi-horizon forecast trajectory."},
        404: {"description": "Station or model not found."},
        422: {"model": ForecastUnavailableResponse, "description": "Current forecast inputs unavailable at prediction time."}
    },
    summary="Get 24-Hour PM2.5 Forecast Trajectory",
    description=(
        "Simulates a multi-step autoregressive 24-hour PM2.5 forecast trajectory forward from "
        "the initialization hour. Computes empirical compounding 95% confidence intervals, "
        "diurnal traffic variations, and NAQI tier classifications."
    )
)
def get_station_forecast_trajectory(
    station_id: int,
    timestamp: Optional[datetime] = Query(
        default=None,
        description="Forecast initialization hour in UTC (ISO 8601). If omitted, defaults to latest complete historical hour."
    ),
    model_id: Optional[str] = Query(
        default=None,
        description=f"Model identifier to execute (defaults to configured active baseline: '{settings.DEFAULT_FORECAST_MODEL_ID}')"
    ),
    horizon_hours: int = Query(
        default=24,
        ge=1,
        le=48,
        description="Forecast horizon length in hours (default 24 hours)"
    ),
    db: Session = Depends(get_db)
):
    try:
        trajectory = ForecastService.generate_trajectory_forecast(
            db=db,
            station_id=station_id,
            timestamp=timestamp,
            model_id=model_id,
            horizon_hours=horizon_hours
        )
    except ForecastDataUnavailableException as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "status": "UNAVAILABLE",
                "station_id": exc.station_id,
                "detail": str(exc),
                "latest_available_data_utc": exc.latest_available_dt.isoformat() if exc.latest_available_dt else None
            }
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )

    if trajectory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitoring station {station_id} not found."
        )

    return trajectory


@router.get(
    "/{station_id}/forecast/explain",
    response_model=ForecastExplanationResponse,
    responses={
        200: {"model": ForecastExplanationResponse, "description": "AI-generated narrative explanation of forecast."},
        404: {"description": "Station or model not found."},
        422: {"model": ForecastUnavailableResponse, "description": "Current forecast inputs unavailable at prediction time."}
    },
    summary="Get AI Explanation for Next-Hour PM2.5 Forecast",
    description=(
        "Synthesizes natural language environmental drivers, public health advisories, "
        "and civic recommendations from machine learning forecast outputs and atmospheric features using Google Gemini."
    )
)
def explain_station_forecast(
    station_id: int,
    timestamp: Optional[datetime] = Query(
        default=None,
        description="Forecast initialization hour in UTC (ISO 8601). If omitted, defaults to latest complete historical hour."
    ),
    model_id: Optional[str] = Query(
        default=None,
        description=f"Model identifier to execute (defaults to configured active baseline: '{settings.DEFAULT_FORECAST_MODEL_ID}')"
    ),
    db: Session = Depends(get_db)
):
    try:
        explanation = LLMExplanationService.explain_forecast(
            db=db,
            station_id=station_id,
            timestamp=timestamp,
            model_id=model_id
        )
        return explanation
    except ForecastDataUnavailableException as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "status": "UNAVAILABLE",
                "station_id": exc.station_id,
                "detail": str(exc),
                "latest_available_data_utc": exc.latest_available_dt.isoformat() if exc.latest_available_dt else None
            }
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )

