"""
Urban Environmental Digital Twin - AI / LLM Explanation Schemas
==============================================================
Defines response models for LLM-generated narrative explanations
of real-time PM2.5 forecasts and What-If counterfactual scenario simulations.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ForecastExplanationResponse(BaseModel):
    station_id: int = Field(description="Monitoring station ID")
    station_name: str = Field(description="Monitoring station name")
    prediction_time_utc: datetime = Field(description="Forecast initialization hour in UTC")
    target_time_utc: datetime = Field(description="Target forecasted hour (t+1) in UTC")
    predicted_pm25: float = Field(description="Predicted ambient PM2.5 concentration in ug/m3")
    aqi_category: str = Field(description="Indian National Air Quality Index (NAQI) category")
    executive_summary: str = Field(description="2-3 sentence non-technical synthesis of forecasted air quality")
    atmospheric_drivers: List[str] = Field(description="Bullet points explaining key atmospheric dispersion conditions")
    health_advisory: str = Field(description="Health advice for general public and vulnerable groups")
    recommended_actions: List[str] = Field(description="Immediate actionable civic / municipal suggestions")
    epistemological_note: str = Field(
        default="AI-generated synthesis of statistical model inference. Not a direct physical measurement.",
        description="Scientific transparency disclosure"
    )
    generated_at: str = Field(description="ISO timestamp when AI explanation was synthesized")


class ScenarioExplanationResponse(BaseModel):
    scenario_id: str = Field(description="Scenario identifier")
    scenario_name: str = Field(description="User-defined scenario title")
    station_id: int = Field(description="Station identifier")
    station_name: str = Field(description="Station name")
    baseline_pm25: float = Field(description="Baseline model predicted PM2.5 (ug/m3)")
    counterfactual_pm25: float = Field(description="Simulated counterfactual PM2.5 (ug/m3)")
    delta_pm25: float = Field(description="Absolute PM2.5 change (ug/m3)")
    percent_change: float = Field(description="Percentage PM2.5 change (%)")
    intervention_summary: str = Field(description="Summary of policy levers applied (e.g. 30% traffic reduction)")
    executive_summary: str = Field(description="Executive narrative summarizing policy effectiveness")
    mechanism_explanation: str = Field(description="Atmospheric and spatial physics explanation of why the delta occurred")
    policy_effectiveness: str = Field(
        description="Rating of policy impact under current atmospheric conditions (HIGH, MODERATE, LOW, CONDITIONAL)"
    )
    municipal_recommendations: List[str] = Field(
        description="Actionable policy insights for urban municipal planners"
    )
    epistemological_note: str = Field(
        default="AI-generated synthesis of counterfactual model simulation. Not a causal measurement.",
        description="Scientific transparency disclosure"
    )
    generated_at: str = Field(description="ISO timestamp when AI explanation was synthesized")


class PolicyActionItem(BaseModel):
    phase: str = Field(description="Implementation phase: Immediate (0-30 Days), Medium-Term (1-6 Months), or Long-Term (1-3 Years)")
    action: str = Field(description="Concrete municipal intervention measure")
    responsible_agency: str = Field(description="Designated municipal department or authority (e.g. PMC Traffic Police, MPCB)")
    target_metric: str = Field(description="Measurable operational KPI or compliance threshold")


class PolicyReportResponse(BaseModel):
    scenario_id: str = Field(description="Scenario identifier")
    scenario_name: str = Field(description="User-defined scenario title")
    station_id: int = Field(description="Station identifier")
    station_name: str = Field(description="Station name")
    baseline_pm25: float = Field(description="Baseline model predicted PM2.5 (ug/m3)")
    counterfactual_pm25: float = Field(description="Simulated counterfactual PM2.5 (ug/m3)")
    delta_pm25: float = Field(description="Absolute PM2.5 change (ug/m3)")
    percent_change: float = Field(description="Percentage PM2.5 change (%)")
    baseline_naqi: str = Field(description="Baseline CPCB NAQI tier")
    counterfactual_naqi: str = Field(description="Simulated counterfactual CPCB NAQI tier")
    report_title: str = Field(description="Executive brief title")
    verdict: str = Field(description="Policy recommendation verdict: HIGHLY_RECOMMENDED, FEASIBLE_WITH_TARGETING, MODERATE_IMPACT, LOW_RETURN")
    executive_summary: str = Field(description="Executive narrative summarizing policy effectiveness and municipal decision")
    health_benefit_projection: str = Field(description="Epidemiological public health projection (e.g. ER visits avoided)")
    economic_and_feasibility_analysis: str = Field(description="Capital cost, operational friction, and stakeholder compliance review")
    action_plan: List[PolicyActionItem] = Field(description="Phased operational implementation roadmap")
    markdown_content: str = Field(description="Full formatted Markdown text of the executive decision brief for download/copying")
    generated_at: str = Field(description="ISO timestamp when AI policy report was synthesized")

