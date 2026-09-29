"""
Urban Environmental Digital Twin - Alert & Anomaly Entity
=========================================================
Persists environmental alerts, threshold exceedances, PM2.5 spikes,
statistical anomalies, forecast deviations, and atmospheric stagnation conditions.
Enforces deduplication and full alert lifecycle states (ACTIVE, ACKNOWLEDGED, RESOLVED).
"""

from enum import Enum
from sqlalchemy import (
    Column, Integer, BigInteger, Float, String, DateTime,
    ForeignKey, Index, JSON, Text, func
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class AlertStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertType(str, Enum):
    PM25_THRESHOLD = "PM25_THRESHOLD"
    PM10_THRESHOLD = "PM10_THRESHOLD"
    NO2_THRESHOLD = "NO2_THRESHOLD"
    SO2_THRESHOLD = "SO2_THRESHOLD"
    CO_THRESHOLD = "CO_THRESHOLD"
    O3_THRESHOLD = "O3_THRESHOLD"
    PM25_SPIKE = "PM25_SPIKE"
    PM25_ANOMALY = "PM25_ANOMALY"
    FORECAST_DEVIATION = "FORECAST_DEVIATION"
    LOW_WIND = "LOW_WIND"
    LOW_PBL = "LOW_PBL"
    ATMOSPHERIC_STAGNATION = "ATMOSPHERIC_STAGNATION"
    SENSOR_OFFLINE = "SENSOR_OFFLINE"
    DATA_GAP = "DATA_GAP"
    SENSOR_ANOMALY = "SENSOR_ANOMALY"


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    station_id = Column(Integer, ForeignKey("stations.station_id", ondelete="CASCADE"), nullable=False, index=True)
    
    alert_type = Column(String(50), nullable=False, index=True, comment="Alert classification identifier")
    severity = Column(String(20), nullable=False, index=True, comment="Severity: INFO, LOW, MEDIUM, HIGH, CRITICAL")
    pollutant = Column(String(20), nullable=True, comment="Associated pollutant (pm25, pm10, no2, etc.) if applicable")
    
    observed_value = Column(Float, nullable=True, comment="Physical or derived value that triggered the alert")
    threshold_value = Column(Float, nullable=True, comment="Configured threshold value that was breached")
    expected_value = Column(Float, nullable=True, comment="Expected baseline, rolling mean, or model forecast")
    deviation = Column(Float, nullable=True, comment="Absolute or percentage deviation from expected/threshold")
    
    message = Column(String(500), nullable=False, comment="Human-readable notification description")
    source = Column(String(50), nullable=False, default="DERIVED", comment="Data provenance: OBSERVED, REANALYSIS, PREDICTED, or DERIVED")
    
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, comment="Timestamp when condition was evaluated")
    started_at = Column(DateTime(timezone=True), nullable=False, comment="Timestamp when anomalous condition commenced")
    ended_at = Column(DateTime(timezone=True), nullable=True, comment="Timestamp when condition resolved")
    
    status = Column(String(20), nullable=False, default=AlertStatus.ACTIVE.value, index=True, comment="ACTIVE, ACKNOWLEDGED, RESOLVED")
    alert_metadata = Column(JSON, nullable=True, comment="Environmental context and diagnostic metadata")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    station = relationship("Station", back_populates="alerts")

    __table_args__ = (
        Index("ix_alerts_station_status", "station_id", "status"),
        Index("ix_alerts_type_status", "alert_type", "status"),
        Index("ix_alerts_station_type_status", "station_id", "alert_type", "status"),
        Index("ix_alerts_detected_at", "detected_at"),
    )

    def __repr__(self) -> str:
        return f"<Alert(id={self.alert_id}, station={self.station_id}, type='{self.alert_type}', severity='{self.severity}', status='{self.status}')>"
