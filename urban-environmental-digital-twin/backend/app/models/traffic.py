"""
Urban Environmental Digital Twin - Diurnal Traffic Proxy Entity
================================================================
Stores the 24-hour empirical diurnal traffic mobility profile calibrated to
Pune Comprehensive Mobility Plan (CMP) and IITM urban traffic surveys.
Clearly labeled as a PROXY to distinguish from continuous physical induction-loop counters.
"""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, UniqueConstraint, func
from backend.app.database.session import Base


class TrafficProxy(Base):
    __tablename__ = "traffic_proxy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    hour_of_day = Column(Integer, nullable=False, comment="Hour of day in Local Indian Standard Time (0 to 23)")
    is_weekend = Column(Boolean, nullable=False, comment="True for Saturday/Sunday, False for Weekday")
    traffic_proxy_index = Column(Float, nullable=False, comment="Normalized traffic intensity factor [0.0, 1.0]")
    traffic_intensity_category = Column(String(50), nullable=False, comment="Regime: NIGHT_BASE, MORNING_RUSH, MIDDAY_PLATEAU, EVENING_RUSH, LATE_EVENING")
    data_provenance = Column(
        String(150),
        nullable=False,
        default="TRAFFIC_PROXY (Pune CMP & IITM Empirical Mobility Survey)",
        comment="Source classification"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("hour_of_day", "is_weekend", name="uq_traffic_proxy_hour_weekend"),
    )

    def __repr__(self) -> str:
        day_type = "Weekend" if self.is_weekend else "Weekday"
        return f"<TrafficProxy(hour={self.hour_of_day:02d}:00, {day_type}, index={self.traffic_proxy_index:.3f})>"
