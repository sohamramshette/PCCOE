"""
Urban Environmental Digital Twin - Master API Router
====================================================
Aggregates all sub-routers into a unified API v1 router.
"""

from fastapi import APIRouter
from backend.app.api.routes import (
    health,
    stations,
    observations,
    weather,
    predictions,
    models,
    forecast,
    scenarios,
)

api_router = APIRouter()

# Health probe (also available at root /health)
api_router.include_router(health.router)

# Core domain endpoints
api_router.include_router(stations.router)
api_router.include_router(observations.router)
api_router.include_router(weather.router)
api_router.include_router(predictions.router)
api_router.include_router(models.router)
api_router.include_router(forecast.router)
api_router.include_router(scenarios.router)
