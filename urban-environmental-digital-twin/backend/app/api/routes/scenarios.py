"""
Urban Environmental Digital Twin - What-If Scenario Simulation Routes
======================================================================
Exposes REST endpoints for creating, retrieving, executing, and auditing
model-based counterfactual intervention scenarios (Phase 10).
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.scenario_service import (
    ScenarioService,
    ScenarioValidationException,
)
from backend.app.services.forecast_service import ForecastDataUnavailableException
from backend.app.schemas.scenario import (
    ScenarioCreateRequest,
    ScenarioResponse,
    ScenarioRunResponse,
    ScenarioResultResponse,
    ScenarioListResponse,
    ScenarioResultsListResponse,
)
from backend.app.schemas.forecast import ForecastUnavailableResponse

router = APIRouter(prefix="/scenarios", tags=["What-If Scenarios & Interventions"])


def _format_scenario_dict(sc) -> Dict[str, Any]:
    """Helper to convert Scenario model to serializable dictionary with formatted intervention."""
    intervention_dict: Dict[str, Any] = {}
    if sc.traffic_reduction_pct > 0.0 and sc.industrial_reduction_pct > 0.0:
        intervention_dict = {
            "type": "COMBINED_INTERVENTION",
            "traffic_reduction_percent": sc.traffic_reduction_pct,
            "industrial_activity_reduction_percent": sc.industrial_reduction_pct,
        }
    elif sc.industrial_reduction_pct > 0.0:
        intervention_dict = {
            "type": "INDUSTRIAL_ACTIVITY_REDUCTION",
            "industrial_activity_reduction_percent": sc.industrial_reduction_pct,
        }
    else:
        intervention_dict = {
            "type": "TRAFFIC_REDUCTION",
            "traffic_reduction_percent": sc.traffic_reduction_pct,
        }

    return {
        "scenario_id": sc.scenario_id,
        "scenario_name": sc.scenario_name,
        "description": sc.description,
        "station_id": sc.station_id,
        "model_id": sc.model_id,
        "baseline_timestamp_utc": sc.baseline_time_utc,
        "traffic_reduction_pct": sc.traffic_reduction_pct,
        "industrial_reduction_pct": sc.industrial_reduction_pct,
        "construction_halt": sc.construction_halt,
        "simulation_status": sc.simulation_status,
        "is_modeled_scenario": sc.is_modeled_scenario,
        "created_by": sc.created_by,
        "created_at": sc.created_at,
        "intervention": intervention_dict,
    }


@router.post(
    "",
    response_model=ScenarioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create What-If Scenario",
    description=(
        "Defines and validates a new counterfactual intervention scenario for a Pune monitoring station "
        "and historical baseline timestamp. Validates model and station existence."
    )
)
def create_scenario(
    req: ScenarioCreateRequest,
    db: Session = Depends(get_db)
):
    try:
        sc = ScenarioService.create_scenario(db=db, req=req)
        return _format_scenario_dict(sc)
    except ScenarioValidationException as exc:
        msg = str(exc)
        if "not exist" in msg or "not found" in msg or "not available" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.get(
    "",
    response_model=ScenarioListResponse,
    summary="List What-If Scenarios",
    description="Returns a paginated list of created What-If scenarios with current simulation status."
)
def list_scenarios(
    limit: int = Query(default=50, ge=1, le=1000, description="Items per page"),
    offset: int = Query(default=0, ge=0, description="Page offset"),
    db: Session = Depends(get_db)
):
    items, total = ScenarioService.list_scenarios(db=db, limit=limit, offset=offset)
    formatted = [_format_scenario_dict(s) for s in items]
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": formatted
    }


@router.get(
    "/{scenario_id}",
    response_model=ScenarioResponse,
    summary="Get Scenario Details",
    description="Retrieves metadata, policy levers, and simulation status for a specific scenario."
)
def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db)
):
    sc = ScenarioService.get_scenario(db=db, scenario_id=scenario_id)
    if not sc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario ID '{scenario_id}' not found."
        )
    return _format_scenario_dict(sc)


@router.post(
    "/{scenario_id}/run",
    response_model=ScenarioRunResponse,
    responses={
        200: {"model": ScenarioRunResponse, "description": "Successful counterfactual simulation."},
        404: {"description": "Scenario, station, or model not found."},
        422: {"model": ForecastUnavailableResponse, "description": "Baseline historical inputs unavailable at simulation timestamp."}
    },
    summary="Execute Counterfactual Simulation",
    description=(
        "Executes the counterfactual simulation for the specified scenario. Loads the verified historical baseline, "
        "modifies only intervention-controlled features, evaluates baseline and counterfactual PM2.5 predictions "
        "via in-memory model serving, calculates differences, and persists scenario results."
    )
)
def run_scenario(
    scenario_id: str,
    db: Session = Depends(get_db)
):
    try:
        result = ScenarioService.run_scenario(db=db, scenario_id=scenario_id)
        return result
    except ForecastDataUnavailableException as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "status": "UNAVAILABLE",
                "station_id": exc.station_id,
                "detail": str(exc),
                "latest_available_data_utc": exc.latest_available_dt.isoformat() if exc.latest_available_dt else None
            }
        )
    except ScenarioValidationException as exc:
        msg = str(exc)
        if "not found" in msg or "not exist" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.get(
    "/{scenario_id}/results",
    response_model=ScenarioResultsListResponse,
    summary="Get Scenario Simulation Results",
    description="Retrieves persisted historical simulation results and feature audits for a scenario."
)
def get_scenario_results(
    scenario_id: str,
    limit: int = Query(default=50, ge=1, le=1000, description="Items per page"),
    offset: int = Query(default=0, ge=0, description="Page offset"),
    db: Session = Depends(get_db)
):
    try:
        items, total = ScenarioService.get_scenario_results(
            db=db,
            scenario_id=scenario_id,
            limit=limit,
            offset=offset
        )
        return {
            "scenario_id": scenario_id,
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": items
        }
    except ScenarioValidationException as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        )
