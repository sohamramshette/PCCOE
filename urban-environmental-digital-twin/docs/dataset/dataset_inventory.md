# Urban Environmental Digital Twin — Dataset Inventory

This document tracks all external and internal datasets evaluated, selected, or rejected for the **Urban Environmental Digital Twin** project.

Status legend:
- **Candidate:** Discovered and under technical evaluation.
- **Selected:** Verified, downloaded, quality inspected, and approved for model training and simulation.
- **Rejected:** Evaluated but determined unsuitable for the MVP.

---

## 1. Inventory Summary

| Dataset ID | Category | Provider / Source | Geography | Type | Status | Primary Target / Features | Date Range |
| ---------- | -------- | ----------------- | --------- | ---- | :----: | ------------------------- | ---------- |
| `openaq_pune` | Pollution & Meteorology | OpenAQ (CPCB / MPCB / IITM SAFAR) | Pune & PCMC, Maharashtra | **Observed** | **Selected** | PM2.5, PM10, NO2, SO2, CO, O3, Temp, Humidity, Wind | Feb 2025 – Sep 2026 (Active) / Nov 2020 – Jul 2022 (Historical) |
| `openmeteo_pune_weather` | Meteorology | Open-Meteo / ECMWF (ERA5-Land) | Pune Metropolitan Area (7 locations) | **Reanalysis** | **Selected** | Temperature, Relative Humidity, Wind Speed, Wind Direction, Precipitation, Surface Pressure, Solar Radiation, PBL Height | Feb 2025 – Sep 2026 (14,016 contiguous hours) |
| `osm_pune_road_network` | Traffic & Infrastructure | OpenStreetMap (Overpass API) | 6 Core Pune Monitoring Station Buffers (1.5 km) | **Static Road Network** | **Selected** | Total road length, major road density, distance to nearest major highway corridor, road classifications | 2025–2026 Infrastructure Snapshot |
| `pune_traffic_proxy` | Traffic Activity | Empirical (Pune CMP / IITM SAFAR) | Pune Metropolitan Area | **Traffic Proxy** | **Selected** | Diurnal hourly traffic intensity index (0.0 to 1.0), rush hour multipliers, weekday vs weekend profiles | Hourly Diurnal Cycle (24 hrs) |
| `osm_pune_activity_industrial` | Industrial Activity | OpenStreetMap (Overpass API) | 6 Core Station Buffers (2 km) | **Static Industrial / Industrial Proxy** | **Selected** | Industrial facility locations, factory centroids, distance to nearest industrial cluster, count within 2 km | 2025–2026 Snapshot |
| `osm_pune_activity_construction` | Construction Activity | OpenStreetMap (Overpass API) | 6 Core Station Buffers (1.5 km) | **Construction Proxy** | **Selected** | Active civil construction sites, flyover/metro infrastructure works, distance to nearest construction | 2025–2026 Snapshot |
| `osm_pune_activity_landuse` | Land Use & Urban Fabric | OpenStreetMap (Overpass API) | 6 Core Station Buffers (1.5 km) | **Static Land Use** | **Selected** | Zoning element counts: residential, commercial, industrial, institutional, parks/green spaces | 2025–2026 Snapshot |
| `osm_pune_activity_poi` | Urban Human Activity | OpenStreetMap (Overpass API) | 6 Core Station Buffers (1.5 km) | **Activity Proxy** | **Selected** | Commercial, institutional, and transit points of interest counts and spatial density (POIs/km²) | 2025–2026 Snapshot |
| `master_hourly_dataset` | Integrated Analytical Dataset | PCCOE Multi-Domain Pipeline | 6 Core Pune Monitoring Stations | **Unified Multi-Domain** | **Selected** | Ground-truth PM2.5, Weather Reanalysis, Traffic Road & Diurnal Proxy, Urban Activity & Land-Use Proxies (70 cols) | Feb 18, 2025 – Sep 24, 2026 (84,096 station-hours) |
| `feature_dataset` | Model-Ready Feature Store | PCCOE Feature Engineering Pipeline | 6 Core Pune Monitoring Stations | **Derived / Model-Ready** | **Selected** | Target PM2.5 (t+1), wind vectors, ventilation index, station-wise lags, rolling stats, traffic interactions (118 cols) | Feb 18, 2025 – Sep 24, 2026 (84,096 station-hours) |
| `urban_digital_twin_db` | Application Persistence Layer | PostgreSQL 15+ / SQLAlchemy 2.0 / Alembic | 6 Core Stations / Pune Metro | **Relational Serving** | **Selected** | 10 normalized tables: stations, hourly observations, ERA5 reanalysis, spatial exposures, diurnal traffic, model registry, predictions, what-if scenarios | 84,096 obs, 84,096 weather, 80,892 preds, 4 models |
| `midc_mpcb_pune_industrial` | Industrial Activity | MIDC / MPCB Official Portals | Pune & PCMC Industrial Belts | **Static Industrial** | **Selected (Reference)** | Industrial estate boundaries, Red/Orange pollution category unit counts (>3,200 regional units) | Multi-year Statistics |
| `maharera_pune_projects` | Construction Activity | MahaRERA Registration Portal | Pune & PCMC Real Estate | **Observed (Admin)** | **Rejected (MVP)** | Project approvals, sanctioned built-up area (Rejected due to lack of open bulk API; CAPTCHA portal) | 2017 to present |
| `tomtom_pune_traffic` | Traffic | TomTom Traffic Stats (Enterprise) | Pune Urban | Probe / Observed | Rejected (MVP) | Segment speeds, congestion index | Requires commercial enterprise purchase |
| `copernicus_ghsl_built` | Built Environment | Copernicus Global Human Settlement (JRC) | Global 100m Raster | **Satellite-Derived Proxy** | Candidate (Future) | Built-up surface fraction (0–100%) | Multi-temporal Epochs |
| `era5_meteo_pune` | Meteorology | ECMWF ERA5-Land (Direct CDS) | Pune Grid | Modeled / Reanalysis | Candidate | Boundary layer height, solar radiation, precipitation | TBD |



