"""
Urban Environmental Digital Twin - Weather Reanalysis Entity
============================================================
Stores hourly meteorological and atmospheric dispersion variables derived from
ECMWF ERA5-Land high-resolution reanalysis via Open-Meteo API.
Explicitly labeled as REANALYSIS to distinguish from in-situ sensor measurements.
"""

from sqlalchemy import (
    Column, Integer, BigInteger, Float, String, DateTime,
    ForeignKey, UniqueConstraint, Index, func
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class WeatherReanalysis(Base):
    __tablename__ = "weather_reanalysis"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    station_id = Column(Integer, ForeignKey("stations.station_id", ondelete="CASCADE"), nullable=False, index=True)
    datetime_utc = Column(DateTime(timezone=True), nullable=False, index=True, comment="Observation timestamp (UTC)")
    
    # Atmospheric State & Surface Meteorology
    temp_c = Column(Float, nullable=False, comment="2m Air temperature (°C)")
    humidity_pct = Column(Float, nullable=False, comment="2m Relative humidity (%)")
    dew_point_c = Column(Float, nullable=False, comment="2m Dew point temperature (°C)")
    precip_mm = Column(Float, nullable=False, comment="Total precipitation (mm)")
    rain_mm = Column(Float, nullable=False, comment="Liquid rain (mm)")
    pressure_hpa = Column(Float, nullable=False, comment="Surface atmospheric pressure (hPa)")
    wind_speed_ms = Column(Float, nullable=False, comment="10m Wind speed (m/s)")
    wind_dir_deg = Column(Float, nullable=False, comment="10m Wind direction (degrees from True North)")
    solar_rad_wm2 = Column(Float, nullable=False, comment="Global horizontal solar irradiation (W/m²)")
    cloud_cover_pct = Column(Float, nullable=False, comment="Total cloud cover (%)")
    pbl_height_m = Column(Float, nullable=False, comment="Planetary boundary layer height (m)")
    
    # Reanalysis Grid Metadata
    grid_latitude = Column(Float, nullable=False, comment="ERA5-Land grid centroid latitude")
    grid_longitude = Column(Float, nullable=False, comment="ERA5-Land grid centroid longitude")
    elevation_m = Column(Float, nullable=False, comment="ERA5-Land surface geopotential elevation (m)")
    
    data_provenance = Column(String(100), nullable=False, default="REANALYSIS (ECMWF ERA5-Land via Open-Meteo)", comment="Data classification")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    station = relationship("Station", back_populates="weather_records")

    __table_args__ = (
        UniqueConstraint("station_id", "datetime_utc", name="uq_weather_station_datetime"),
        Index("ix_weather_station_datetime", "station_id", "datetime_utc"),
    )

    def __repr__(self) -> str:
        return f"<WeatherReanalysis(station={self.station_id}, utc='{self.datetime_utc}', temp={self.temp_c}°C, pbl={self.pbl_height_m}m)>"
