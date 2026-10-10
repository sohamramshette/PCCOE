"""
Urban Environmental Digital Twin - Pollution Backtracking Schemas
=================================================================
Pydantic v2 schemas for the 2D Kinematic Pollution Backtracking Engine.
Enforces strict scientific parameter validation, explicit data provenance
classification, nullable fields for missing observations, and clear separation
between observed concentrations, air quality indices, and exploratory correlations.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SpatialCoverageStatus(str, Enum):
    WITHIN_NETWORK_DOMAIN = "WITHIN_NETWORK_DOMAIN"
    EXCEEDED_LOCAL_DOMAIN = "EXCEEDED_LOCAL_DOMAIN"


class StationEvidenceStatus(str, Enum):
    VALID_OBSERVATION = "VALID_OBSERVATION"
    TELEMETRY_OFFLINE = "TELEMETRY_OFFLINE"
    DATA_GAP = "DATA_GAP"


class ValidationStatus(str, Enum):
    HIGH_CONFIDENCE_MULTI_STATION_EPISODE = "HIGH_CONFIDENCE_MULTI_STATION_EPISODE"
    HIGH_CONFIDENCE_MONITORED_PEAK = "HIGH_CONFIDENCE_MONITORED_PEAK"
    UNVERIFIED_LOCAL_SPIKE_POTENTIAL_ARTIFACT = "UNVERIFIED_LOCAL_SPIKE_POTENTIAL_ARTIFACT"
    STANDARD_HISTORICAL_PERIOD = "STANDARD_HISTORICAL_PERIOD"


class BacktrackingRequest(BaseModel):
    """Request payload for running a backward atmospheric trajectory calculation."""
    station_id: int = Field(
        ...,
        description="Target receptor air quality monitoring station ID (e.g. 60658 for Hadapsar)"
    )
    arrival_datetime_utc: datetime = Field(
        ...,
        description="Episode arrival timestamp in UTC (e.g. '2025-12-26T16:00:00Z')"
    )
    backward_duration_hours: int = Field(
        default=24,
        ge=1,
        le=48,
        description="Backward trajectory duration in hours [1, 48]. Max 48h to prevent unbounded regional extrapolation."
    )
    step_interval_minutes: int = Field(
        default=60,
        ge=60,
        le=60,
        description="Temporal numerical integration step in minutes (strictly 60 min supported by hourly ERA5-Land reanalysis)"
    )

    @field_validator("arrival_datetime_utc", mode="after")
    @classmethod
    def ensure_utc_timezone(cls, v: datetime) -> datetime:
        """Enforces UTC timezone awareness on timestamps."""
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)


class TrajectoryWaypoint(BaseModel):
    """A discrete timestamped waypoint along the backward kinematic trajectory path."""
    step_hours_back: int = Field(..., description="Hours backward in time relative to receptor arrival (0 = receptor)")
    datetime_utc: datetime = Field(..., description="Timestamp of the waypoint in UTC")
    datetime_local_ist: str = Field(..., description="Timestamp in Indian Standard Time (UTC+05:30)")
    latitude: float = Field(..., description="Calculated WGS-84 latitude coordinate (decimal degrees)")
    longitude: float = Field(..., description="Calculated WGS-84 longitude coordinate (decimal degrees)")
    
    # Meteorological Reanalysis Inputs
    wind_speed_ms: Optional[float] = Field(None, description="Horizontal 10m wind speed (m/s)")
    wind_dir_deg: Optional[float] = Field(None, description="10m Wind direction (degrees from True North: 0=N, 90=E)")
    wind_u: Optional[float] = Field(None, description="Zonal wind vector u (m/s, positive East)")
    wind_v: Optional[float] = Field(None, description="Meridional wind vector v (m/s, positive North)")
    pbl_height_m: Optional[float] = Field(None, description="Planetary boundary layer height (m)")
    ventilation_index_m2s: Optional[float] = Field(None, description="Atmospheric ventilation coefficient (wind_speed * pbl_height, m²/s)")
    
    # Kinematic Displacements
    step_distance_km: float = Field(..., description="Great-circle distance traversed during this 1-hour step (km)")
    cumulative_distance_km: float = Field(..., description="Cumulative distance traversed from receptor (km)")
    
    # Metadata & Quality
    data_provenance: str = Field(
        default="REANALYSIS (ECMWF ERA5-Land via Open-Meteo)",
        description="Data classification identifying meteorological inputs as reanalysis, not in-situ anemometer"
    )
    spatial_coverage_status: SpatialCoverageStatus = Field(
        ...,
        description="Whether waypoint lies within local Pune monitoring domain or exceeded into regional extrapolation"
    )
    nearest_station_id: Optional[int] = Field(None, description="ID of nearest CAAQMS monitoring station to waypoint")
    nearest_station_name: Optional[str] = Field(None, description="Name of nearest CAAQMS monitoring station to waypoint")

    model_config = ConfigDict(from_attributes=True)


class CorrelatedStationEvidence(BaseModel):
    """Contemporaneous observation evidence from surrounding network monitors."""
    station_id: int
    station_name: str
    latitude: float
    longitude: float
    distance_to_receptor_km: float = Field(..., description="Great-circle distance from receptor station (km)")
    bearing_from_receptor_deg: float = Field(..., description="Compass bearing from receptor (degrees clockwise from North)")
    relative_wind_alignment: Optional[str] = Field(
        None,
        description="Orientation relative to arrival wind vector: UPWIND_CORRIDOR, DOWNWIND_CORRIDOR, or CROSSWIND"
    )
    observed_pm25_at_arrival: Optional[float] = Field(
        None,
        description="Observed PM2.5 concentration at event hour (µg/m³). Strictly null if sensor is offline."
    )
    cpcb_naqi_category: Optional[str] = Field(
        None,
        description="Categorical air quality classification according to CPCB NAQI standard (Good, Moderate, Poor, Severe)"
    )
    data_status: StationEvidenceStatus
    correlation_coefficient: Optional[float] = Field(
        None,
        description="Pearson correlation coefficient r with receptor over the backward duration window (null if N < 4)"
    )
    valid_sample_count: int = Field(..., description="Number of concurrent valid hourly observation pairs used for correlation")
    interpretation_note: str = Field(
        default="Exploratory correlation only; does not establish emissions causality or source attribution.",
        description="Scientific caveat"
    )

    model_config = ConfigDict(from_attributes=True)


class InvestigationSummary(BaseModel):
    """Structured scientific assessment separating observed facts, models, explanations, and unknowns."""
    observed_facts: List[str] = Field(..., description="Empirical sensor observations, peak timings, and recorded measurements")
    meteorological_context: List[str] = Field(..., description="Atmospheric reanalysis conditions (wind, mixing height, ventilation)")
    calculated_trajectory_summary: str = Field(..., description="Summary of calculated 2D kinematic advection path")
    candidate_explanations: List[str] = Field(..., description="Plausible non-causal atmospheric and urban transport hypotheses")
    scientific_limitations: List[str] = Field(..., description="Explicit methodological boundaries and physical constraints")
    data_quality_assessment: str = Field(..., description="Audit verdict on whether peak reflects verified event vs unverified spike")


class BacktrackingMetadata(BaseModel):
    """Epistemological metadata and scientific disclaimers."""
    calculation_model: str = "2D_KINEMATIC_ADVECTION_PROTOTYPE"
    wind_data_source: str = "METEOROLOGICAL_REANALYSIS (ECMWF ERA5-Land via Open-Meteo)"
    air_quality_data_source: str = "IN_SITU_CAAQMS_OBSERVATIONS (OpenAQ / CPCB / IITM SAFAR / MPCB)"
    timezone_storage: str = "UTC (Timestamps displayed in UTC and IST)"
    spatial_coverage_domain: str = "Pune-PCMC Metropolitan Area (18.35°N - 18.75°N, 73.65°E - 74.05°E)"
    coverage_warnings: List[str] = Field(default_factory=list, description="Warnings if trajectory exceeded spatial or data boundaries")
    disclaimer: str = (
        "This calculation estimates a 2D kinematic backward advection trajectory using meteorological reanalysis wind vectors. "
        "It does NOT simulate 3D turbulent dispersion, chemical reactions, particulate deposition, or establish confirmed "
        "emission source attribution. Proximity to industrial, road, or activity features indicates transport vector alignment, "
        "not legal or physical emission proof."
    )


class BacktrackingResponse(BaseModel):
    """Complete response payload for a pollution backtracking calculation."""
    status: str = Field(..., description="Execution status: COMPLETED, PARTIAL_COVERAGE, or WARNING")
    receptor_station: Dict[str, Any] = Field(..., description="Receptor monitoring station metadata")
    arrival_datetime_utc: datetime = Field(..., description="Arrival timestamp in UTC")
    arrival_datetime_ist: str = Field(..., description="Arrival timestamp in Indian Standard Time (UTC+05:30)")
    observed_pm25_ug_m3: Optional[float] = Field(None, description="Observed PM2.5 concentration at receptor (µg/m³)")
    cpcb_naqi_category: Optional[str] = Field(None, description="CPCB NAQI classification (Good, Satisfactory, Moderate, Poor, Very Poor, Severe)")
    backward_duration_hours: int = Field(..., description="Requested backward duration in hours")
    total_distance_km: float = Field(..., description="Total cumulative geodesic distance traversed by trajectory (km)")
    waypoints: List[TrajectoryWaypoint] = Field(..., description="Timestamped spatial waypoints from arrival point backward")
    multi_station_evidence: List[CorrelatedStationEvidence] = Field(
        default_factory=list,
        description="Contemporaneous evidence from surrounding monitoring stations"
    )
    investigation_summary: InvestigationSummary = Field(..., description="Structured investigation report")
    metadata: BacktrackingMetadata = Field(..., description="Provenance, data classification, and scientific disclaimers")

    model_config = ConfigDict(from_attributes=True)


class CuratedEventItem(BaseModel):
    """Historical pollution episode pre-cataloged for one-click backtracking analysis."""
    event_id: str
    station_id: int
    station_name: str
    datetime_utc: datetime
    datetime_ist: str
    observed_pm25: float
    cpcb_naqi_category: str
    headline: str
    description: str
    validation_status: ValidationStatus
    data_quality_notes: str


class CuratedEventsResponse(BaseModel):
    """Response containing cataloged historical pollution episodes."""
    total_events: int
    events: List[CuratedEventItem]
