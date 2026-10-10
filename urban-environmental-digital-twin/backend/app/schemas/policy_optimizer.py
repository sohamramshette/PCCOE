"""
Urban Environmental Digital Twin - Policy & Budget Optimizer Schemas
=====================================================================
Pydantic v2 schemas for municipal budget-constrained intervention planning,
cost matrix declaration, operational limits enforcement, package evaluation,
and sensitivity shocks.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class InterventionCostSpec(BaseModel):
    id: str = Field(..., description="Unique intervention identifier (traffic, ev_fleet, industrial, green_buffer, dust_misting)")
    name: str = Field(..., description="Human-readable intervention title")
    classification: str = Field(..., description="'variable' or 'binary'")
    unit_cost_lakh: float = Field(..., description="Unit cost in ₹ lakh")
    unit_label: str = Field(..., description="Display label for unit expenditure")
    operational_max: float = Field(..., description="Maximum allowed percentage or binary value (1.0)")
    policy_mapping: str = Field(..., description="Real-world municipal governance and physical intervention action")
    is_available: bool = Field(default=True, description="Whether currently unencumbered by legal/administrative disputes")
    unavailability_reason: Optional[str] = Field(default=None, description="Detailed administrative blockage reason if unavailable")


class CostBreakdownItem(BaseModel):
    intervention_id: str
    name: str
    level: float
    level_display: str
    unit_cost_lakh: float
    effective_unit_cost_lakh: float
    subtotal_lakh: float
    calculation_formula: str
    policy_mapping: str


class PackageInterventions(BaseModel):
    traffic: float = Field(default=0.0, ge=0.0, le=100.0, description="Peak traffic rationing percentage [0, 100]")
    ev_fleet: float = Field(default=0.0, ge=0.0, le=100.0, description="PMPML fleet electrification percentage [0, 100]")
    industrial: float = Field(default=0.0, ge=0.0, le=100.0, description="Industrial emission curb percentage [0, 100]")
    green_buffer: float = Field(default=0.0, ge=0.0, le=100.0, description="Urban green buffer canopy expansion percentage [0, 100]")
    dust_misting: bool = Field(default=False, description="Construction dust misting cannons active (binary)")


class PackageEvaluation(BaseModel):
    package_id: str
    package_name: str
    description: str
    interventions: PackageInterventions
    cost_breakdown: List[CostBreakdownItem]
    base_cost_lakh: float
    cost_after_shock_lakh: float
    fixed_overhead_lakh: float
    municipal_budget_lakh: float
    remaining_budget_lakh: float
    budget_utilization_pct: float
    is_feasible: bool
    feasibility_status: str  # "FEASIBLE" | "INFEASIBLE"
    infeasibility_reason: Optional[str] = None
    operational_constraints_satisfied: bool
    violated_constraints: List[str] = []
    is_available: bool = True
    unavailability_reason: Optional[str] = None
    modeled_baseline_pm25: float
    modeled_scenario_pm25: float
    modeled_delta_pm25: float
    modeled_pct_change: float
    modeled_co2e_reduction_pct: float
    modeled_co2e_reduction_tonnes_month: float
    affected_area_sq_km: float
    is_recommended: bool = False
    data_classification: str = "MODEL_COUNTERFACTUAL_ESTIMATE"


class RecommendationSummary(BaseModel):
    status: str  # "FEASIBLE_OPTIMAL" | "NO_FEASIBLE_PACKAGE"
    recommended_package_id: Optional[str] = None
    recommended_package_name: Optional[str] = None
    label: str  # "Best evaluated package" or "NO FEASIBLE PACKAGE"
    reason: str
    modeled_pm25_reduction: Optional[float] = None
    cost_lakh: Optional[float] = None
    budget_remaining_lakh: Optional[float] = None


class OptimizeRequest(BaseModel):
    budget_lakh: float = Field(default=50.0, ge=0.0, le=1000.0, description="Municipal budget in ₹ lakh (default 50L)")
    custom_interventions: Optional[PackageInterventions] = Field(default=None, description="User-defined candidate intervention package")
    unavailable_interventions: List[str] = Field(default_factory=list, description="List of intervention IDs disabled (e.g. ['industrial'])")
    cost_shock_pct: float = Field(default=0.0, ge=-50.0, le=100.0, description="Cost shock sensitivity adjustment [-20%, +20%]")
    response_sensitivity_pct: float = Field(default=0.0, ge=-50.0, le=50.0, description="Modeled response sensitivity adjustment (e.g. -15% rebound)")
    fixed_overhead_lakh: float = Field(default=0.0, ge=0.0, description="Fixed municipal administration overhead (default 0L)")
    station_id: Optional[int] = Field(default=11613, description="Target Pune monitoring station ID")
    model_id: Optional[str] = Field(default="gradient_boosting_baseline", description="Forecasting model identifier")
    include_alternative_combinations: bool = Field(
        default=False,
        description="Run combinatorial search to discover and evaluate alternative multi-sector portfolios within budget"
    )


class OptimizeResponse(BaseModel):
    budget_lakh: float
    cost_shock_pct: float
    response_sensitivity_pct: float
    fixed_overhead_lakh: float
    cost_matrix: Dict[str, InterventionCostSpec]
    packages: List[PackageEvaluation]
    recommendation: RecommendationSummary
    primary_objective: str = "Maximize modeled PM2.5 reduction subject to municipal budget and intervention operational constraints."
    methodology_note: str = (
        "All cost outcomes are calculated dynamically per declared unit prices and sensitivity multipliers. "
        "All air quality impacts are MODELED counterfactual estimates using the trained ML forecasting pipeline. "
        "They represent decision-support projections under stated assumptions, not physical causal guarantees."
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(from_attributes=True)
