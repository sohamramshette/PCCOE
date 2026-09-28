"""Add source/location-keyed Open-Meteo hourly weather records.

Revision ID: 0003_open_meteo_weather
Revises: 0002_scenario_baseline_and_metadata
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_open_meteo_weather"
down_revision: Union[str, None] = "0002_scenario_baseline_and_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weather_hourly_observations",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer(), "sqlite"),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("datetime_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_utc", sa.Date(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("grid_latitude", sa.Float(), nullable=False),
        sa.Column("grid_longitude", sa.Float(), nullable=False),
        sa.Column("source", sa.String(length=128), nullable=False),
        sa.Column("location_name", sa.String(length=150), nullable=False),
        sa.Column("temperature_2m", sa.Float(), nullable=True),
        sa.Column("dew_point_2m", sa.Float(), nullable=True),
        sa.Column("relative_humidity_2m", sa.Float(), nullable=True),
        sa.Column("apparent_temperature", sa.Float(), nullable=True),
        sa.Column("surface_pressure", sa.Float(), nullable=True),
        sa.Column("cloud_cover", sa.Float(), nullable=True),
        sa.Column("precipitation", sa.Float(), nullable=True),
        sa.Column("wind_speed_10m", sa.Float(), nullable=True),
        sa.Column("evapotranspiration", sa.Float(), nullable=True),
        sa.Column("wind_gusts_10m", sa.Float(), nullable=True),
        sa.Column("wind_direction_10m", sa.Float(), nullable=True),
        sa.Column("source_response_sha256", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source",
            "location_name",
            "datetime_utc",
            name="uq_weather_hourly_source_location_timestamp",
        ),
    )
    op.create_index(
        "ix_weather_hourly_datetime",
        "weather_hourly_observations",
        ["datetime_utc"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_weather_hourly_datetime", table_name="weather_hourly_observations")
    op.drop_table("weather_hourly_observations")
