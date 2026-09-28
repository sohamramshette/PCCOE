"""
Urban Environmental Digital Twin - AI / LLM Natural Language Explanation Service
================================================================================
Synthesizes domain-grounded atmospheric insights, public health advisories, and
municipal policy recommendations from machine learning forecasts and counterfactual
simulation outputs using Google Gemini.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx
from sqlalchemy.orm import Session

from backend.app.config.settings import settings
from backend.app.models.station import Station
from backend.app.models.scenario import Scenario, ScenarioResult
from backend.app.models.observation import EnvironmentalObservation
from backend.app.models.weather import WeatherReanalysis
from backend.app.services.forecast_service import ForecastService
from backend.app.schemas.llm import (
    ForecastExplanationResponse,
    ScenarioExplanationResponse,
    PolicyActionItem,
    PolicyReportResponse,
)

logger = logging.getLogger("llm_service")

CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
]


def get_naqi_category(pm25: float) -> str:
    """Calculates the Indian National Air Quality Index (NAQI) tier for PM2.5."""
    if pm25 <= 30.0:
        return "Good (0-30 µg/m³)"
    elif pm25 <= 60.0:
        return "Satisfactory (31-60 µg/m³)"
    elif pm25 <= 90.0:
        return "Moderate (61-90 µg/m³)"
    elif pm25 <= 120.0:
        return "Poor (91-120 µg/m³)"
    elif pm25 <= 250.0:
        return "Very Poor (121-250 µg/m³)"
    else:
        return "Severe (250+ µg/m³)"


class LLMExplanationService:
    @staticmethod
    def _call_gemini_json(prompt: str) -> Optional[Dict[str, Any]]:
        """Invokes Gemini via REST with JSON output mode and multi-model fallback."""
        api_key = settings.LLM_API_KEY
        if not api_key:
            logger.warning("LLM_API_KEY is not configured. Falling back to rule-based synthesis.")
            return None

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2
            }
        }

        with httpx.Client(timeout=8.0) as client:
            for model_name in CANDIDATE_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                try:
                    res = client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        text_content = (
                            data.get("candidates", [{}])[0]
                            .get("content", {})
                            .get("parts", [{}])[0]
                            .get("text", "")
                        )
                        if text_content:
                            return json.loads(text_content)
                    else:
                        logger.warning(f"Gemini model {model_name} returned status {res.status_code}, trying fallback model...")
                except Exception as exc:
                    logger.warning(f"Error querying Gemini model {model_name}: {exc}")

        return None

    @classmethod
    def explain_forecast(
        cls,
        db: Session,
        station_id: int,
        timestamp: Optional[datetime] = None,
        model_id: Optional[str] = None
    ) -> ForecastExplanationResponse:
        """
        Generates an AI-synthesized narrative explanation and health advisory
        for the real-time or historical next-hour PM2.5 forecast.
        """
        # 1. Fetch forecast
        forecast = ForecastService.generate_next_hour_forecast(
            db=db,
            station_id=station_id,
            timestamp=timestamp,
            model_id=model_id
        )

        station = db.query(Station).filter(Station.station_id == station_id).first()
        station_name = station.station_name if station else f"Station {station_id}"
        zone_type = station.zone_type if station else "Urban"
        predicted_val = round(forecast["predicted_pm25"], 2)
        aqi_cat = get_naqi_category(predicted_val)

        # 2. Extract inputs summary
        feat_sum = forecast.get("input_features_summary") or {}
        cur_pm25 = feat_sum.get("pm25_t")
        temp_c = feat_sum.get("temp_c")
        wind_spd = feat_sum.get("wind_speed_ms")
        vent_idx = feat_sum.get("ventilation_index")
        traf_idx = feat_sum.get("traffic_proxy_index")
        pbl_h = round(vent_idx / wind_spd, 1) if (wind_spd and wind_spd > 0 and vent_idx) else 300.0

        pred_time = forecast["prediction_time_utc"]
        target_time = forecast["target_time_utc"]

        # 3. Formulate Prompt
        prompt = f"""
You are an expert Urban Environmental Scientist and Public Health Officer for the Pune Metropolitan Area, Maharashtra, India.
Analyze this machine learning air quality forecast for monitoring station '{station_name}' ({zone_type}).

