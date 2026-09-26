"""
Urban Environmental Digital Twin - Common Pydantic Schemas
==========================================================
Defines generic pagination models, health response schemas, and structured error responses.
"""

from typing import Generic, List, TypeVar, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard generic wrapper for paginated collections."""
    total: int = Field(description="Total matching records across all pages")
    page: int = Field(description="Current 1-based page number")
    limit: int = Field(description="Number of records requested per page")
    offset: int = Field(description="Record offset from start")
    pages: int = Field(description="Total available pages")
    items: List[T] = Field(description="List of records for the current page")


class ErrorResponse(BaseModel):
    """Standardized JSON error contract."""
    detail: str = Field(description="Descriptive explanation of the error")
    code: str = Field(description="Machine-readable error classification code")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the error event"
    )


class HealthResponse(BaseModel):
    """System and persistence layer health status."""
    status: str = Field(description="Overall system status: ok or unhealthy")
    database: str = Field(description="Database connectivity status: connected or disconnected")
    service: str = Field(default="urban-environmental-digital-twin", description="Service identifier")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current server time (UTC)"
    )
    active_stations: Optional[int] = Field(default=None, description="Count of active monitoring stations")
    registered_models: Optional[int] = Field(default=None, description="Count of registered ML baseline models")
