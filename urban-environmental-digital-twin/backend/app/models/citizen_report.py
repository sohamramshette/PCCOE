"""
Urban Environmental Digital Twin - Citizen Pollution Incident Report Entity
=============================================================================
Stores community-reported pollution incidents (smoke, burning, dust, industrial plumes)
with incident coordinates, observation timestamps, optional photo attachments,
and unique reference tracking.
"""

from sqlalchemy import (
    Column, Integer, BigInteger, Float, String, DateTime,
    Text, func
)
from backend.app.database.session import Base


class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    report_reference = Column(String(32), unique=True, nullable=False, index=True, comment="Unique public tracking reference, e.g. AIR-20261011-A8F2")
    category = Column(String(50), nullable=False, index=True, comment="Reported category (e.g. SMOKE_EMISSIONS, OPEN_BURNING, CONSTRUCTION_DUST, INDUSTRIAL_EMISSIONS, UNUSUAL_ODOUR, OTHER)")
    description = Column(Text, nullable=False, comment="Detailed observation description")
    location_name = Column(String(255), nullable=False, comment="Locality or address name in Pune/PCMC")
    latitude = Column(Float, nullable=True, comment="Incident latitude")
    longitude = Column(Float, nullable=True, comment="Incident longitude")
    nearest_station_id = Column(Integer, nullable=True, comment="Closest CAAQMS monitoring station ID if available")
    observed_at = Column(DateTime(timezone=True), nullable=False, comment="User-reported observation timestamp")
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, comment="System submission timestamp")
    status = Column(String(30), default="SUBMITTED", nullable=False, index=True, comment="Lifecycle status: SUBMITTED, UNDER_REVIEW, RESOLVED")
    
    # Optional image attachment metadata
    attachment_filename = Column(String(255), nullable=True, comment="Sanitized original filename")
    attachment_path = Column(String(512), nullable=True, comment="Relative server storage path")
    attachment_mime = Column(String(100), nullable=True, comment="MIME type (image/jpeg, image/png, image/webp)")
    attachment_size_bytes = Column(Integer, nullable=True, comment="File size in bytes")
    
    # Ownership and device tracking for demo/citizen sessions
    client_device_token = Column(String(64), nullable=True, index=True, comment="Device identifier token for resident retrieval")
    user_id = Column(Integer, nullable=True, comment="Authenticated user ID if logged in")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
