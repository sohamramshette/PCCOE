"""
Urban Environmental Digital Twin - Environmental Observations Entity
=====================================================================
Stores physical hourly ground-truth air quality observations from monitoring stations.
Missing observations are preserved strictly as NULL (never fabricated).
"""

from sqlalchemy import (
    Column, Integer, BigInteger, Float, String, DateTime,
    ForeignKey, UniqueConstraint, Index, func
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class EnvironmentalObservation(Base):
    __tablename__ = "environmental_observations"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    station_id = Column(Integer, ForeignKey("stations.station_id", ondelete="CASCADE"), nullable=False, index=True)
    datetime_utc = Column(DateTime(timezone=True), nullable=False, index=True, comment="Observation timestamp (UTC)")
    datetime_local_ist = Column(DateTime(timezone=False), nullable=False, comment="Local Indian Standard Time (UTC+05:30)")
    
    # Ground Truth Air Quality Pollutants (µg/m³)
    pm25 = Column(Float, nullable=True, comment="Observed ambient PM2.5 concentration (µg/m³)")
    pm25_obs_count = Column(Integer, nullable=True, comment="Number of sub-hourly raw readings aggregated into hour")
    pm25_completeness_flag = Column(String(20), nullable=False, default="MISSING", comment="Regulatory completeness: FULL, PARTIAL, INSUFFICIENT, MISSING")
    
    pm10 = Column(Float, nullable=True, comment="Observed ambient PM10 concentration (µg/m³; populated primarily at Station 11613)")
    pm10_obs_count = Column(Integer, nullable=True)
    no2 = Column(Float, nullable=True, comment="Observed Nitrogen Dioxide concentration (µg/m³; populated primarily at Station 11613)")
    no2_obs_count = Column(Integer, nullable=True)
    so2 = Column(Float, nullable=True, comment="Observed Sulfur Dioxide concentration (µg/m³)")
    co = Column(Float, nullable=True, comment="Observed Carbon Monoxide concentration (mg/m³)")
    o3 = Column(Float, nullable=True, comment="Observed Ozone concentration (µg/m³)")
    
    # In-situ Co-located Meteorological Sensors (where available)
    temp_insitu_c = Column(Float, nullable=True, comment="In-situ physical sensor temperature (°C)")
    humidity_insitu_pct = Column(Float, nullable=True, comment="In-situ physical sensor relative humidity (%)")
    wind_speed_insitu_ms = Column(Float, nullable=True, comment="In-situ physical anemometer wind speed (m/s)")
    
    data_provenance = Column(String(50), nullable=False, default="OBSERVED", comment="Classification flag: OBSERVED ground truth")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    station = relationship("Station", back_populates="observations")

    __table_args__ = (
        UniqueConstraint("station_id", "datetime_utc", name="uq_env_obs_station_datetime"),
        Index("ix_env_obs_station_datetime", "station_id", "datetime_utc"),
    )

    def __repr__(self) -> str:
        return f"<EnvironmentalObservation(station={self.station_id}, utc='{self.datetime_utc}', pm25={self.pm25})>"