Current Meteorological & Environmental State:
- Station: {station_name} (Zone: {zone_type})
- Current Hour (UTC): {pred_time.isoformat() if hasattr(pred_time, 'isoformat') else str(pred_time)}
- Target Forecast Hour (UTC, t+1h): {target_time.isoformat() if hasattr(target_time, 'isoformat') else str(target_time)}
- Baseline PM2.5 at t: {cur_pm25} µg/m³
- Machine Learning Predicted PM2.5 at t+1: {predicted_val} µg/m³
- Indian NAQI Category: {aqi_cat}
- Ambient Temperature: {temp_c} °C
- Wind Speed: {wind_spd} m/s
- Boundary Layer Ceiling Height: {pbl_h} m
- Ventilation Index (Wind Speed × PBL Height): {vent_idx} m²/s
- Diurnal Traffic Intensity Index: {traf_idx} (0.0=empty, 1.0=peak rush hour)

Generate a structured JSON response with the following exact keys:
{{
  "executive_summary": "2-3 clear, professional sentences explaining the expected PM2.5 level and the primary atmospheric reasons for it.",
  "atmospheric_drivers": [
    "Driver 1 explaining wind, ventilation, or ceiling height dilution mechanics",
    "Driver 2 explaining emissions (traffic congestion or local activity)",
    "Driver 3 explaining temporal trend / lag continuity"
  ],
  "health_advisory": "Clear guidance based on Indian NAQI tier for general citizens and vulnerable groups (elderly, asthmatic, children).",
  "recommended_actions": [
    "Action 1 for municipal authorities (e.g. traffic signal timing, water sprinkling)",
    "Action 2 for commuters or citizens (e.g. masks, travel window)"
  ]
}}
"""
        gemini_result = cls._call_gemini_json(prompt)

        # Fallback if Gemini unavailable or not configured
        if not gemini_result:
            gemini_result = cls._generate_forecast_fallback(
                station_name=station_name,
                zone_type=zone_type,
                predicted_val=predicted_val,
                aqi_cat=aqi_cat,
                vent_idx=vent_idx,
                traf_idx=traf_idx,
                pbl_h=pbl_h
            )

        return ForecastExplanationResponse(
            station_id=station_id,
            station_name=station_name,
            prediction_time_utc=forecast["prediction_time_utc"],
            target_time_utc=forecast["target_time_utc"],
            predicted_pm25=predicted_val,
            aqi_category=aqi_cat,
            executive_summary=gemini_result.get("executive_summary", "Forecast synthesized based on continuous urban environmental parameters."),
            atmospheric_drivers=gemini_result.get("atmospheric_drivers", [
                f"Ventilation capacity currently indexed at {vent_idx} m²/s.",
                f"Local diurnal traffic intensity at {traf_idx} factor.",
                f"Planetary boundary layer ceiling established at {pbl_h} meters."
            ]),
            health_advisory=gemini_result.get("health_advisory", f"Air quality falls into the {aqi_cat} tier. Sensitive individuals should consider reducing heavy outdoor exertion."),
            recommended_actions=gemini_result.get("recommended_actions", [
                "Optimize traffic flow along major congestion nodes.",
                "Deploy street-sweeping and dust mitigation if conditions deteriorate."
            ]),
            generated_at=datetime.now(timezone.utc).isoformat()
        )

    @classmethod
    def explain_scenario(
        cls,
        db: Session,
        scenario_id: str
    ) -> ScenarioExplanationResponse:
        """
        Generates an AI-synthesized policy impact brief and recommendations
        for a simulated What-If counterfactual scenario.
        """
        scenario = db.query(Scenario).filter(Scenario.scenario_id == scenario_id).first()
        if not scenario:
            raise ValueError(f"Scenario ID '{scenario_id}' does not exist.")

        latest_result = (
            db.query(ScenarioResult)
            .filter(ScenarioResult.scenario_id == scenario_id)
            .order_by(ScenarioResult.created_at.desc())
            .first()
        )
        if not latest_result:
            raise ValueError(f"Scenario '{scenario_id}' has not been simulated yet. Please run the scenario first.")

        station = db.query(Station).filter(Station.station_id == scenario.station_id).first()
        station_name = station.station_name if station else f"Station {scenario.station_id}"
        zone_type = station.zone_type if station else "Urban Corridor"

        base_val = round(latest_result.baseline_pm25, 2)
        cf_val = round(latest_result.scenario_pm25, 2)
        delta_val = round(latest_result.delta_pm25, 2)
        pct_val = round(latest_result.pct_change, 2)

        # Policy summary string
        interventions = []
        if scenario.traffic_reduction_pct > 0.0:
            interventions.append(f"{scenario.traffic_reduction_pct}% traffic reduction")
        if scenario.industrial_reduction_pct > 0.0:
            interventions.append(f"{scenario.industrial_reduction_pct}% industrial activity curb")
        intervention_str = " + ".join(interventions) if interventions else "Baseline control run (0% reduction)"

        # Read weather context if available
        weather_rec = (
            db.query(WeatherReanalysis)
            .filter(
                WeatherReanalysis.station_id == scenario.station_id,
                WeatherReanalysis.datetime_utc == scenario.baseline_time_utc
            )
            .first()
        )
        wind_spd = weather_rec.wind_speed_ms if weather_rec else 1.5
        pbl_h = weather_rec.pbl_height_m if weather_rec else 500.0
        vent_idx = round(wind_spd * pbl_h, 1)

        prompt = f"""