---

## 2. Dataset Detailed Profiles

### 2.1 OpenAQ Air Quality & Atmospheric Dataset (Pune)
- **Dataset Identifier:** `openaq_pune`
- **Category:** Pollution & Meteorology
- **Provider:** OpenAQ Platform (`https://openaq.org`)
- **Upstream Origin:** Central Pollution Control Board (CPCB), Maharashtra Pollution Control Board (MPCB), Indian Institute of Tropical Meteorology (IITM SAFAR).
- **Access Protocol:** OpenAQ REST API v3 (`https://api.openaq.org/v3`) authenticated via API key.
- **Geography:** Pune Urban Area (`18.35°N` to `18.80°N`, `73.65°E` to `74.15°E`) spanning Pune Municipal Corporation (PMC) and Pimpri-Chinchwad Municipal Corporation (PCMC).
- **Data Classification:** **OBSERVED** (Direct physical continuous monitoring stations).
- **Status:** **Selected** (Passed data acquisition and inspection requirements).
- **Core Selected Stations:**
  - `11613`: Revenue Colony-Shivajinagar (Central Benchmark reference)
  - `60658`: Hadapsar (Eastern Corridor)
  - `3409526`: Panchawati Pashan (Western Fringe / Green Zone)
  - `3409438`: Katraj Dairy (Southern Highway Corridor)
  - `3409331`: Bhosari (Northern Industrial Corridor / PCMC)
  - `11609`: Mhada Colony (North-Eastern Corridor / Airport)
- **Parameters Acquired:**
  - Target Pollutants: PM2.5 (primary target), PM10, NO2, CO, O3, SO2.
  - Meteorological Co-variates: Temperature, Relative Humidity, Wind Speed, Wind Direction.
- **Temporal Bounds:**
  - Modern Synchronized Period: **February 18, 2025 to September 24, 2026** (~19 continuous months).
  - Historical Archive Period: November 2020 to July 2022 (plus 2016-2018 early CPCB).
- **Sampling Resolution:** 15-minute continuous (`raw` period).
- **Storage Location in Repository:** `ml/data/raw/pollution/openaq/`
- **Ingestion Script:** `ml/src/data/ingest_openaq.py`
- **Detailed Documentation:** [openaq_pune.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/openaq_pune.md)
- **Quality Inspection Report:** [openaq_pune_quality_report.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/openaq_pune_quality_report.md)
- **Station Inventory:** [openaq_pune_inventory.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/openaq_pune_inventory.md)

---

