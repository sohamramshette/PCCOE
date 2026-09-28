"""
Urban Environmental Digital Twin - Scenario & Simulation Schemas
================================================================
Pydantic v2 schemas for What-If / Counterfactual intervention simulations,
ensuring strict scientific validation of parameter ranges and explicit
labeling of counterfactual model estimates.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator


class InterventionType(str, Enum):
    TRAFFIC_REDUCTION = "TRAFFIC_REDUCTION"
    INDUSTRIAL_ACTIVITY_REDUCTION = "INDUSTRIAL_ACTIVITY_REDUCTION"
    COMBINED_INTERVENTION = "COMBINED_INTERVENTION"
    EV_FLEET_TRANSITION = "EV_FLEET_TRANSITION"
    GREEN_BUFFER_EXPANSION = "GREEN_BUFFER_EXPANSION"
    COMPREHENSIVE_POLICY = "COMPREHENSIVE_POLICY"


class InterventionParams(BaseModel):
    type: InterventionType = Field(
        ...,
        description="Hypothetical policy intervention type: TRAFFIC_REDUCTION, INDUSTRIAL_ACTIVITY_REDUCTION, COMBINED_INTERVENTION, EV_FLEET_TRANSITION, GREEN_BUFFER_EXPANSION, or COMPREHENSIVE_POLICY"
    )
    traffic_reduction_percent: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Hypothetical traffic intensity reduction percentage [0.0, 100.0]"
    )
    industrial_activity_reduction_percent: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Hypothetical industrial activity curb percentage [0.0, 100.0]"
    )
    ev_fleet_transition_percent: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Hypothetical electric vehicle fleet transition percentage [0.0, 100.0]"
    )
    green_buffer_increase_percent: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Hypothetical urban green canopy buffer expansion percentage [0.0, 100.0]"
    )
    construction_dust_suppression: Optional[bool] = Field(
        default=False,
        description="Enforces strict 65% fugitive dust suppression along construction corridors"
    )

    @model_validator(mode="after")
    def validate_intervention_parameters(self) -> "InterventionParams":
        if self.type == InterventionType.TRAFFIC_REDUCTION:
            if self.traffic_reduction_percent is None:
                raise ValueError("traffic_reduction_percent is required for TRAFFIC_REDUCTION intervention.")
        elif self.type == InterventionType.INDUSTRIAL_ACTIVITY_REDUCTION:
            if self.industrial_activity_reduction_percent is None:
                raise ValueError("industrial_activity_reduction_percent is required for INDUSTRIAL_ACTIVITY_REDUCTION intervention.")
        elif self.type == InterventionType.COMBINED_INTERVENTION:
            if self.traffic_reduction_percent is None:
                raise ValueError("traffic_reduction_percent is required for COMBINED_INTERVENTION.")
            if self.industrial_activity_reduction_percent is None:
                raise ValueError("industrial_activity_reduction_percent is required for COMBINED_INTERVENTION.")
        elif self.type == InterventionType.EV_FLEET_TRANSITION:
            if self.ev_fleet_transition_percent is None:
                raise ValueError("ev_fleet_transition_percent is required for EV_FLEET_TRANSITION intervention.")
        elif self.type == InterventionType.GREEN_BUFFER_EXPANSION:
            if self.green_buffer_increase_percent is None:
                raise ValueError("green_buffer_increase_percent is required for GREEN_BUFFER_EXPANSION intervention.")
        elif self.type == InterventionType.COMPREHENSIVE_POLICY:
            active_count = 0
            if (self.traffic_reduction_percent or 0.0) > 0.0:
                active_count += 1
            if (self.industrial_activity_reduction_percent or 0.0) > 0.0:
                active_count += 1
            if (self.ev_fleet_transition_percent or 0.0) > 0.0:
                active_count += 1
            if (self.green_buffer_increase_percent or 0.0) > 0.0:
                active_count += 1
            if self.construction_dust_suppression:
                active_count += 1
            if active_count == 0:
                raise ValueError("At least one active policy lever is required for COMPREHENSIVE_POLICY.")
        return self



class FeatureAuditItem(BaseModel):
    feature_name: str = Field(..., description="Exact core feature column modified")
    baseline_value: float = Field(..., description="Baseline historical value")
    counterfactual_value: float = Field(..., description="Simulated counterfactual value")
    delta: float = Field(..., description="Difference (counterfactual - baseline)")
    transformation: str = Field(..., description="Applied mathematical transformation")
    classification: str = Field(..., description="Feature provenance classification: PROXY, DERIVED_INTERACTION, etc.")


# =========================================================================
# Request Models
# =========================================================================

class ScenarioCreateRequest(BaseModel):
    scenario_name: str = Field(..., min_length=1, max_length=150, description="Descriptive scenario name")
    station_id: int = Field(..., description="Target monitoring station ID")
    baseline_timestamp_utc: datetime = Field(..., description="Historical baseline timestamp t (UTC)")
    model_id: Optional[str] = Field(
        default="gradient_boosting_baseline",
        description="Underlying forecasting model identifier from model_registry"
    )
    intervention: InterventionParams = Field(..., description="Intervention specifications")
    description: Optional[str] = Field(default=None, description="Detailed hypothesis or policy context")


# Backward compatibility alias
ScenarioCreate = ScenarioCreateRequest


# =========================================================================
# Response Models
# =========================================================================

class ScenarioResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    description: Optional[str] = None
    station_id: Optional[int] = None
    model_id: str
    baseline_timestamp_utc: Optional[datetime] = None
    traffic_reduction_pct: float
    industrial_reduction_pct: float
    construction_halt: bool = False
    simulation_status: str
    is_modeled_scenario: bool = True
    created_by: str
    created_at: datetime
    intervention: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class ScenarioRunResponse(BaseModel):
    scenario_id: str
    station_id: int
    station_name: str
    baseline_timestamp_utc: datetime
    target_timestamp_utc: datetime
    model_id: str
    model_type: str
    intervention: Dict[str, Any]
    baseline_prediction_pm25: float
    counterfactual_prediction_pm25: float
    absolute_change_pm25: float
    estimated_reduction_pm25: float
    percentage_change: float
    unit: str = "ug/m3"
    uncertainty_available: bool = False
    uncertainty_note: str = "Point estimate only; the current baseline model does not provide calibrated uncertainty."
    interpretation_note: str = "Counterfactual model estimate; not a causal measurement."
    data_classification: str = "MODEL_COUNTERFACTUAL_ESTIMATE"
    affected_features_audit: List[FeatureAuditItem]
    created_at: datetime


class ScenarioResultResponse(BaseModel):
    id: int
    scenario_id: str
    station_id: int
    baseline_timestamp_utc: Optional[datetime] = None
    target_time_utc: datetime
    baseline_pm25: float
    scenario_pm25: float
    delta_pm25: float
    pct_change: float
    unit: str = "ug/m3"
    uncertainty_available: bool = False
    interpretation_note: str = "Counterfactual model estimate; not a causal measurement."
    data_classification: str = "MODEL_COUNTERFACTUAL_ESTIMATE"
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScenarioListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[ScenarioResponse]


class ScenarioResultsListResponse(BaseModel):
    scenario_id: str
    total: int
    limit: int
    offset: int
    items: List[ScenarioResultResponse]


# Legacy Schema compatibility
class ScenarioBase(BaseModel):
    scenario_name: str
    description: Optional[str] = None
    station_id: Optional[int] = None
    model_id: str
    traffic_reduction_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    industrial_reduction_pct: float = Field(default=0.0, ge=0.0, le=100.0)
    construction_halt: bool = False
    weather_reference_period: Optional[str] = None
    simulation_status: str = "DRAFT"
    is_modeled_scenario: bool = True
    created_by: str = "system"


class ScenarioResultRead(BaseModel):
    id: int
    scenario_id: str
    station_id: int
    target_time_utc: datetime
    baseline_pm25: float
    scenario_pm25: float
    delta_pm25: float
    pct_change: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScenarioRead(ScenarioBase):
    scenario_id: str
    created_at: datetime
    results: List[ScenarioResultRead] = []

    model_config = ConfigDict(from_attributes=True)
