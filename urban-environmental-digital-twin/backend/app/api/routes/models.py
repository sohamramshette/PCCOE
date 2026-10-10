"""
Urban Environmental Digital Twin - Model Registry API Route
===========================================================
Exposes registered forecasting models, hyperparameters, and temporal split metrics.
Omits server-side filesystem paths to maintain API security.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.services.model_service import ModelService
from backend.app.schemas.model_registry import ModelRegistrySummary, ModelRegistryDetail

router = APIRouter(prefix="/models", tags=["Model Registry"])


@router.get(
    "",
    response_model=List[ModelRegistrySummary],
    summary="List Registered Baseline Models",
    description="Returns all registered models with algorithm types, validation MAE, and test MAE metrics."
)
def list_models(
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    models = ModelService.get_all_models(db, active_only=active_only)
    summaries = []
    for m in models:
        val_mae = m.metrics.get("validation", {}).get("mae", 0.0)
        test_mae = m.metrics.get("test", {}).get("mae", 0.0)
        summaries.append(
            ModelRegistrySummary(
                model_id=m.model_id,
                model_name=m.model_name,
                model_type=m.model_type,
                version=m.version,
                target=m.target,
                horizon=m.horizon,
                feature_set=m.feature_set,
                is_active=m.is_active,
                validation_mae=val_mae,
                test_mae=test_mae
            )
        )
    return summaries


@router.get(
    "/sensor-loss-benchmark",
    summary="Get Sensor Loss & Spatial Transferability Benchmark",
    description="Returns empirical metrics across declared sensor-loss levels (0%, 25%, 50%, 100%) and held-out location spatial transfer."
)
def get_sensor_loss_benchmark():
    import json
    from pathlib import Path
    benchmark_file = Path(__file__).resolve().parents[4] / "ml" / "results" / "sensor_loss_benchmark.json"
    if benchmark_file.exists():
        with open(benchmark_file, "r") as f:
            return json.load(f)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sensor loss benchmark not found.")


@router.get(
    "/{model_id}",
    response_model=ModelRegistryDetail,
    summary="Get Registered Model Details & Full Metrics",
    description="Returns full model specification, temporal boundaries, and complete evaluation metrics (MAE, RMSE, R2, MedAE)."
)
def get_model(
    model_id: str,
    db: Session = Depends(get_db)
):
    model = ModelService.get_model_by_id(db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forecasting model '{model_id}' not found in registry."
        )
    return model
