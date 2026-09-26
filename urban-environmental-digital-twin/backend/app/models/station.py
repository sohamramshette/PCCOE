"""
Urban Environmental Digital Twin - Monitoring Station Entity
============================================================
Represents physical continuous ambient air quality monitoring stations (CAAQMN/SAFAR).
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class Station(Base):
    __tablename__ = "stations"

    station_id = Column(Integer, primary_key=True, index=True, autoincrement=False, comment="OpenAQ location identifier")
    station_name = Column(String(150), nullable=False, comment="Official station designation")
    zone_type = Column(String(100), nullable=False, comment="Urban zone / micro-climate characterization")
    latitude = Column(Float, nullable=False, comment="Latitude in WGS-84 decimal degrees")
    longitude = Column(Float, nullable=False, comment="Longitude in WGS-84 decimal degrees")
    elevation_m = Column(Float, nullable=True, comment="Ground elevation above sea level (meters)")
    city = Column(String(50), nullable=False, default="Pune", comment="Municipality: Pune (PMC) or Pimpri-Chinchwad (PCMC)")
    monitoring_authority = Column(String(100), nullable=False, comment="Operating agency: IITM SAFAR, CPCB, or MPCB")
    is_active = Column(Boolean, default=True, nullable=False, comment="Operational status flag")
    data_provenance = Column(String(150), nullable=False, default="OpenAQ API v3 / CPCB CAAQMN", comment="Source provenance")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # ORM Relationships
    observations = relationship("EnvironmentalObservation", back_populates="station", cascade="all, delete-orphan")
    weather_records = relationship("WeatherReanalysis", back_populates="station", cascade="all, delete-orphan")
    traffic_exposure = relationship("StationTrafficExposure", back_populates="station", uselist=False, cascade="all, delete-orphan")
    activity_exposure = relationship("StationActivityExposure", back_populates="station", uselist=False, cascade="all, delete-orphan")
    predictions = relationship("ModelPrediction", back_populates="station", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="station")

    def __repr__(self) -> str:
        return f"<Station(id={self.station_id}, name='{self.station_name}', zone='{self.zone_type}')>"
