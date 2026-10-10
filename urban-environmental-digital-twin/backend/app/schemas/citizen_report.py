"""
Urban Environmental Digital Twin - Citizen Report Schemas
==========================================================
Pydantic validation schemas for reporting visible pollution incidents,
validating categories, timestamps, coordinates, and attachments.
"""

from enum import Enum
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, field_validator


class ReportCategoryEnum(str, Enum):
    SMOKE_EMISSIONS = "SMOKE_EMISSIONS"
    OPEN_BURNING = "OPEN_BURNING"
    CONSTRUCTION_DUST = "CONSTRUCTION_DUST"
    INDUSTRIAL_EMISSIONS = "INDUSTRIAL_EMISSIONS"
    UNUSUAL_ODOUR = "UNUSUAL_ODOUR"
    OTHER = "OTHER"


class CitizenReportCreate(BaseModel):
    category: str = Field(..., description="Category: SMOKE_EMISSIONS, OPEN_BURNING, CONSTRUCTION_DUST, INDUSTRIAL_EMISSIONS, UNUSUAL_ODOUR, OTHER")
    description: str = Field(..., min_length=5, max_length=1000, description="Brief description of observed incident")
    location_name: str = Field(..., min_length=3, max_length=255, description="Locality, landmark, or street in Pune/PCMC")
    latitude: Optional[float] = Field(default=None, description="Optional incident latitude in WGS84")
    longitude: Optional[float] = Field(default=None, description="Optional incident longitude in WGS84")
    nearest_station_id: Optional[int] = Field(default=None, description="Optional nearest monitoring station ID")
    observed_at: datetime = Field(..., description="Date and time when the pollution incident was observed")
    client_device_token: Optional[str] = Field(default=None, max_length=64, description="Local device token for retrieving personal submissions")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        clean = v.strip().upper()
        allowed = {e.value for e in ReportCategoryEnum}
        if clean not in allowed:
            raise ValueError(f"Invalid category '{v}'. Permitted categories: {', '.join(allowed)}")
        return clean

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 5:
            raise ValueError("Description must contain at least 5 characters.")
        if len(clean) > 1000:
            raise ValueError("Description cannot exceed 1000 characters.")
        return clean

    @field_validator("location_name")
    @classmethod
    def validate_location(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 3:
            raise ValueError("Location name must contain at least 3 characters.")
        return clean

    @field_validator("latitude")
    @classmethod
    def validate_lat(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            # Pune Metropolitan Region latitude bounding roughly [18.2, 19.1]
            if not (18.0 <= v <= 19.3):
                raise ValueError("Latitude must be within the Pune Metropolitan Region (18.0 to 19.3).")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_lon(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            # Pune Metropolitan Region longitude bounding roughly [73.5, 74.3]
            if not (73.4 <= v <= 74.4):
                raise ValueError("Longitude must be within the Pune Metropolitan Region (73.4 to 74.4).")
        return v

    @field_validator("observed_at")
    @classmethod
    def validate_observed_at(cls, v: datetime) -> datetime:
        # Cannot be more than 15 minutes into the future
        now = datetime.now(timezone.utc)
        if v.tzinfo is None:
            v_utc = v.replace(tzinfo=timezone.utc)
        else:
            v_utc = v.astimezone(timezone.utc)
        if v_utc > now + timedelta(minutes=15):
            raise ValueError("Observation time cannot be in the future.")
        return v


class CitizenReportRead(BaseModel):
    id: int
    report_reference: str
    category: str
    description: str
    location_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    nearest_station_id: Optional[int] = None
    observed_at: datetime
    submitted_at: datetime
    status: str
    attachment_filename: Optional[str] = None
    attachment_path: Optional[str] = None
    attachment_size_bytes: Optional[int] = None

    class Config:
        from_attributes = True


class CitizenReportSubmitResponse(BaseModel):
    status: str = "success"
    message: str
    report_reference: str
    report: CitizenReportRead
