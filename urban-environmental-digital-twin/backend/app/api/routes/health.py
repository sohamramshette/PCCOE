"""
Urban Environmental Digital Twin - Health & Readiness API
=========================================================
Checks backend service availability and probes live database connectivity.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.database.session import get_db
from backend.app.models.station import Station
from backend.app.models.model_registry import ModelRegistry
from backend.app.schemas.common import HealthResponse

logger = logging.getLogger("health_api")
router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System and Database Health Check",
    description="Probes active database connectivity with a live ping and returns service status."
)
def get_health(response: Response, db: Session = Depends(get_db)):
    """Verifies that the application and database persistence layer are fully operational."""
    db_status = "disconnected"
    active_stations = None
    registered_models = None

    try:
        # Probe database with a lightweight query
        db.execute(text("SELECT 1"))
        db_status = "connected"
        active_stations = db.query(Station).filter(Station.is_active == True).count()
        registered_models = db.query(ModelRegistry).count()
        system_status = "ok"
    except Exception as e:
        logger.error(f"Database health probe failed: {e}")
        system_status = "unhealthy"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status=system_status,
        database=db_status,
        service="urban-environmental-digital-twin",
        timestamp=datetime.now(timezone.utc),
        active_stations=active_stations,
        registered_models=registered_models
    )