You are an expert Urban Policy Analyst and Environmental Modeler evaluating a counterfactual policy simulation for Pune, India.
The digital twin evaluated an intervention scenario on monitoring station '{station_name}' ({zone_type}).

Scenario Details:
- Scenario Title: {scenario.scenario_name}
- Station: {station_name} (Zone: {zone_type})
- Baseline Timestamp (UTC): {scenario.baseline_time_utc.isoformat()}
- Applied Policy Intervention: {intervention_str}
- Baseline Model Predicted PM2.5: {base_val} µg/m³
- Counterfactual Model Predicted PM2.5: {cf_val} µg/m³
- Net Estimated Shift (Delta): {delta_val} µg/m³ ({pct_val}%)
- Atmospheric Context: Wind Speed {wind_spd} m/s, Inversion Ceiling {pbl_h} m, Ventilation Index {vent_idx} m²/s

Generate a structured JSON response with the following exact keys:
{{
  "executive_summary": "2-3 sentences synthesizing the simulated environmental outcome and whether the intervention was impactful.",
  "mechanism_explanation": "Explain why this intervention produced this specific delta under these atmospheric conditions (e.g. interplay of traffic reduction with ventilation index).",
  "policy_effectiveness": "One of: HIGH, MODERATE, LOW, CONDITIONAL",
  "municipal_recommendations": [
    "Practical recommendation 1 for city planners regarding this policy",
    "Practical recommendation 2 regarding timing, location, or enforcement feasibility"
  ]
}}
"""
        gemini_result = cls._call_gemini_json(prompt)

        # Fallback if Gemini unavailable
        if not gemini_result:
            gemini_result = cls._generate_scenario_fallback(
                scenario_name=scenario.scenario_name,
                intervention_str=intervention_str,
                delta_val=delta_val,
                pct_val=pct_val,
                base_val=base_val,
                cf_val=cf_val,
                vent_idx=vent_idx
            )

        return ScenarioExplanationResponse(
            scenario_id=scenario_id,
            scenario_name=scenario.scenario_name,
            station_id=scenario.station_id,
            station_name=station_name,
            baseline_pm25=base_val,
            counterfactual_pm25=cf_val,
            delta_pm25=delta_val,
            percent_change=pct_val,
            intervention_summary=intervention_str,
            executive_summary=gemini_result.get("executive_summary", f"Simulation indicates an estimated shift of {delta_val} µg/m³ ({pct_val}%) under the evaluated policy levers."),
            mechanism_explanation=gemini_result.get("mechanism_explanation", f"The reduction reflects scaling of core source proxies against prevailing atmospheric ventilation ({vent_idx} m²/s)."),
            policy_effectiveness=gemini_result.get("policy_effectiveness", "MODERATE"),
            municipal_recommendations=gemini_result.get("municipal_recommendations", [
                "Consider pairing traffic curtailments with peak congestion hours for maximum effectiveness.",
                "Monitor boundary layer conditions to deploy targeted interventions during low-ventilation episodes."
            ]),
            generated_at=datetime.now(timezone.utc).isoformat()
        )

    # -----------------------------------------------------------------------
    # Deterministic Rule-Based Fallback Generators
    # -----------------------------------------------------------------------
    @staticmethod
    def _generate_forecast_fallback(
        station_name: str,
        zone_type: str,
        predicted_val: float,
        aqi_cat: str,
        vent_idx: Optional[float],
        traf_idx: Optional[float],
        pbl_h: Optional[float]
    ) -> Dict[str, Any]:
        vent_text = "moderate"
        if vent_idx and vent_idx < 1000:
            vent_text = "restricted, trapping ground-level particulate matter"
        elif vent_idx and vent_idx > 3000:
            vent_text = "favorable, supporting rapid atmospheric dispersion"

        return {
            "executive_summary": (
                f"Next-hour ambient PM2.5 concentration at {station_name} ({zone_type}) is projected at {predicted_val} µg/m³, "
                f"classifying as {aqi_cat}. Atmospheric ventilation conditions are {vent_text}."
            ),
            "atmospheric_drivers": [
                f"Atmospheric dispersion capacity is currently indexed at {vent_idx} m²/s (ventilation volume).",
                f"Local diurnal traffic intensity factor stands at {traf_idx} (scaled 0.0–1.0).",
                f"Planetary boundary layer ceiling is positioned at {pbl_h} m, defining vertical dilution depth."
            ],
            "health_advisory": (
                f"Under {aqi_cat} air quality, active children, the elderly, and individuals with respiratory conditions "
                f"should consider limiting prolonged heavy exertion outdoors."
            ),
            "recommended_actions": [
                "Coordinate traffic synchronization across key congestion chokepoints during peak hours.",
                "Ensure continuous regulatory dust suppression along active construction and arterial corridors."
            ]
        }

    @staticmethod
    def _generate_scenario_fallback(
        scenario_name: str,
        intervention_str: str,
        delta_val: float,
        pct_val: float,
        base_val: float,
        cf_val: float,
        vent_idx: float
    ) -> Dict[str, Any]:
        effectiveness = "MODERATE"
        if abs(pct_val) >= 15.0:
            effectiveness = "HIGH"
        elif abs(pct_val) < 5.0:
            effectiveness = "LOW"

        direction = "reduction" if delta_val < 0 else "increase"
        return {
            "executive_summary": (
                f"The evaluated scenario '{scenario_name}' ({intervention_str}) yields an estimated {abs(delta_val)} µg/m³ "
                f"{direction} ({abs(pct_val)}%), moving ambient PM2.5 from {base_val} to {cf_val} µg/m³."
            ),
            "mechanism_explanation": (
                f"The model-based counterfactual delta reflects direct scaling of source emission proxies against an atmospheric "
                f"ventilation index of {vent_idx} m²/s. During periods of lower ventilation, emission curbs have heightened relative impact."
            ),
            "policy_effectiveness": effectiveness,
            "municipal_recommendations": [
                "Implement targeted corridor restrictions primarily during stagnant or morning peak hours.",
                "Complement mobile source restrictions with stationary buffer zoning to achieve lasting environmental benefits."
            ]
        }

    @classmethod
    def generate_policy_report(
        cls,
        db: Session,
        scenario_id: str
    ) -> PolicyReportResponse:
        """
        Generates an executive-grade Climate Action Policy Decision Brief
        evaluating simulated What-If counterfactual policy levers for city commissioners.
        """
        scenario = db.query(Scenario).filter(Scenario.scenario_id == scenario_id).first()
        if not scenario:
            raise ValueError(f"Scenario ID '{scenario_id}' does not exist.")

        latest_result = (
            db.query(ScenarioResult)
            .filter(ScenarioResult.scenario_id == scenario_id)
            .order_by(ScenarioResult.created_at.desc())
            .first()
        )
        if not latest_result:
            raise ValueError(f"Scenario '{scenario_id}' has not been simulated yet. Please run the scenario first.")

        station = db.query(Station).filter(Station.station_id == scenario.station_id).first()
        station_name = station.station_name if station else f"Station {scenario.station_id}"
        zone_type = station.zone_type if station else "Urban Municipal Zone"

        base_val = round(latest_result.baseline_pm25, 2)
        cf_val = round(latest_result.scenario_pm25, 2)
        delta_val = round(latest_result.delta_pm25, 2)
        pct_val = round(latest_result.pct_change, 2)

        base_naqi = get_naqi_category(base_val)
        cf_naqi = get_naqi_category(cf_val)

        # Parse policy levers
        meta_intervention: Dict[str, Any] = {}
        if scenario.weather_reference_period and scenario.weather_reference_period.startswith("{"):
            try:
                meta_intervention = json.loads(scenario.weather_reference_period)
            except Exception:
                pass

        traffic_pct = meta_intervention.get("traffic_reduction_percent", scenario.traffic_reduction_pct)
        industrial_pct = meta_intervention.get("industrial_activity_reduction_percent", scenario.industrial_reduction_pct)
        ev_pct = meta_intervention.get("ev_fleet_transition_percent", 0.0)
        green_pct = meta_intervention.get("green_buffer_increase_percent", 0.0)
        dust_suppression = meta_intervention.get("construction_dust_suppression", scenario.construction_halt)

        levers_summary = []
        if traffic_pct > 0:
            levers_summary.append(f"{traffic_pct}% vehicular traffic curb")
        if ev_pct > 0:
            levers_summary.append(f"{ev_pct}% public/commercial EV fleet transition")
        if industrial_pct > 0:
            levers_summary.append(f"{industrial_pct}% industrial emissions abatement")
        if green_pct > 0:
            levers_summary.append(f"{green_pct}% urban green canopy expansion")
        if dust_suppression:
            levers_summary.append("mandatory construction dust suppression (mist canons & screens)")
        
        levers_str = ", ".join(levers_summary) if levers_summary else "Baseline control run"

        # Public health calculation (WHO/CPCB epidemiological coefficients)
        reduced_pm = max(0.0, -delta_val)
        resp_benefit = round(reduced_pm * 0.105, 2)
        cardio_benefit = round(reduced_pm * 0.085, 2)

        prompt = f"""
