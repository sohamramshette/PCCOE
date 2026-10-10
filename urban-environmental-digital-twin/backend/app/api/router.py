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
    spatial,
    sync,
    alerts,
    backtracking,
    auth,
    citizen,
    reports,
)

api_router = APIRouter()

# Authentication & Access Control
api_router.include_router(auth.router)

# Citizen Voice & Public Assistant
api_router.include_router(citizen.router)

# Citizen Pollution Incident Reports
api_router.include_router(reports.router)

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
api_router.include_router(spatial.router)
api_router.include_router(sync.router)
api_router.include_router(alerts.router)
api_router.include_router(backtracking.router)