### 2.2 Open-Meteo Historical Weather Dataset (Pune)
- **Dataset Identifier:** `openmeteo_pune_weather`
- **Category:** Meteorology
- **Provider:** Open-Meteo GmbH (`https://open-meteo.com`)
- **Upstream Origin:** European Centre for Medium-Range Weather Forecasts (ECMWF) ERA5-Land (0.1° / ~10 km) and ERA5 (0.25° / ~28 km) Reanalysis.
- **Access Protocol:** Open-Meteo Historical Weather REST API (`https://archive-api.open-meteo.com/v1/archive`). Zero authentication/credentials required.
- **Geography:** Pune Metropolitan Area (`18.45°N` to `18.66°N`, `73.78°E` to `73.96°E`) covering 7 discrete locations (Central PMC Anchor + 6 OpenAQ monitoring stations: Shivajinagar, Mhada Colony, Hadapsar, Bhosari, Katraj Dairy, Pashan).
- **Data Classification:** **REANALYSIS** (Atmospheric numerical model assimilation).
- **Status:** **Selected** (Passed data acquisition and inspection requirements).
- **Parameters Acquired:**
  - Temperature at 2m (`temp_c`, °C)
  - Relative Humidity at 2m (`humidity_pct`, %)
  - Dew Point Temperature (`dew_point_c`, °C)
  - Total Precipitation (`precip_mm`, mm) & Liquid Rain (`rain_mm`, mm)
  - Surface Atmospheric Pressure (`pressure_hpa`, hPa)
  - Wind Speed at 10m (`wind_speed_ms`, m/s)
  - Wind Direction at 10m (`wind_dir_deg`, °)
  - Solar Radiation (`solar_rad_wm2`, W/m²)
  - Cloud Cover (`cloud_cover_pct`, %)
  - Planetary Boundary Layer Height (`pbl_height_m`, m)
- **Temporal Bounds:** **February 18, 2025 to September 24, 2026** (14,016 contiguous hours per location; 98,112 total rows). Exactly matches OpenAQ modern observation period.
- **Sampling Resolution:** Exactly 1 Hour (`:00Z`).
- **Storage Locations in Repository:**
  - Raw: `ml/data/raw/weather/openmeteo/` (`raw_weather_hourly.csv`, raw JSON in `observations/`, manifest in `metadata/`)
  - Processed: `ml/data/processed/weather/` (`weather_hourly_processed.csv`, standardized units and IST timestamps)
- **Ingestion Script:** `ml/src/data/ingest_weather.py`
- **Source Inventory & Evaluation:** [weather_source_inventory.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/weather_source_inventory.md)
- **Quality Inspection Report:** [weather_quality_report.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/weather_quality_report.md)
- **Known Limitations:**
  - Numerical model reanalysis rather than in-situ physical thermistor/anemometer readings.
  - ERA5-Land grid resolution is ~10 km; localized micro-canyon turbulence inside narrow street canyons is smoothed to regional boundary layer dynamics.

---

### 2.3 OpenStreetMap Pune Road Network Dataset
- **Dataset Identifier:** `osm_pune_road_network`
- **Category:** Traffic & Road Infrastructure
- **Provider:** OpenStreetMap Foundation (`https://www.openstreetmap.org`)
- **Access Protocol:** Overpass API (`https://overpass-api.de/api/interpreter`). Open access, zero credentials.
- **Geography:** 1,500m buffers surrounding the 6 core Pune OpenAQ monitoring stations (Shivajinagar, Mhada Colony, Hadapsar, Bhosari, Katraj Dairy, Pashan).
- **Data Classification:** **STATIC_ROAD_NETWORK** (Vector geometry and functional hierarchy).
- **Status:** **Selected** (Passed data acquisition and inspection requirements).
- **Parameters Acquired:**
  - Segment-level: `highway_class`, `name`, `length_meters`, `min_distance_to_station_m`, `lanes`, `oneway`, `maxspeed`, `surface`, `bridge`, `tunnel`.
  - Station-level derived: `total_road_length_km`, `major_road_length_km`, `major_road_density_km_per_km2`, `distance_to_nearest_major_road_m`.
- **Temporal Bounds:** Static infrastructure snapshot (2025–2026).
- **Spatial Resolution:** Exact vector road line segments (4,332 segments totaling 707.95 km across 6 stations).
- **Storage Locations in Repository:**
  - Raw: `ml/data/raw/traffic/osm/` (`raw_osm_ways.csv`, station JSON in `stations/`, manifest in `metadata/`)
  - Processed: `ml/data/processed/traffic/` (`station_road_features.csv`)
- **Ingestion Script:** `ml/src/data/ingest_traffic.py`
- **Source Inventory & Evaluation:** [traffic_source_inventory.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/traffic_source_inventory.md)
- **Quality Inspection Report:** [traffic_quality_report.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/traffic_quality_report.md)
- **Known Limitations:**
  - Static physical infrastructure representation; does not measure real-time vehicle flow, speeds, or congestion delays.

---

