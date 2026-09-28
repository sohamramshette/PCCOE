"""
Urban Environmental Digital Twin - Real-Time Ingestion Sync API Routes
======================================================================
Exposes endpoints for manual and automated live telemetry synchronization
from CPCB / OpenAQ API v3.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.sync import OpenAQSyncResponse, SyncStatusResponse
from backend.app.services.openaq_service import OpenAQSyncService

router = APIRouter(prefix="/sync", tags=["Real-Time Data Sync"])


@router.post(
    "/openaq",
    response_model=OpenAQSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger OpenAQ Real-Time Sync",
    description=(
        "Executes a live pull of ambient air quality telemetry from OpenAQ API v3 "
        "across all 6 Pune/PCMC monitoring stations, ingesting new readings into the database."
    )
)
def trigger_openaq_sync(db: Session = Depends(get_db)):
    return OpenAQSyncService.sync_all_stations(db=db)


@router.get(
    "/status",
    response_model=SyncStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get OpenAQ Sync Pipeline Health",
    description="Returns current synchronization status, total realtime records ingested, and API connection status."
)
def get_sync_status(db: Session = Depends(get_db)):
    return OpenAQSyncService.get_sync_status(db=db)
