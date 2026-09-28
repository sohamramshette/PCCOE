"""Hourly weather observations from source/location-based weather feeds."""

from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)

from backend.app.database.session import Base


class WeatherHourlyObservation(Base):
    __tablename__ = "weather_hourly_observations"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    datetime_utc = Column(DateTime(timezone=True), nullable=False)
    date_utc = Column(Date, nullable=False)
    latitude = Column(Float, nullable=False, comment="Requested WGS-84 latitude")
    longitude = Column(Float, nullable=False, comment="Requested WGS-84 longitude")
    grid_latitude = Column(Float, nullable=False, comment="Open-Meteo resolved grid latitude")
    grid_longitude = Column(Float, nullable=False, comment="Open-Meteo resolved grid longitude")
    source = Column(String(128), nullable=False, comment="Weather data provider and endpoint")
    location_name = Column(String(150), nullable=False)

    temperature_2m = Column(Float, nullable=True)
    dew_point_2m = Column(Float, nullable=True)
    relative_humidity_2m = Column(Float, nullable=True)
    apparent_temperature = Column(Float, nullable=True)
    surface_pressure = Column(Float, nullable=True)
    cloud_cover = Column(Float, nullable=True)
    precipitation = Column(Float, nullable=True)
    wind_speed_10m = Column(Float, nullable=True)
    evapotranspiration = Column(Float, nullable=True)
    wind_gusts_10m = Column(Float, nullable=True)
    wind_direction_10m = Column(Float, nullable=True)

    source_response_sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "source",
            "location_name",
            "datetime_utc",
            name="uq_weather_hourly_source_location_timestamp",
        ),
        Index("ix_weather_hourly_datetime", "datetime_utc"),
    )