### 2.4 Empirical Pune Diurnal Traffic Intensity Index
- **Dataset Identifier:** `pune_traffic_proxy`
- **Category:** Traffic Proxy Activity
- **Provider / Reference:** Derived from Pune Comprehensive Mobility Plan (CMP) and IITM SAFAR urban vehicular emission inventories.
- **Data Classification:** **TRAFFIC_PROXY**
- **Status:** **Selected**
- **Parameters:**
  - `hour_of_day`: 0 to 23
  - `weekday_traffic_index`: Normalized hourly coefficient (0.0 to 1.0) with morning peak at 09:00 (1.00) and evening peak at 18:00 (0.98).
  - `weekend_traffic_index`: Normalized weekend coefficient with delayed morning peak at 11:00 (0.85) and prolonged evening recreational peak at 19:00 (0.96).
- **Storage Locations:**
  - Raw: `ml/data/raw/traffic/proxy/pune_diurnal_traffic_profile.csv`
  - Processed: `ml/data/processed/traffic/traffic_hourly_proxy.csv`
- **Known Limitations:**
  - Represents an empirical urban activity profile rather than physical road-sensor counts. Must remain explicitly classified as `TRAFFIC_PROXY`.

---

### 2.5 OpenStreetMap Pune Urban Activity, Industrial, Construction & Land-Use Extract
- **Dataset Identifiers:**
  - `osm_pune_activity_industrial` (`STATIC_INDUSTRIAL` / `INDUSTRIAL_PROXY`)
  - `osm_pune_activity_construction` (`CONSTRUCTION_PROXY`)
  - `osm_pune_activity_landuse` (`STATIC_LAND_USE`)
  - `osm_pune_activity_poi` (`ACTIVITY_PROXY`)
- **Category:** Urban Activity, Industrial & Built Environment
- **Provider:** OpenStreetMap Foundation via Overpass API (`https://overpass-api.de/api/interpreter`, `https://lz4.overpass-api.de/api/interpreter`).
- **Access Protocol:** Overpass QL REST API. Open access, zero API keys or credentials.
- **Geography:** 6 Core Pune Monitoring Station Buffers (2,000m for industrial; 1,500m for construction, land use, and POI).
- **Data Classification:** Strict multi-component classification:
  - Raw industrial coordinates: `STATIC_INDUSTRIAL`
  - Industrial counts & proximity: `INDUSTRIAL_PROXY`
  - Construction counts & proximity: `CONSTRUCTION_PROXY`
  - Land-use zoning polygons: `STATIC_LAND_USE`
  - POI counts & density: `ACTIVITY_PROXY`
- **Status:** **Selected** (Acquired, verified, and quality audited).
- **Parameters Acquired & Processed:**
  - Industrial (49 elements): `industrial_elements_2km`, `dist_nearest_industrial_m`, `has_industrial_within_1km`.
  - Construction (25 elements): `construction_elements_1_5km`, `dist_nearest_construction_m`, `has_construction_within_1km` (building, road flyovers, site development).
  - Land Use (405 elements): `landuse_elements_total`, `landuse_residential_count`, `landuse_commercial_count`, `landuse_industrial_count`, `landuse_green_count`, `dominant_landuse`.
  - POI & Activity (417 elements): `poi_total_count_1_5km`, `poi_density_per_km2`, `poi_commercial_count`, `poi_institutional_count`, `poi_transit_count`.
- **Temporal Bounds:** Contemporary infrastructure and zoning snapshot (2025–2026).
- **Storage Locations in Repository:**
  - Raw: `ml/data/raw/activity/`
    - `industrial/raw_industrial_elements.csv`
    - `construction/raw_construction_elements.csv`
    - `landuse/raw_landuse_elements.csv`
    - `poi/raw_poi_elements.csv`
    - `metadata/activity_manifest.json`
    - Station raw caches: `activity_station_<id>.json`
  - Processed: `ml/data/processed/activity/`
    - `station_activity_features.csv`
    - `activity_summary_metrics.json`
    - `README.md`
- **Ingestion Script:** `ml/src/data/ingest_activity.py`
- **Source Inventory & Evaluation:** [activity_source_inventory.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/activity_source_inventory.md)
- **Quality Inspection Report:** [activity_quality_report.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/activity_quality_report.md)
- **Known Limitations:**
  - Spatial features represent static infrastructure exposure proxies. They must not be treated as dynamic, real-time measurements of industrial stack emissions or daily construction dust.

---

### 2.6 Master Hourly Analytical Dataset
- **Dataset Identifier:** `master_hourly_dataset`
- **Category:** Unified Multi-Domain Feature Store
- **Provider:** PCCOE Multi-Domain Data Integration Pipeline
- **Analytical Grain:** `ONE ROW = ONE MONITORING STATION × ONE HOUR`
- **Primary Key:** `(station_id, datetime_utc)`
- **Data Classification:** Multi-Domain Harmonized:
  - Pollution: `OBSERVED`
  - Meteorology: `REANALYSIS`
  - Traffic Network: `STATIC_ROAD_NETWORK`
  - Traffic Congestion: `TRAFFIC_PROXY`
  - Industrial & Activity: `STATIC_LAND_USE / PROXY`
