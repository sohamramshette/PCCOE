"""
Pydantic schemas for Scenario and ScenarioResult entities.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


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


class ScenarioCreate(ScenarioBase):
    scenario_id: str


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
