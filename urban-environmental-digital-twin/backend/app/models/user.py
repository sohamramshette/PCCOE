"""
User SQLAlchemy ORM Model
=========================
Stores registered user accounts with role-based access control (CITIZEN vs AUTHORITY).
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from backend.app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(50), nullable=False, default="CITIZEN", index=True)  # "CITIZEN" | "AUTHORITY"
    organization = Column(String(150), nullable=True)  # e.g., "PCMC Environment Dept", "Resident"
    phone = Column(String(30), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
