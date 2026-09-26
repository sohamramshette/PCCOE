"""
Urban Environmental Digital Twin - Scenario & Simulation Engine Service
========================================================================
Implements the model-based What-If / Counterfactual Simulation Engine (Phase 10).

Given a verified historical baseline state for a Pune monitoring station (station_id, timestamp)
and a user-defined intervention (traffic reduction, industrial activity reduction, or combined),
constructs a counterfactual feature representation and estimates how the pre-trained PM2.5
forecasting model changes its prediction.

CORE SCIENTIFIC PRINCIPLES:
1. MODEL-BASED COUNTERFACTUAL ESTIMATE: Not a causal inference model, not a measured pollution reduction.
2. DATABASE IMMUTABILITY: Never modifies or overwrites raw observations, weather reanalysis,
   traffic proxy, or station exposure records.
3. STRICT FEATURE SAFETY: Only modifies explicitly supported core features that exist in the
   trained model manifest (ml/models/feature_names.json).
4. REUSE OF IN-MEMORY MODEL SERVING: Uses existing ModelServingManager singleton without reloading
   or retraining.
"""

import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.config.settings import settings
from backend.app.models.station import Station
from backend.app.models.model_registry import ModelRegistry
from backend.app.models.scenario import Scenario, ScenarioResult
from backend.app.services.model_serving import model_serving
from backend.app.services.forecast_service import ForecastService, ForecastDataUnavailableException
from backend.app.schemas.scenario import (
    InterventionType,
    InterventionParams,
    ScenarioCreateRequest,
    FeatureAuditItem,
)

logger = logging.getLogger("scenario_service")

# Explicit mapping of supported features affected by interventions
# All features verified against ml/models/feature_names.json
TRAFFIC_INTERVENTION_FEATURES = [
    "traffic_proxy_index",
    "traffic_stagnation_ratio",
    "traffic_ventilation_ratio",
    "poi_traffic_interaction",
]

INDUSTRIAL_INTERVENTION_FEATURES = [
    "has_industrial_within_1km",
    "industrial_dispersion_ratio",
]

FEATURE_PROVENANCE_CLASSIFICATION = {
    "traffic_proxy_index": "TRAFFIC_PROXY",
    "traffic_stagnation_ratio": "DERIVED_INTERACTION",
    "traffic_ventilation_ratio": "DERIVED_INTERACTION",
    "poi_traffic_interaction": "DERIVED_INTERACTION",
    "has_industrial_within_1km": "STATIC_SPATIAL_PROXY",
    "industrial_dispersion_ratio": "DERIVED_INTERACTION",
}


class ScenarioValidationException(Exception):
    """Raised when scenario inputs fail domain or physical bounds checks."""
    pass


