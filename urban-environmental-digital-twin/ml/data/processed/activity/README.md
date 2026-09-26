# Processed Station Urban Activity, Industrial, and Land-Use Features

## Overview
This directory contains spatial activity exposure features derived from OpenStreetMap vector geometries around the 6 core Pune OpenAQ air quality monitoring stations.

## Primary Artifact
* **File:** `station_activity_features.csv`
* **Format:** Comma-Separated Values (CSV)
* **Row Count:** 6 stations
* **Column Count:** 23 features

---

## Feature Definitions & Provenance Classifications

| Column Name | Description | Units | Data Classification |
|---|---|---|---|
| `station_id` | OpenAQ Unique Location ID | Integer / String | Metadata |
| `station_name` | Official monitoring station name | Text | Metadata |
| `zone_type` | Qualitative urban morphology classification | Text | Qualitative Descriptor |
| `latitude` | Station geographic latitude | Decimal Degrees (WGS84) | Coordinate |
| `longitude` | Station geographic longitude | Decimal Degrees (WGS84) | Coordinate |
| `industrial_elements_2km` | Count of industrial polygons/nodes within 2,000m buffer | Count | `INDUSTRIAL_PROXY` |
| `dist_nearest_industrial_m` | Great-circle distance to nearest industrial facility | Meters | `INDUSTRIAL_PROXY` |
| `has_industrial_within_1km` | Binary indicator: 1 if industrial element <= 1,000m else 0 | Binary (0/1) | `INDUSTRIAL_PROXY` |
| `construction_elements_1_5km` | Count of construction / infrastructure work elements within 1,500m buffer | Count | `CONSTRUCTION_PROXY` |
| `dist_nearest_construction_m` | Great-circle distance to nearest documented construction element | Meters | `CONSTRUCTION_PROXY` |
| `has_construction_within_1km` | Binary indicator: 1 if construction element <= 1,000m else 0 | Binary (0/1) | `CONSTRUCTION_PROXY` |
| `poi_total_count_1_5km` | Total count of commercial, institutional, and transit POIs within 1,500m buffer | Count | `ACTIVITY_PROXY` |
| `poi_density_per_km2` | POI spatial density per km² ($Count / 7.0686\text{ km}^2$) | POIs / km² | `ACTIVITY_PROXY` |
| `poi_commercial_count` | Count of shops, restaurants, markets, and offices | Count | `ACTIVITY_PROXY` |
| `poi_institutional_count` | Count of schools, colleges, universities, and hospitals | Count | `ACTIVITY_PROXY` |
| `poi_transit_count` | Count of bus stations, depots, and fuel stations | Count | `ACTIVITY_PROXY` |
| `landuse_elements_total` | Total land-use polygons mapped within 1,500m | Count | `STATIC_LAND_USE` |
| `landuse_residential_count` | Count of residential land-use zones | Count | `STATIC_LAND_USE` |
| `landuse_commercial_count` | Count of commercial and retail zones | Count | `STATIC_LAND_USE` |
| `landuse_industrial_count` | Count of industrial zoning footprints | Count | `STATIC_LAND_USE` |
| `landuse_green_count` | Count of parks, forests, grasslands, and gardens | Count | `STATIC_LAND_USE` |
| `dominant_landuse` | Most frequent land-use class in buffer | Text | `STATIC_LAND_USE` |
| `data_classification` | Strict project provenance label | Text | Project Standards |

---

## Critical Truthfulness Rules
1. **No Artificial Time Series:** These features are static spatial representations. They must NOT be represented as time-varying daily or hourly emissions.
2. **Proximity != Direct Emission:** Proximity to an industrial zone or construction site does not guarantee active emissions at any given hour; it serves as a spatial exposure predictor for downstream ML modeling.
