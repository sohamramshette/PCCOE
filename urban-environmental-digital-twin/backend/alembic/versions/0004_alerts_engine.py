"""Add Environmental Alerts and Anomaly Engine table.

Revision ID: 0004_alerts_engine
Revises: 0003_open_meteo_weather
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_alerts_engine"
down_revision: Union[str, None] = "0003_open_meteo_weather"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alerts",
        sa.Column(
            "alert_id",
            sa.BigInteger().with_variant(sa.Integer(), "sqlite"),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("station_id", sa.Integer(), nullable=False),
        sa.Column("alert_type", sa.String(length=50), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("pollutant", sa.String(length=20), nullable=True),
        sa.Column("observed_value", sa.Float(), nullable=True),
        sa.Column("threshold_value", sa.Float(), nullable=True),
        sa.Column("expected_value", sa.Float(), nullable=True),
        sa.Column("deviation", sa.Float(), nullable=True),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("source", sa.String(length=50), server_default="DERIVED", nullable=False),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="ACTIVE", nullable=False),
        sa.Column("alert_metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["station_id"],
            ["stations.station_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("alert_id"),
    )
    op.create_index("ix_alerts_station_id", "alerts", ["station_id"], unique=False)
    op.create_index("ix_alerts_alert_type", "alerts", ["alert_type"], unique=False)
    op.create_index("ix_alerts_severity", "alerts", ["severity"], unique=False)
    op.create_index("ix_alerts_status", "alerts", ["status"], unique=False)
    op.create_index("ix_alerts_station_status", "alerts", ["station_id", "status"], unique=False)
    op.create_index("ix_alerts_type_status", "alerts", ["alert_type", "status"], unique=False)
    op.create_index(
        "ix_alerts_station_type_status",
        "alerts",
        ["station_id", "alert_type", "status"],
        unique=False,
    )
    op.create_index("ix_alerts_detected_at", "alerts", ["detected_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_alerts_detected_at", table_name="alerts")
    op.drop_index("ix_alerts_station_type_status", table_name="alerts")
    op.drop_index("ix_alerts_type_status", table_name="alerts")
    op.drop_index("ix_alerts_station_status", table_name="alerts")
    op.drop_index("ix_alerts_status", table_name="alerts")
    op.drop_index("ix_alerts_severity", table_name="alerts")
    op.drop_index("ix_alerts_alert_type", table_name="alerts")
    op.drop_index("ix_alerts_station_id", table_name="alerts")
    op.drop_table("alerts")
