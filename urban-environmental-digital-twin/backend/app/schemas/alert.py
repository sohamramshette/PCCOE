"""
Urban Environmental Digital Twin - Alert Schemas
================================================
Pydantic v2 validation and serialization schemas for the Alert & Anomaly Engine.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.alert import AlertType, AlertSeverity, AlertStatus


class AlertBase(BaseModel):
    station_id: int = Field(description="Monitoring station identifier")
    alert_type: AlertType = Field(description="Alert classification type")
    severity: AlertSeverity = Field(description="Alert severity level")
    pollutant: Optional[str] = Field(default=None, description="Associated pollutant code (pm25, pm10, no2, etc.)")
    observed_value: Optional[float] = Field(default=None, description="Recorded value triggering the alert")
    threshold_value: Optional[float] = Field(default=None, description="Configured boundary value")
    expected_value: Optional[float] = Field(default=None, description="Baseline expected value, mean, or model prediction")
    deviation: Optional[float] = Field(default=None, description="Calculated deviation (absolute or percentage)")
    message: str = Field(description="Descriptive alert notification message")
    source: str = Field(default="DERIVED", description="Data provenance: OBSERVED, REANALYSIS, PREDICTED, or DERIVED")
    status: AlertStatus = Field(default=AlertStatus.ACTIVE, description="Lifecycle status: ACTIVE, ACKNOWLEDGED, RESOLVED")
    started_at: datetime = Field(description="Timestamp when alert condition commenced")
    ended_at: Optional[datetime] = Field(default=None, description="Timestamp when alert resolved")
    alert_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Contextual diagnostic information")


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    ended_at: Optional[datetime] = None
    message: Optional[str] = None
    alert_metadata: Optional[Dict[str, Any]] = None


class AlertRead(AlertBase):
    model_config = ConfigDict(from_attributes=True)

    alert_id: int = Field(description="Unique alert record identifier")
    station_name: Optional[str] = Field(default=None, description="Official station designation")
    detected_at: datetime = Field(description="Timestamp when alert condition was identified")
    created_at: datetime = Field(description="Record creation timestamp")
    updated_at: datetime = Field(description="Record modification timestamp")


class AlertSummary(BaseModel):
    """Aggregate alert counts for dashboards and status monitoring."""
    total_alerts: int = Field(description="Total alert records in database")
    active_alerts: int = Field(description="Count of currently ACTIVE alerts")
    acknowledged_alerts: int = Field(description="Count of ACKNOWLEDGED alerts")
    resolved_alerts: int = Field(description="Count of RESOLVED alerts")
    by_severity: Dict[str, int] = Field(description="Alert count partitioned by severity tier")
    by_type: Dict[str, int] = Field(description="Alert count partitioned by alert type")
    last_evaluated_at: Optional[datetime] = Field(default=None, description="Timestamp of most recent alert evaluation cycle")


class PaginatedAlerts(BaseModel):
    """Paginated collection of alert records."""
    total: int = Field(description="Total matching records")
    page: int = Field(description="Current 1-based page number")
    limit: int = Field(description="Records requested per page")
    offset: int = Field(description="Record offset")
    pages: int = Field(description="Total available pages")
    items: List[AlertRead] = Field(description="Alert records on this page")


class AlertEvaluationResult(BaseModel):
    """Summary returned when alert evaluation pipeline executes."""
    status: str = Field(default="SUCCESS")
    evaluated_at: datetime = Field(description="Evaluation completion timestamp")
    stations_evaluated: int = Field(description="Number of stations analyzed")
    alerts_created: int = Field(description="Number of newly triggered alerts")
    alerts_updated: int = Field(description="Number of existing active alerts updated")
    alerts_resolved: int = Field(description="Number of previously active alerts resolved")
    active_total: int = Field(description="Current active alerts across all stations")
    details: List[Dict[str, Any]] = Field(default_factory=list, description="Per-station alert delta logs")
