from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, SmallInteger, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Station(Base):
    __tablename__ = "stations"
    station_id: Mapped[str] = mapped_column(Text, primary_key=True)
    station_name: Mapped[str] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    zone: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    monitoring_authority: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata: Mapped[dict | None] = mapped_column(JSONB)
    provenance: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EnvironmentalObservation(Base):
    __tablename__ = "environmental_observations"
    __table_args__ = (UniqueConstraint("station_id", "datetime_utc"),)
    observation_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.station_id"))
    datetime_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    pm25: Mapped[float | None] = mapped_column(Float)
    pm10: Mapped[float | None] = mapped_column(Float)
    no2: Mapped[float | None] = mapped_column(Float)
    so2: Mapped[float | None] = mapped_column(Float)
    co: Mapped[float | None] = mapped_column(Float)
    o3: Mapped[float | None] = mapped_column(Float)
    observation_count: Mapped[int | None] = mapped_column(Integer)
    completeness_pct: Mapped[float | None] = mapped_column(Float)
    provenance: Mapped[str | None] = mapped_column(Text)


class WeatherReanalysis(Base):
    __tablename__ = "weather_reanalysis"
    __table_args__ = (UniqueConstraint("station_id", "datetime_utc"),)
    weather_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.station_id"))
    datetime_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    temp_c: Mapped[float | None] = mapped_column(Float)
    humidity_pct: Mapped[float | None] = mapped_column(Float)
    dew_point_c: Mapped[float | None] = mapped_column(Float)
    precip_mm: Mapped[float | None] = mapped_column(Float)
    rain_mm: Mapped[float | None] = mapped_column(Float)
    pressure_hpa: Mapped[float | None] = mapped_column(Float)
    wind_speed_ms: Mapped[float | None] = mapped_column(Float)
    wind_dir_deg: Mapped[float | None] = mapped_column(Float)
    solar_rad_wm2: Mapped[float | None] = mapped_column(Float)
    cloud_cover_pct: Mapped[float | None] = mapped_column(Float)
    pbl_height_m: Mapped[float | None] = mapped_column(Float)
    elevation_m: Mapped[float | None] = mapped_column(Float)
    grid_metadata: Mapped[dict | None] = mapped_column(JSONB)
    provenance: Mapped[str] = mapped_column(Text, default="REANALYSIS")


class TrafficProxy(Base):
    __tablename__ = "traffic_proxy"
    traffic_proxy_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    datetime_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), unique=True)
    traffic_proxy_index: Mapped[float | None] = mapped_column(Float)
    weekday: Mapped[bool | None] = mapped_column(Boolean)
    day_of_week: Mapped[int | None] = mapped_column(SmallInteger)
    hour_of_day: Mapped[int | None] = mapped_column(SmallInteger)
    provenance: Mapped[str] = mapped_column(Text, default="PROXY")
    metadata: Mapped[dict | None] = mapped_column(JSONB)


class ModelRegistry(Base):
    __tablename__ = "model_registry"
    __table_args__ = (UniqueConstraint("model_name", "version"),)
    model_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    model_name: Mapped[str] = mapped_column(Text)
    model_type: Mapped[str] = mapped_column(Text)
    version: Mapped[str] = mapped_column(Text)
    target: Mapped[str] = mapped_column(Text)
    horizon: Mapped[int] = mapped_column(Integer)
    feature_set: Mapped[str | None] = mapped_column(Text)
    training_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    training_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    validation_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    validation_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    test_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    test_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metrics: Mapped[dict | None] = mapped_column(JSONB)
    artifact_path: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)


class ModelPrediction(Base):
    __tablename__ = "model_predictions"
    prediction_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    model_id: Mapped[UUID] = mapped_column(ForeignKey("model_registry.model_id"))
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.station_id"))
    prediction_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    target_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    horizon_hours: Mapped[int] = mapped_column(Integer)
    predicted_pm25: Mapped[float | None] = mapped_column(Float)
    actual_pm25: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Scenario(Base):
    __tablename__ = "scenarios"
    scenario_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    station_id: Mapped[str | None] = mapped_column(ForeignKey("stations.station_id"))
    area: Mapped[str | None] = mapped_column(Text)
    scenario_name: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    traffic_adjustment: Mapped[float | None] = mapped_column(Float)
    construction_activity_adjustment: Mapped[float | None] = mapped_column(Float)
    industrial_activity_assumptions: Mapped[dict | None] = mapped_column(JSONB)
    weather_assumption: Mapped[dict | None] = mapped_column(JSONB)
    baseline_prediction: Mapped[float | None] = mapped_column(Float)
    scenario_prediction: Mapped[float | None] = mapped_column(Float)
    delta: Mapped[float | None] = mapped_column(Float)
    model_id: Mapped[UUID | None] = mapped_column(ForeignKey("model_registry.model_id"))
    provenance: Mapped[str] = mapped_column(Text, default="MODELLED_SCENARIO")


class ScenarioResult(Base):
    __tablename__ = "scenario_results"
    scenario_result_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    scenario_id: Mapped[UUID] = mapped_column(ForeignKey("scenarios.scenario_id", ondelete="CASCADE"))
    target_time_utc: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    horizon_hours: Mapped[int | None] = mapped_column(Integer)
    baseline_prediction: Mapped[float | None] = mapped_column(Float)
    scenario_prediction: Mapped[float | None] = mapped_column(Float)
    delta: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    provenance: Mapped[str] = mapped_column(Text, default="MODELLED_SCENARIO")