You are the Chief Environmental Policy Advisor and Urban Planning Director for the Pune Metropolitan Region (PMC & PCMC).
You are preparing an official Executive Climate Action Policy Decision Brief for the Municipal Commissioner evaluating a What-If counterfactual scenario simulation.

Simulation Evidence:
- Policy Scenario: {scenario.scenario_name}
- Target Station: {station_name} ({zone_type})
- Baseline Forecast PM2.5: {base_val} µg/m³ (CPCB Tier: {base_naqi})
- Counterfactual Simulated PM2.5: {cf_val} µg/m³ (CPCB Tier: {cf_naqi})
- Net Estimated Air Quality Delta: {delta_val} µg/m³ ({pct_val}%)
- Levers Evaluated: {levers_str}
- Projected Health Benefit: ~{resp_benefit}% reduction in acute respiratory ER admissions; ~{cardio_benefit}% reduction in cardiopulmonary complications.

Generate a comprehensive executive policy decision brief in JSON format with these exact keys:
{{
  "report_title": "Concise, authoritative title for the policy decision brief",
  "verdict": "One of: HIGHLY_RECOMMENDED, FEASIBLE_WITH_TARGETING, MODERATE_IMPACT, LOW_RETURN",
  "executive_summary": "Thorough 2-paragraph synthesis summarizing the problem, counterfactual results, atmospheric dynamics, and final municipal recommendation.",
  "health_benefit_projection": "Detailed public health outcome projection including vulnerable demographic shielding (children, elderly, outdoor workers).",
  "economic_and_feasibility_analysis": "Capital expenditure, enforcement viability by PMC/Traffic Police, and operational friction vs economic benefits from avoided sickness.",
  "action_plan": [
    {{
      "phase": "Immediate (0-30 Days)",
      "action": "Concrete short-term operational action",
      "responsible_agency": "e.g. PMC Traffic Police / MPCB",
      "target_metric": "e.g. 25% peak congestion reduction on arterial corridors"
    }},
    {{
      "phase": "Medium-Term (1-6 Months)",
      "action": "Mid-term systemic or regulatory measure",
      "responsible_agency": "e.g. PMPML / PCMC Transport Dept",
      "target_metric": "e.g. 50% EV electrification on feeder bus routes"
    }},
    {{
      "phase": "Long-Term (1-3 Years)",
      "action": "Long-term infrastructure or zoning transformation",
      "responsible_agency": "e.g. Town Planning & Urban Forestry",
      "target_metric": "e.g. 40% tree canopy density along industrial buffers"
    }}
  ],
  "markdown_content": "A complete, beautifully formatted Markdown report including title, key metrics table, verdict badge, executive narrative, health outcomes, feasibility analysis, and phased action plan."
}}
"""
        gemini_result = cls._call_gemini_json(prompt)

        if not gemini_result:
            gemini_result = cls._generate_policy_report_fallback(
                scenario_name=scenario.scenario_name,
                station_name=station_name,
                zone_type=zone_type,
                levers_str=levers_str,
                base_val=base_val,
                cf_val=cf_val,
                delta_val=delta_val,
                pct_val=pct_val,
                base_naqi=base_naqi,
                cf_naqi=cf_naqi,
                resp_benefit=resp_benefit,
                cardio_benefit=cardio_benefit
            )

        raw_action_plan = gemini_result.get("action_plan", [])
        action_plan_items = []
        for item in raw_action_plan:
            action_plan_items.append(
                PolicyActionItem(
                    phase=item.get("phase", "Implementation Phase"),
                    action=item.get("action", "Execute planned municipal abatement measure"),
                    responsible_agency=item.get("responsible_agency", "Municipal Authority (PMC/PCMC)"),
                    target_metric=item.get("target_metric", "Compliance verification")
                )
            )

        return PolicyReportResponse(
            scenario_id=scenario_id,
            scenario_name=scenario.scenario_name,
            station_id=scenario.station_id,
            station_name=station_name,
            baseline_pm25=base_val,
            counterfactual_pm25=cf_val,
            delta_pm25=delta_val,
            percent_change=pct_val,
            baseline_naqi=base_naqi,
            counterfactual_naqi=cf_naqi,
            report_title=gemini_result.get("report_title", f"Executive Policy Decision Brief: {scenario.scenario_name}"),
            verdict=gemini_result.get("verdict", "FEASIBLE_WITH_TARGETING"),
            executive_summary=gemini_result.get("executive_summary", "Counterfactual model simulation indicates measurable particulate matter abatement under the tested policy levers."),
            health_benefit_projection=gemini_result.get("health_benefit_projection", f"Estimated {resp_benefit}% reduction in acute respiratory complications across the monitored corridor."),
            economic_and_feasibility_analysis=gemini_result.get("economic_and_feasibility_analysis", "Operational implementation requires inter-agency coordination between municipal transport, policing, and environmental boards."),
            action_plan=action_plan_items,
            markdown_content=gemini_result.get("markdown_content", "Detailed policy brief markdown generation."),
            generated_at=datetime.now(timezone.utc).isoformat()
        )

    @staticmethod
    def _generate_policy_report_fallback(
        scenario_name: str,
        station_name: str,
        zone_type: str,
        levers_str: str,
        base_val: float,
        cf_val: float,
        delta_val: float,
        pct_val: float,
        base_naqi: str,
        cf_naqi: str,
        resp_benefit: float,
        cardio_benefit: float
    ) -> Dict[str, Any]:
        """Deterministic rule-based executive policy brief generator."""
        verdict = "FEASIBLE_WITH_TARGETING"
        if abs(pct_val) >= 20.0:
            verdict = "HIGHLY_RECOMMENDED"
        elif abs(pct_val) < 6.0:
            verdict = "LOW_RETURN"
        elif abs(pct_val) >= 10.0:
            verdict = "FEASIBLE_WITH_TARGETING"

        title = f"Executive Policy Decision Brief: {scenario_name}"
        exec_summary = (
            f"The Urban Environmental Digital Twin evaluated policy scenario '{scenario_name}' at {station_name} ({zone_type}). "
            f"Applying {levers_str} yields an estimated {abs(delta_val)} µg/m³ ({abs(pct_val)}%) reduction in ambient PM2.5, "
            f"transitioning the local corridor from {base_naqi} to {cf_naqi}. Under typical winter stagnation episodes, "
            f"such interventions curtail hazardous exposure spikes along high-density transit corridors."
        )

        health_text = (
            f"Based on epidemiological exposure-response models (CPCB/WHO), an ambient particulate drop of {abs(delta_val)} µg/m³ "
            f"translates to an estimated {resp_benefit}% decrease in acute emergency room respiratory admissions and a {cardio_benefit}% "
            f"drop in cardiovascular exacerbations within the 2.5 km station footprint, conferring primary protection to school children and elderly residents."
        )

        econ_text = (
            f"Implementation feasibility is rated as {verdict.replace('_', ' ').title()}. Direct capital outlays for traffic demand "
            f"management and vegetative buffering are largely offset by avoided public healthcare expenditures and commercial productivity gains. "
            f"Enforcement requires automated ANPR cameras and coordinated scheduling with PMPML transit operators."
        )

        action_plan = [
            {
                "phase": "Immediate (0-30 Days)",
                "action": "Deploy targeted traffic metering and strict construction misting along arterial corridors during morning peak hours.",
                "responsible_agency": "PMC / PCMC Traffic Police & MPCB",
                "target_metric": "30% peak hour speed improvement and 100% dust screen compliance"
            },
            {
                "phase": "Medium-Term (1-6 Months)",
                "action": "Accelerate feeder route bus electrification and establish low-emission loading windows for commercial freight.",
                "responsible_agency": "PMPML Transit & Municipal Transport Committees",
                "target_metric": "50% electric bus deployment on high-congestion corridors"
            },
            {
                "phase": "Long-Term (1-3 Years)",
                "action": "Institute permanent green buffer zoning (multi-tiered canopy) between industrial nodes and residential settlements.",
                "responsible_agency": "PMC Town Planning & Urban Forestry Division",
                "target_metric": "Increase local vegetative canopy coverage by 25%"
            }
        ]

        markdown = f"""# {title}

