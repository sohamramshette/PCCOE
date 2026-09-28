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
from backend.app.schemas.llm import ForecastExplanationResponse, ScenarioExplanationResponse

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