- **Status:** **Selected** (Fully integrated, validated, and audited).
- **Core Selected Stations (6):**
  - `11613`: Revenue Colony-Shivajinagar
  - `11609`: Mhada Colony
  - `60658`: Hadapsar
  - `3409331`: Bhosari (PCMC)
  - `3409438`: Katraj Dairy
  - `3409526`: Panchawati Pashan
- **Temporal Bounds:** February 18, 2025 `00:00:00Z` to September 24, 2026 `23:00:00Z` (14,016 contiguous hours per station; 84,096 total rows).
- **Total Columns:** 70 features across spatial keys, calendrical indicators, observed pollutants, in-situ meteorology, reanalysis weather, road network metrics, diurnal traffic proxy, and urban activity proxies.
- **Storage Locations in Repository:**
  - Primary CSV: `ml/data/processed/integration/master_hourly_dataset.csv`
  - Summary Metrics: `ml/data/processed/integration/integration_metrics.json`
  - Documentation: `ml/data/processed/integration/README.md`
- **Generation Script:** `ml/src/data/build_master_dataset.py`
- **Integration Schema Specification:** [integration_schema.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/integration_schema.md)
- **Integration Quality Report:** [integration_quality_report.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/dataset/integration_quality_report.md)
- **Known Limitations:**
  - 25.1% of station-hours lack ground-truth observed PM2.5 due to upstream station maintenance or network outages (preserved as NaN with `pm25_completeness_flag = 'MISSING'`).
  - Road network and urban activity metrics are static contemporary representations.

---

### 2.7 Model-Ready Feature Store & Partitions
- **Dataset Identifier:** `feature_dataset`
- **Category:** Machine-Learning-Ready Feature Store
- **Provider:** PCCOE Feature Engineering Pipeline
- **Analytical Grain:** `ONE ROW = ONE MONITORING STATION × ONE HOUR`
- **Primary Key:** `(station_id, datetime_utc)`
- **Data Classification:** Derived / Model-Ready (Preserves underlying source provenance flags).
- **Status:** **Selected** (Engineered, validated with 5 automated leakage tests, partitioned).
- **Target Variable:** `target_pm25_t_plus_1` (Next-hour observed PM2.5 in $\mu\text{g/m}^3$).
- **Total Features:** 118 columns spanning temporal cyclical encodings, meteorological wind vectors ($U, V$), atmospheric ventilation index, station-wise autoregressive lags (1h to 24h), leakage-safe rolling historical averages/volatility, and physical traffic/dispersion interaction terms.
- **Chronological Partitions:**
  - `train.csv`: Feb 18, 2025 to Mar 31, 2026 (58,608 station-hours, 42,796 valid observed targets, 69.7%).
  - `validation.csv`: Apr 01, 2026 to Jun 30, 2026 (13,104 station-hours, 10,454 valid observed targets, 15.6%).
  - `test.csv`: Jul 01, 2026 to Sep 24, 2026 (12,384 station-hours, 9,769 valid observed targets, 14.7%).
- **Storage Locations in Repository:**
  - Full Dataset: `ml/data/processed/features/feature_dataset.csv`
  - Partitions: `ml/data/processed/features/train.csv`, `validation.csv`, `test.csv`
  - Metadata: `ml/data/processed/features/feature_manifest.json`, `feature_quality_report.json`
  - Documentation: `ml/data/processed/features/README.md`
- **Generation Script:** `ml/src/features/build_features.py`
- **Feature Engineering Report:** [feature_engineering_report.md](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/docs/ml/feature_engineering_report.md)
- **Known Limitations:**
  - Co-pollutant features (PM10, NO2) only exist for benchmark Station 11613; models training on the whole network must use the 95-feature Core set.
  - Rolling windows and lags require initial 24h warm-up periods per station.

---

## 3. Evaluation & Ingestion Guidelines
1. **Pristine Raw Preservation:** Raw datasets in `ml/data/raw/` must never be altered or imputed.
2. **Classification Rule:** Datasets must strictly retain their observed vs modeled classification. Proxy variables (e.g. traffic congestion indices) must not be termed observed traffic volume.
3. **Selection Criteria:** Datasets are upgraded from *Candidate* to *Selected* only after successful acquisition, schema verification, and generation of a data quality report.