**Target Location:** {station_name} ({zone_type})  
**Evaluation Verdict:** `{verdict}`  
**Analyzed Levers:** {levers_str}  

---

## 1. Impact Matrix & Environmental Shift

| Metric | Baseline Prediction | Simulated Counterfactual | Net Difference |
| :--- | :--- | :--- | :--- |
| **Ambient PM2.5** | `{base_val} µg/m³` | `{cf_val} µg/m³` | **`{delta_val} µg/m³` ({pct_val}%)** |
| **CPCB NAQI Tier** | `{base_naqi}` | `{cf_naqi}` | **Air Quality Improvement** |
| **Respiratory Health Risk** | Baseline Risk | ~{resp_benefit}% reduction | **Fewer acute ER visits** |

---

## 2. Executive Summary
{exec_summary}

---

## 3. Public Health Impact Projection
{health_text}

---

## 4. Economic Feasibility & Operational Hurdles
{econ_text}

---

## 5. Phased Municipal Action Roadmap
1. **Immediate (0-30 Days):** {action_plan[0]['action']} (*Lead: {action_plan[0]['responsible_agency']}*)
2. **Medium-Term (1-6 Months):** {action_plan[1]['action']} (*Lead: {action_plan[1]['responsible_agency']}*)
3. **Long-Term (1-3 Years):** {action_plan[2]['action']} (*Lead: {action_plan[2]['responsible_agency']}*)

---
*Disclaimer: Generated by the Urban Environmental Digital Twin AI Policy Engine. Projections are counterfactual machine learning estimates intended for decision support, not causal guarantees.*
"""

        return {
            "report_title": title,
            "verdict": verdict,
            "executive_summary": exec_summary,
            "health_benefit_projection": health_text,
            "economic_and_feasibility_analysis": econ_text,
            "action_plan": action_plan,
            "markdown_content": markdown
        }

