"""
Urban Environmental Digital Twin - Model Package Exporter
=========================================================
Imports and registers all declarative models to ensure Alembic discovers all tables.
"""

from backend.app.database.session import Base
from backend.app.models.station import Station
from backend.app.models.observation import EnvironmentalObservation
from backend.app.models.weather import WeatherReanalysis
from backend.app.models.spatial import StationTrafficExposure, StationActivityExposure
from backend.app.models.traffic import TrafficProxy
from backend.app.models.model_registry import ModelRegistry
from backend.app.models.prediction import ModelPrediction
from backend.app.models.scenario import Scenario, ScenarioResult

__all__ = [
    "Base",
    "Station",
    "EnvironmentalObservation",
    "WeatherReanalysis",
    "StationTrafficExposure",
    "StationActivityExposure",
    "TrafficProxy",
    "ModelRegistry",
    "ModelPrediction",
    "Scenario",
    "ScenarioResult",
]
