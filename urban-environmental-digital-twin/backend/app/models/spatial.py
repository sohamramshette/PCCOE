"""
Urban Environmental Digital Twin - Static Spatial Infrastructure Entities
==========================================================================
Stores station-level spatial exposures computed from OpenStreetMap Overpass:
  - Road network and highway proximity metrics (traffic exposure)
  - Industrial facilities, construction activity, POIs, and land-use zoning
"""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.app.database.session import Base


class StationTrafficExposure(Base):
    __tablename__ = "station_traffic_exposure"

    station_id = Column(Integer, ForeignKey("stations.station_id", ondelete="CASCADE"), primary_key=True, index=True)
    buffer_radius_m = Column(Float, nullable=False, default=1500.0, comment="Spatial buffer radius (meters)")
    buffer_area_km2 = Column(Float, nullable=False, comment="Spatial buffer area (km²)")
    total_road_segments = Column(Integer, nullable=False, comment="Count of distinct road segments within buffer")
    total_road_length_km = Column(Float, nullable=False, comment="Sum of all road lengths within buffer (km)")
    major_road_length_km = Column(Float, nullable=False, comment="Length of motorways, trunks, and primary arterials (km)")
    local_road_length_km = Column(Float, nullable=False, comment="Length of residential and tertiary streets (km)")
    major_road_density_km_per_km2 = Column(Float, nullable=False, comment="Major road density (km/km²)")
    total_road_density_km_per_km2 = Column(Float, nullable=False, comment="Total road density (km/km²)")
    distance_to_nearest_major_road_m = Column(Float, nullable=False, comment="Euclidean distance to closest arterial corridor (meters)")
    nearest_major_road_name = Column(String(150), nullable=True, comment="Name of nearest highway or arterial")
    nearest_major_road_class = Column(String(50), nullable=True, comment="OSM highway classification")
    data_provenance = Column(String(100), nullable=False, default="STATIC_ROAD_NETWORK (OSM Overpass)", comment="Source classification")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    station = relationship("Station", back_populates="traffic_exposure")

    def __repr__(self) -> str:
        return f"<StationTrafficExposure(station={self.station_id}, total_km={self.total_road_length_km:.2f}, major_km={self.major_road_length_km:.2f})>"


class StationActivityExposure(Base):
    __tablename__ = "station_activity_exposure"

    station_id = Column(Integer, ForeignKey("stations.station_id", ondelete="CASCADE"), primary_key=True, index=True)
    industrial_elements_2km = Column(Integer, nullable=False, comment="Count of industrial units within 2km buffer")
    dist_nearest_industrial_m = Column(Float, nullable=False, comment="Distance to closest industrial facility (meters)")
    has_industrial_within_1km = Column(Boolean, nullable=False, comment="Binary flag indicating industrial activity <= 1km")
    
    construction_elements_1_5km = Column(Integer, nullable=False, comment="Count of civil/metro construction sites within 1.5km")
    dist_nearest_construction_m = Column(Float, nullable=False, comment="Distance to nearest active construction site (meters)")
    has_construction_within_1km = Column(Boolean, nullable=False, comment="Binary flag indicating construction <= 1km")
    
    poi_total_count_1_5km = Column(Integer, nullable=False, comment="Total points of interest within 1.5km")
    poi_density_per_km2 = Column(Float, nullable=False, comment="Density of human activity hubs (POIs/km²)")
    poi_commercial_count = Column(Integer, nullable=False, comment="Count of commercial shops, markets, restaurants")
    poi_institutional_count = Column(Integer, nullable=False, comment="Count of schools, hospitals, civic buildings")
    poi_transit_count = Column(Integer, nullable=False, comment="Count of bus stations, rail halts, metro stations")
    
    landuse_elements_total = Column(Integer, nullable=False, comment="Total mapped land-use polygons")
    landuse_residential_count = Column(Integer, nullable=False, comment="Count of residential polygons")
    landuse_commercial_count = Column(Integer, nullable=False, comment="Count of commercial polygons")
    landuse_industrial_count = Column(Integer, nullable=False, comment="Count of industrial zoning polygons")
    landuse_green_count = Column(Integer, nullable=False, comment="Count of park, grass, and green space polygons")
    dominant_landuse = Column(String(50), nullable=False, comment="Dominant land-use category")
    
    data_provenance = Column(String(100), nullable=False, default="STATIC_LAND_USE / ACTIVITY_PROXY (OSM Overpass)", comment="Source classification")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    station = relationship("Station", back_populates="activity_exposure")

    def __repr__(self) -> str:
        return f"<StationActivityExposure(station={self.station_id}, dominant='{self.dominant_landuse}', poi_density={self.poi_density_per_km2:.1f})>"
