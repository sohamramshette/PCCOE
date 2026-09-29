"""
Urban Environmental Digital Twin - Alert & Anomaly Engine API Routes
====================================================================
Exposes environmental alerts, real-time threshold exceedances, PM2.5 spikes,
statistical anomalies, and atmospheric stagnation states.
Supports alert lifecycle transitions (ACTIVE -> ACKNOWLEDGED -> RESOLVED).
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.alert_service import AlertService
from backend.app.schemas.alert import (
    AlertRead, PaginatedAlerts, AlertSummary, AlertEvaluationResult
)
from backend.app.config.settings import settings

router = APIRouter(tags=["Alerts & Anomalies"])


@router.get(
    "/alerts",
    response_model=PaginatedAlerts,
    summary="List Environmental Alerts",
    description="Returns paginated environmental alerts and anomalies with multi-dimensional filtering."
)
def list_alerts(
    station_id: Optional[int] = Query(default=None, description="Filter by monitoring station ID"),
    alert_type: Optional[str] = Query(default=None, description="Filter by alert type (e.g. PM25_THRESHOLD, PM25_SPIKE)"),
    severity: Optional[str] = Query(default=None, description="Filter by severity (INFO, LOW, MEDIUM, HIGH, CRITICAL)"),
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED)"),
    start: Optional[datetime] = Query(default=None, description="Filter detected_at >= start (UTC ISO 8601)"),
    end: Optional[datetime] = Query(default=None, description="Filter detected_at <= end (UTC ISO 8601)"),
    limit: int = Query(default=50, ge=1, le=1000, description="Records per page"),
    offset: int = Query(default=0, ge=0, description="Record offset"),
    order: str = Query(default="desc", pattern="^(asc|desc)$", description="Sort order by detected timestamp"),
    db: Session = Depends(get_db)
):
    if start and end and start >= end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid temporal query: 'start' ({start.isoformat()}) must be strictly earlier than 'end' ({end.isoformat()})."
        )

    items, total = AlertService.get_alerts(
        db=db,
        station_id=station_id,
        alert_type=alert_type,
        severity=severity,
        status=status_filter,
        start=start,
        end=end,
        limit=limit,
        offset=offset,
        order=order
    )

    page = (offset // limit) + 1
    pages = (total + limit - 1) // limit if total > 0 else 0

    return PaginatedAlerts(
        total=total,
        page=page,
        limit=limit,
        offset=offset,
        pages=pages,
        items=items
    )


@router.get(
    "/alerts/active",
    response_model=List[AlertRead],
    summary="List Currently Active Alerts",
    description="Returns all active and unacknowledged environmental anomalies across the monitoring network."
)
def get_active_alerts(
    station_id: Optional[int] = Query(default=None, description="Optional station ID filter"),
    db: Session = Depends(get_db)
):
    return AlertService.get_active_alerts(db=db, station_id=station_id)


@router.get(
    "/alerts/summary",
    response_model=AlertSummary,
    summary="Get Alert Statistics & Summary",
    description="Returns aggregate counts of alerts partitioned by status, severity, and anomaly classification."
)
def get_alert_summary(
    db: Session = Depends(get_db)
):
    return AlertService.get_alert_summary(db=db)


@router.get(
    "/alerts/{alert_id}",
    response_model=AlertRead,
    summary="Get Alert Detail",
    description="Returns complete details, environmental context, and diagnostic metadata for a specific alert."
)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    alert = AlertService.get_alert_by_id(db=db, alert_id=alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert record with ID {alert_id} not found."
        )
    return alert


@router.get(
    "/stations/{station_id}/alerts",
    response_model=List[AlertRead],
    summary="Get Station Alerts",
    description="Returns recent or active alerts associated with a specific monitoring station."
)
def get_station_alerts(
    station_id: int,
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by status (e.g. ACTIVE)"),
    limit: int = Query(default=20, ge=1, le=100, description="Max alerts to return"),
    db: Session = Depends(get_db)
):
    items, _ = AlertService.get_alerts(
        db=db,
        station_id=station_id,
        status=status_filter,
        limit=limit,
        offset=0,
        order="desc"
    )
    return items


@router.post(
    "/alerts/{alert_id}/acknowledge",
    response_model=AlertRead,
    summary="Acknowledge Alert",
    description="Acknowledge an active alert, updating status to ACKNOWLEDGED."
)
def acknowledge_alert(
    alert_id: int,
    note: Optional[str] = Query(default=None, description="Optional operational note"),
    db: Session = Depends(get_db)
):
    updated = AlertService.acknowledge_alert(db=db, alert_id=alert_id, note=note)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found."
        )
    return updated


@router.post(
    "/alerts/{alert_id}/resolve",
    response_model=AlertRead,
    summary="Resolve Alert",
    description="Manually transition an alert to RESOLVED with ended_at timestamp."
)
def resolve_alert(
    alert_id: int,
    note: Optional[str] = Query(default=None, description="Optional operational resolution note"),
    db: Session = Depends(get_db)
):
    resolved = AlertService.resolve_alert(db=db, alert_id=alert_id, note=note)
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found."
        )
    return resolved


@router.post(
    "/alerts/evaluate",
    response_model=AlertEvaluationResult,
    summary="Trigger Alert Evaluation Sweep",
    description="Manually triggers an anomaly detection and alert evaluation sweep across all active stations."
)
def evaluate_alerts(
    check_freshness: bool = Query(default=False, description="Whether to include telemetry freshness/offline checks"),
    db: Session = Depends(get_db)
):
    return AlertService.evaluate_all_stations(db=db, check_freshness=check_freshness)
