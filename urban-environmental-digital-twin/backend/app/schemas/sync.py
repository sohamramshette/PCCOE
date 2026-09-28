"""
Urban Environmental Digital Twin - Real-Time OpenAQ Sync Schemas
===============================================================
Defines Pydantic request/response contracts for live CPCB/OpenAQ telemetry ingestion.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class StationSyncResult(BaseModel):
    station_id: int
    station_name: str
    timestamp_utc: Optional[datetime] = None
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    status: str
    detail: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OpenAQSyncResponse(BaseModel):
    status: str
    synced_at_utc: datetime
    stations_attempted: int
    stations_successful: int
    records_ingested: int
    records_updated: int
    details: List[StationSyncResult]

    model_config = ConfigDict(from_attributes=True)


class SyncStatusResponse(BaseModel):
    service_status: str
    openaq_api_configured: bool
    last_sync_timestamp_utc: Optional[datetime] = None
    total_realtime_records: int
    network_latest_observation_utc: Optional[datetime] = None
    active_stations_monitored: int

    model_config = ConfigDict(from_attributes=True)
