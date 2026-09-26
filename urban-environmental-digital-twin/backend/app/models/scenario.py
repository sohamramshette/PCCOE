"""
Urban Environmental Digital Twin - Scenario & Simulation Entities
=================================================================
Prepares persistence schema for future What-If scenario definitions and simulation outputs.
Explicitly marked as MODELED SCENARIOS rather than physical observed ground truth.
Does NOT implement causal computation logic (reserved for subsequent phases).
"""

from sqlalchemy import (
    Column, Integer, BigInteger, Float, String, Boolean, Text,
    DateTime, ForeignKey, Index, func
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id = Column(String(64), primary_key=True, index=True, comment="Unique scenario identifier (e.g. UUID)")
    scenario_name = Column(String(150), nullable=False, comment="Descriptive scenario label")
    description = Column(Text, nullable=True, comment="Detailed hypothesis or policy context")
    
    # Scope & Modeling Model Association
    station_id = Column(Integer, ForeignKey("stations.station_id", ondelete="SET NULL"), nullable=True, index=True, comment="Target station (NULL indicates network-wide scenario)")
    model_id = Column(String(100), ForeignKey("model_registry.model_id", ondelete="RESTRICT"), nullable=False, index=True, comment="Underlying forecasting model used for simulation")
    baseline_time_utc = Column(DateTime(timezone=True), nullable=True, index=True, comment="Historical baseline reference hour (UTC)")
    
    # Parameterized Policy Levers (Hypothetical Modifiers)
    traffic_reduction_pct = Column(Float, nullable=False, default=0.0, comment="Hypothetical traffic intensity reduction (%) [0.0, 100.0]")
    industrial_reduction_pct = Column(Float, nullable=False, default=0.0, comment="Hypothetical industrial emission curb (%) [0.0, 100.0]")
    construction_halt = Column(Boolean, nullable=False, default=False, comment="Hypothetical complete construction pause flag")
    weather_reference_period = Column(String(50), nullable=True, comment="Meteorological reference baseline")
    
    # Audit & Status Tracking
    simulation_status = Column(String(20), nullable=False, default="DRAFT", comment="Status: DRAFT, QUEUED, COMPLETED, FAILED")
    is_modeled_scenario = Column(Boolean, nullable=False, default=True, comment="Flag explicitly declaring data as modeled simulation, not observed reality")
    created_by = Column(String(100), nullable=False, default="system")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    station = relationship("Station", back_populates="scenarios")
    model = relationship("ModelRegistry", back_populates="scenarios")
    results = relationship("ScenarioResult", back_populates="scenario", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Scenario(id='{self.scenario_id}', name='{self.scenario_name}', status='{self.simulation_status}')>"


class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    scenario_id = Column(String(64), ForeignKey("scenarios.scenario_id", ondelete="CASCADE"), nullable=False, index=True)
    station_id = Column(Integer, ForeignKey("stations.station_id", ondelete="CASCADE"), nullable=False, index=True)
    baseline_time_utc = Column(DateTime(timezone=True), nullable=True, index=True, comment="Historical baseline reference hour (UTC)")
    target_time_utc = Column(DateTime(timezone=True), nullable=False, index=True, comment="Simulated hour (UTC)")
    
    baseline_pm25 = Column(Float, nullable=False, comment="Unmodified baseline forecasted PM2.5 (µg/m³)")
    scenario_pm25 = Column(Float, nullable=False, comment="Simulated PM2.5 with policy intervention (µg/m³)")
    delta_pm25 = Column(Float, nullable=False, comment="Absolute change (scenario - baseline) in µg/m³")
    pct_change = Column(Float, nullable=False, comment="Relative percentage change (%)")
    metadata_json = Column(Text, nullable=True, comment="Structured JSON audit and execution metadata")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    scenario = relationship("Scenario", back_populates="results")
    station = relationship("Station")

    __table_args__ = (
        Index("ix_scen_res_scenario_time", "scenario_id", "target_time_utc"),
        Index("ix_scen_res_station_time", "station_id", "target_time_utc"),
    )

    def __repr__(self) -> str:
        return f"<ScenarioResult(scenario='{self.scenario_id}', station={self.station_id}, delta={self.delta_pm25:.2f}µg/m³)>"