class ScenarioService:
    @staticmethod
    def _ensure_utc(dt: datetime) -> datetime:
        """Ensures a datetime object is timezone-aware in UTC."""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @classmethod
    def create_scenario(
        cls,
        db: Session,
        req: ScenarioCreateRequest,
        created_by: str = "system"
    ) -> Scenario:
        """
        Validates scenario inputs against database state and creates a persisted Scenario entity.
        Does NOT alter any observational or weather records.
        """
        # 1. Validate station existence
        station = db.query(Station).filter(Station.station_id == req.station_id).first()
        if not station:
            raise ScenarioValidationException(f"Station ID {req.station_id} does not exist.")

        # 2. Validate model existence
        target_model_id = req.model_id or settings.DEFAULT_FORECAST_MODEL_ID
        reg_model = db.query(ModelRegistry).filter(ModelRegistry.model_id == target_model_id).first()
        if not reg_model or not model_serving.is_model_available(target_model_id):
            raise ScenarioValidationException(f"Model ID '{target_model_id}' is not available in model registry.")

        # 3. Validate baseline timestamp
        baseline_dt = cls._ensure_utc(req.baseline_timestamp_utc)

        # 4. Extract intervention parameters
        traffic_pct = 0.0
        industrial_pct = 0.0

        if req.intervention.type == InterventionType.TRAFFIC_REDUCTION:
            traffic_pct = float(req.intervention.traffic_reduction_percent or 0.0)
        elif req.intervention.type == InterventionType.INDUSTRIAL_ACTIVITY_REDUCTION:
            industrial_pct = float(req.intervention.industrial_activity_reduction_percent or 0.0)
        elif req.intervention.type == InterventionType.COMBINED_INTERVENTION:
            traffic_pct = float(req.intervention.traffic_reduction_percent or 0.0)
            industrial_pct = float(req.intervention.industrial_activity_reduction_percent or 0.0)

        # Validate bounds
        if not (0.0 <= traffic_pct <= 100.0):
            raise ScenarioValidationException(f"Traffic reduction percentage {traffic_pct} out of bounds [0, 100].")
        if not (0.0 <= industrial_pct <= 100.0):
            raise ScenarioValidationException(f"Industrial reduction percentage {industrial_pct} out of bounds [0, 100].")

        # 5. Persist scenario entity
        scenario_id = f"scen_{uuid.uuid4().hex[:12]}"
        scenario = Scenario(
            scenario_id=scenario_id,
            scenario_name=req.scenario_name,
            description=req.description,
            station_id=station.station_id,
            model_id=target_model_id,
            baseline_time_utc=baseline_dt,
            traffic_reduction_pct=traffic_pct,
            industrial_reduction_pct=industrial_pct,
            construction_halt=False,
            weather_reference_period=baseline_dt.isoformat(),
            simulation_status="DRAFT",
            is_modeled_scenario=True,
            created_by=created_by,
        )

        db.add(scenario)
        db.commit()
        db.refresh(scenario)
        return scenario

    @classmethod
    def get_scenario(cls, db: Session, scenario_id: str) -> Optional[Scenario]:
        """Retrieves a scenario entity by ID."""
        return db.query(Scenario).filter(Scenario.scenario_id == scenario_id).first()

    @classmethod
    def list_scenarios(
        cls,
        db: Session,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Scenario], int]:
        """Returns paginated list of scenarios."""
        total = db.query(func.count(Scenario.scenario_id)).scalar() or 0
        items = (
            db.query(Scenario)
            .order_by(Scenario.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    @classmethod
    def apply_intervention_to_features(
        cls,
        baseline_df: pd.DataFrame,
        traffic_reduction_pct: float,
        industrial_reduction_pct: float
    ) -> Tuple[pd.DataFrame, List[FeatureAuditItem]]:
        """
        Creates a decoupled deep copy of baseline features and modifies ONLY the
        intervention-controlled features. Never alters baseline_df in-place.
        """
        cf_df = baseline_df.copy(deep=True)
        audit_items: List[FeatureAuditItem] = []

        # Multipliers
        m_traffic = 1.0 - (traffic_reduction_pct / 100.0)
        m_industrial = 1.0 - (industrial_reduction_pct / 100.0)

        # 1. Apply Traffic Intervention
        if traffic_reduction_pct > 0.0 or traffic_reduction_pct == 0.0:
            for feat in TRAFFIC_INTERVENTION_FEATURES:
                if feat in cf_df.columns:
                    cf_df[feat] = cf_df[feat].astype(float)
                    base_val = float(baseline_df[feat].iloc[0])
                    cf_val = round(base_val * m_traffic, 6)
                    cf_df.at[0, feat] = cf_val
                    delta = round(cf_val - base_val, 6)
                    audit_items.append(
                        FeatureAuditItem(
                            feature_name=feat,
                            baseline_value=round(base_val, 4),
                            counterfactual_value=round(cf_val, 4),
                            delta=round(delta, 4),
                            transformation=f"{traffic_reduction_pct:.1f}% reduction (x{m_traffic:.4f})",
                            classification=FEATURE_PROVENANCE_CLASSIFICATION.get(feat, "TRAFFIC_PROXY")
                        )
                    )

        # 2. Apply Industrial Activity Intervention
        if industrial_reduction_pct > 0.0 or industrial_reduction_pct == 0.0:
            for feat in INDUSTRIAL_INTERVENTION_FEATURES:
                if feat in cf_df.columns:
                    cf_df[feat] = cf_df[feat].astype(float)
                    base_val = float(baseline_df[feat].iloc[0])
                    cf_val = round(base_val * m_industrial, 6)
                    cf_df.at[0, feat] = cf_val
                    delta = round(cf_val - base_val, 6)
                    audit_items.append(
                        FeatureAuditItem(
                            feature_name=feat,
                            baseline_value=round(base_val, 4),
                            counterfactual_value=round(cf_val, 4),
                            delta=round(delta, 4),
                            transformation=f"{industrial_reduction_pct:.1f}% reduction (x{m_industrial:.4f})",
                            classification=FEATURE_PROVENANCE_CLASSIFICATION.get(feat, "STATIC_SPATIAL_PROXY")
                        )
                    )

        return cf_df, audit_items

    @classmethod
    def run_scenario(
        cls,
        db: Session,
        scenario_id: str
    ) -> Dict[str, Any]:
        """
        Executes the counterfactual simulation for a stored scenario:
        1. Loads verified historical baseline state.
        2. Constructs baseline 98-feature vector.
        3. Generates counterfactual feature vector.
        4. Predicts baseline and counterfactual PM2.5 through ModelServingManager.
        5. Computes differences and estimated reductions.
        6. Persists ScenarioResult with execution metadata.
        7. Guarantees 0 modifications to source observation/weather tables.
        """
        scenario = cls.get_scenario(db, scenario_id)
        if not scenario:
            raise ScenarioValidationException(f"Scenario ID '{scenario_id}' not found.")

        station = db.query(Station).filter(Station.station_id == scenario.station_id).first()
        if not station:
            raise ScenarioValidationException(f"Associated station ID {scenario.station_id} not found.")

        reg_model = db.query(ModelRegistry).filter(ModelRegistry.model_id == scenario.model_id).first()
        if not reg_model:
            raise ScenarioValidationException(f"Associated model ID '{scenario.model_id}' not in registry.")

        baseline_time_utc = scenario.baseline_time_utc
        if baseline_time_utc is None:
            # Fallback to latest observation timestamp
            baseline_time_utc = ForecastService.get_latest_data_timestamp(db, station.station_id)
            if baseline_time_utc is None:
                raise ForecastDataUnavailableException(
                    f"No historical observation data found for station {station.station_id}.",
                    station_id=station.station_id
                )
        baseline_time_utc = cls._ensure_utc(baseline_time_utc)
        target_time_utc = baseline_time_utc + timedelta(hours=1)

        # 1. Construct baseline 98 core features from verified historical state
        # This will raise ForecastDataUnavailableException if historical records do not exist
        baseline_df = ForecastService.construct_features(db, station, baseline_time_utc)

        # 2. Execute baseline forecast prediction
        baseline_pred = model_serving.predict(scenario.model_id, baseline_df)

        # 3. Construct counterfactual feature representation
        traffic_pct = scenario.traffic_reduction_pct
        industrial_pct = scenario.industrial_reduction_pct
        cf_df, audit_items = cls.apply_intervention_to_features(
            baseline_df=baseline_df,
            traffic_reduction_pct=traffic_pct,
            industrial_reduction_pct=industrial_pct
        )

        # 4. Execute counterfactual forecast prediction
        cf_pred = model_serving.predict(scenario.model_id, cf_df)

        # 5. Compute counterfactual metrics
        absolute_change = round(cf_pred - baseline_pred, 2)
        estimated_reduction = round(baseline_pred - cf_pred, 2)

        if baseline_pred > 0.0:
            percentage_change = round(((cf_pred - baseline_pred) / baseline_pred) * 100.0, 2)
        else:
            percentage_change = 0.0

        # Construct intervention description dict
        intervention_dict: Dict[str, Any] = {}
        if traffic_pct > 0.0 and industrial_pct > 0.0:
            intervention_dict = {
                "type": "COMBINED_INTERVENTION",
                "traffic_reduction_percent": traffic_pct,
                "industrial_activity_reduction_percent": industrial_pct
            }
        elif traffic_pct > 0.0 or (traffic_pct == 0.0 and industrial_pct == 0.0):
            intervention_dict = {
                "type": "TRAFFIC_REDUCTION",
                "traffic_reduction_percent": traffic_pct
            }
        else:
            intervention_dict = {
                "type": "INDUSTRIAL_ACTIVITY_REDUCTION",
                "industrial_activity_reduction_percent": industrial_pct
            }

        # Structured metadata
        execution_meta = {
            "intervention": intervention_dict,
            "uncertainty_available": False,
            "uncertainty_note": "Point estimate only; the current baseline model does not provide calibrated uncertainty.",
            "interpretation_note": "Counterfactual model estimate; not a causal measurement.",
            "data_classification": "MODEL_COUNTERFACTUAL_ESTIMATE",
            "features_modified_count": len(audit_items),
            "affected_features_audit": [item.model_dump() for item in audit_items],
            "baseline_input_time_utc": baseline_time_utc.isoformat(),
            "target_simulation_time_utc": target_time_utc.isoformat(),
            "model_id": scenario.model_id,
        }

        # 6. Persist ScenarioResult
        scenario_result = ScenarioResult(
            scenario_id=scenario.scenario_id,
            station_id=station.station_id,
            baseline_time_utc=baseline_time_utc,
            target_time_utc=target_time_utc,
            baseline_pm25=baseline_pred,
            scenario_pm25=cf_pred,
            delta_pm25=absolute_change,
            pct_change=percentage_change,
            metadata_json=json.dumps(execution_meta),
        )

        scenario.simulation_status = "COMPLETED"
        db.add(scenario_result)
        db.commit()
        db.refresh(scenario_result)

        return {
            "scenario_id": scenario.scenario_id,
            "station_id": station.station_id,
            "station_name": station.station_name,
            "baseline_timestamp_utc": baseline_time_utc,
            "target_timestamp_utc": target_time_utc,
            "model_id": scenario.model_id,
            "model_type": reg_model.model_type,
            "intervention": intervention_dict,
            "baseline_prediction_pm25": baseline_pred,
            "counterfactual_prediction_pm25": cf_pred,
            "absolute_change_pm25": absolute_change,
            "estimated_reduction_pm25": estimated_reduction,
            "percentage_change": percentage_change,
            "unit": "ug/m3",
            "uncertainty_available": False,
            "uncertainty_note": "Point estimate only; the current baseline model does not provide calibrated uncertainty.",
            "interpretation_note": "Counterfactual model estimate; not a causal measurement.",
            "data_classification": "MODEL_COUNTERFACTUAL_ESTIMATE",
            "affected_features_audit": audit_items,
            "created_at": scenario_result.created_at,
        }

    @classmethod
    def get_scenario_results(
        cls,
        db: Session,
        scenario_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Returns paginated results for a scenario."""
        scenario = cls.get_scenario(db, scenario_id)
        if not scenario:
            raise ScenarioValidationException(f"Scenario ID '{scenario_id}' not found.")

        query = db.query(ScenarioResult).filter(ScenarioResult.scenario_id == scenario_id)
        total = query.count()
        rows = query.order_by(ScenarioResult.created_at.desc()).offset(offset).limit(limit).all()

        formatted_items = []
        for r in rows:
            meta = {}
            if r.metadata_json:
                try:
                    meta = json.loads(r.metadata_json)
                except Exception:
                    pass
            formatted_items.append({
                "id": r.id,
                "scenario_id": r.scenario_id,
                "station_id": r.station_id,
                "baseline_timestamp_utc": r.baseline_time_utc,
                "target_time_utc": r.target_time_utc,
                "baseline_pm25": r.baseline_pm25,
                "scenario_pm25": r.scenario_pm25,
                "delta_pm25": r.delta_pm25,
                "pct_change": r.pct_change,
                "unit": "ug/m3",
                "uncertainty_available": False,
                "interpretation_note": "Counterfactual model estimate; not a causal measurement.",
                "data_classification": "MODEL_COUNTERFACTUAL_ESTIMATE",
                "metadata_json": meta,
                "created_at": r.created_at,
            })

        return formatted_items, total
