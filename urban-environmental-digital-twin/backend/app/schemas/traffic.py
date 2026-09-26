"""
Pydantic schemas for TrafficProxy entity.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TrafficProxyRead(BaseModel):
    id: int
    hour_of_day: int
    is_weekend: bool
    traffic_proxy_index: float
    traffic_intensity_category: str
    data_provenance: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
