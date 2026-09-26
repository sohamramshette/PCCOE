# Urban Environmental Digital Twin

## Project Brain / Single Source of Truth

> This document is the SINGLE SOURCE OF TRUTH for the project. It preserves
> context, architecture, technical decisions, assumptions, implementation
> status, constraints, and development rules. Any developer or AI coding agent
> MUST read this file before making changes.
>
> Status legend used throughout this document: **Planned**, **In Progress**,
> **Completed**, **Deferred**. Do not mark anything **Completed** unless it is
> actually implemented and tested.

---

# 1. PROJECT IDENTITY

**Project Name:**
Urban Environmental Digital Twin

**Hackathon:**
PCCOE HackMatrix

**Problem Statement:**
Urban Environmental Digital Twin

**One-line description:**
An AI/ML-powered urban digital twin that combines environmental, weather,
traffic, and activity data to forecast pollution, estimate model-based source
contributions, and simulate the impact of environmental interventions.

---

# 2. CORE PROBLEM

The system should help answer:

1. What is the current pollution condition?
2. What pollution level is likely in the future?
3. Which factors/sources are contributing to the predicted pollution?
4. What happens if an intervention is applied?
5. Which modeled intervention produces the largest reduction under the
   selected conditions?

**Rule:** Do not present any intervention as inherently "best". The system
provides quantitative scenario comparisons and lets users make the decision.

---

# 3. PROJECT OBJECTIVES

Primary objectives:

- Pollution forecasting
- Historical model validation
- Model-based contribution analysis
- Urban pollution hotspot identification
- What-if intervention simulation
- Observed vs modeled scenario distinction
- AI-generated explanation of model outputs
- Interactive urban digital twin visualization

**Initial pollutant:** PM2.5

**Initial intervention categories:**

1. Traffic reduction
2. Industrial activity/emission reduction
3. Construction/road-dust reduction

These may be expanded later.

---

# 4. MVP SCOPE

MVP should include:

1. Historical environmental dataset
2. Data preprocessing
3. PM2.5 prediction model
4. Model evaluation
5. Observed vs predicted comparison
6. Feature/source contribution analysis
7. What-if scenario engine
8. PostgreSQL database
9. FastAPI backend
10. React + Vite frontend
11. Interactive map
12. AI explanation layer

Do not expand the MVP unnecessarily.

---

# 5. AI/ML ARCHITECTURE

Pipeline (**Planned**):

```
Data Sources
    ↓
Data Cleaning
    ↓
Feature Engineering
    ↓
ML Prediction Model
    ↓
PM2.5 Forecast
    ↓
Explainability / Contribution Analysis
    ↓
Scenario / Digital Twin Engine
    ↓
Scenario Comparison
    ↓
AI Explanation
```

Initial ML models:

- **Baseline:** Random Forest
- **Main candidate:** XGBoost
- Time-series alternatives such as LSTM may be evaluated later **only** if
  justified by the dataset and project timeline.

Do not introduce complex models without measurable benefit.

---

# 6. DATA SOURCES

Document all datasets used by the project. For every dataset record:

- Dataset name
- Source
- URL/source reference
- Date range
- Geographic coverage
- Variables
- Resolution
- License/usage restrictions
- Missing-data characteristics
- Transformation performed
- Whether it is observed, derived, or proxy data

**IMPORTANT:** Never represent synthetic, derived, or proxy data as real observed data.

---

### Dataset 1: OpenAQ Pune Ambient Air Quality & In-Situ Meteorology
- **Dataset Name:** OpenAQ Pune Air Quality Dataset (`openaq_pune`)
- **Source / Provider:** OpenAQ API v3 (Aggregating CPCB, MPCB, IITM SAFAR CAAQMS stations)
- **URL / Reference:** `https://api.openaq.org/v3` (See docs in `docs/dataset/openaq_pune.md` and `docs/dataset/openaq_pune_inventory.md`)
- **Data Classification:** `OBSERVED` (Physical regulatory-grade continuous monitoring stations)
- **Date Range:** 
  - Modern Synchronized Period: **February 18, 2025 – September 24, 2026** (Continuous, active network)
  - Historical Archive Period: 2016 – July 2022 (Selected stations; preceded a 2022–2025 upstream telemetry hiatus)
- **Geographic Coverage:** Pune Metropolitan Region (18.43°N – 18.72°N, 73.74°E – 73.96°E) across 19 identified stations (core stations: Shivajinagar, Hadapsar, Mhada Colony, Bhosari, Katraj Dairy, Pashan).
- **Variables Available:**
  - Target Pollutant: **PM2.5** (Universal across all active stations, µg/m³)
  - Co-Pollutants: **PM10** (µg/m³), **NO2** (ppb/µg/m³), **SO2**, **CO**, **O3**
  - In-Situ Meteorology: **Temperature** (°C), **Relative Humidity** (%), **Wind Speed** (m/s), **Wind Direction** (deg)
- **Temporal Resolution:** 15-minute nominal sampling interval (recorded in UTC and IST).
- **License / Usage:** Open Data Commons Open Database License (ODbL) / CC-BY 4.0 (OpenAQ Attribution).
- **Missing-Data Characteristics:** 0% missing values in downloaded observation rows; sensor offline periods present in specific stations.
- **Transformations Performed:** None in raw store (`ml/data/raw/pollution/openaq/`). Raw JSON and multi-sensor CSV preserved verbatim. Hourly aggregation planned for `ml/data/processed/`.
- **Status:** **Selected** (Passed dataset quality and integrity inspection).

---

### Dataset 2: Open-Meteo Pune Historical Hourly Weather
- **Dataset Name:** Open-Meteo Pune Hourly Meteorological Dataset (`openmeteo_pune_weather`)
- **Source / Provider:** Open-Meteo Historical Weather API (ECMWF ERA5-Land & ERA5 Reanalysis)
- **URL / Reference:** `https://open-meteo.com/en/docs/historical-weather-api` (See docs in `docs/dataset/weather_source_inventory.md` and `docs/dataset/weather_quality_report.md`)
- **Data Classification:** `REANALYSIS` (Numerical atmospheric model data assimilation)
- **Date Range:** **February 18, 2025 – September 24, 2026** (14,016 contiguous hours matching OpenAQ window)
- **Geographic Coverage:** Pune Metropolitan Region (18.45°N – 18.66°N, 73.78°E – 73.96°E) covering 7 locations (Central PMC Anchor + 6 OpenAQ monitoring stations).
- **Variables Available:**
  - Required Variables: Temperature at 2m (°C), Relative Humidity at 2m (%), Wind Speed at 10m (m/s), Wind Direction at 10m (°), Total Precipitation / Rain (mm).
  - Atmospheric Covariates: Surface Pressure (hPa), Dew Point (°C), Solar Radiation (W/m²), Cloud Cover (%), Planetary Boundary Layer Height (m).
- **Temporal Resolution:** Exactly 1 Hour (00:00, 01:00, ..., 23:00 UTC).
- **License / Usage:** Creative Commons Attribution 4.0 International (CC BY 4.0) / Open Database License (ODbL).
- **Missing-Data Characteristics:** 0% missing values (0 nulls out of 98,112 rows).
- **Transformations Performed:**
  - Raw archive preserved in `ml/data/raw/weather/openmeteo/` (`raw_weather_hourly.csv`).
  - Standardized column names and IST timestamps (`datetime_local_ist` = UTC+05:30) generated in `ml/data/processed/weather/` (`weather_hourly_processed.csv`).
- **Status:** **Selected** (Passed data quality and physical validity inspection).

---

### Dataset 3: OpenStreetMap Pune Station Road Network
- **Dataset Name:** OpenStreetMap Pune Road Network (`osm_pune_road_network`)
- **Source / Provider:** OpenStreetMap Foundation (Overpass API)
- **URL / Reference:** `https://www.openstreetmap.org` (See docs in `docs/dataset/traffic_source_inventory.md` and `docs/dataset/traffic_quality_report.md`)
- **Data Classification:** `STATIC_ROAD_NETWORK` (Physical highway topology and vector geometry)
- **Date Range:** 2025–2026 Infrastructure Snapshot
- **Geographic Coverage:** 1,500m spatial buffer surrounding the 6 core Pune OpenAQ monitoring stations.
- **Variables Available:**
  - Segment attributes: Highway functional class, name, length (m), lanes, oneway, maxspeed, distance to station (m).
  - Derived station features: Total road length (km), major road length (km), major road density ($\text{km/km}^2$), distance to nearest major highway corridor (m).
- **License / Usage:** Open Database License (ODbL) — "© OpenStreetMap contributors".
- **Transformations Performed:**
  - Raw JSON and ways tabular archive saved in `ml/data/raw/traffic/osm/` (`raw_osm_ways.csv`).
  - Derived station spatial metrics aggregated in `ml/data/processed/traffic/` (`station_road_features.csv`).
- **Status:** **Selected** (Passed data quality and topological validation).

---

### Dataset 4: Empirical Pune Diurnal Traffic Intensity Index
- **Dataset Name:** Pune Diurnal Traffic Intensity Index (`pune_traffic_proxy`)
- **Source / Provider:** Empirical profile derived from Pune Comprehensive Mobility Plan (CMP) and IITM SAFAR urban mobility inventories.
- **Data Classification:** `TRAFFIC_PROXY` (Mathematical urban activity proxy; strictly not observed vehicle counts)
- **Date Range:** 24-hour diurnal cycle (weekdays and weekends)
- **Variables Available:** `hour_of_day`, `weekday_traffic_index` (0.0 to 1.0), `weekend_traffic_index` (0.0 to 1.0).
- **Transformations Performed:**
  - Raw CSV in `ml/data/raw/traffic/proxy/pune_diurnal_traffic_profile.csv`.
  - Processed CSV in `ml/data/processed/traffic/traffic_hourly_proxy.csv`.
- **Status:** **Selected** (Passed validation).

---

### Dataset 5: OpenStreetMap Pune Activity, Industrial, Construction & Land-Use Dataset
- **Dataset Name:** OpenStreetMap Pune Urban Activity, Industrial, Construction & Land-Use Extract (`osm_pune_activity`)
- **Source / Provider:** OpenStreetMap Foundation (Overpass API)
- **URL / Reference:** `https://overpass-api.de/api/interpreter`, `https://lz4.overpass-api.de/api/interpreter` (See docs in `docs/dataset/activity_source_inventory.md` and `docs/dataset/activity_quality_report.md`)
- **Data Classification:**
  - Raw Industrial Coordinates: `STATIC_INDUSTRIAL`
  - Industrial Counts & Proximity: `INDUSTRIAL_PROXY`
  - Construction Counts & Proximity: `CONSTRUCTION_PROXY`
  - Land-Use Zoning Polygons: `STATIC_LAND_USE`
  - POI Counts & Spatial Density: `ACTIVITY_PROXY`
- **Date Range:** 2025–2026 Contemporary Infrastructure Snapshot
- **Geographic Coverage:** 6 Core Pune OpenAQ Monitoring Station Buffers (2,000m for industrial; 1,500m for construction, land use, and POI).
- **Variables Available:**
  - Industrial (49 elements): `industrial_elements_2km`, `dist_nearest_industrial_m`, `has_industrial_within_1km`.
  - Construction (25 elements): `construction_elements_1_5km`, `dist_nearest_construction_m`, `has_construction_within_1km` (building, highway flyovers, site development).
  - Land Use (405 elements): `landuse_elements_total`, `landuse_residential_count`, `landuse_commercial_count`, `landuse_industrial_count`, `landuse_green_count`, `dominant_landuse`.
  - POI & Activity (417 elements): `poi_total_count_1_5km`, `poi_density_per_km2`, `poi_commercial_count`, `poi_institutional_count`, `poi_transit_count`.
- **License / Usage:** Open Database License (ODbL) — "© OpenStreetMap contributors".
- **Transformations Performed:**
  - Raw CSVs saved in `ml/data/raw/activity/` (`industrial/`, `construction/`, `landuse/`, `poi/`, `metadata/`).
  - Derived station features aggregated in `ml/data/processed/activity/station_activity_features.csv`.
- **Status:** **Selected** (Passed data quality and provenance audit).
- **Known Limitations:** Static spatial exposure representations; not real-time physical measurements of industrial stack emissions or daily construction dust.

---

### Additional Required Datasets (Pending Discovery / Acquisition):
1. **Spatial Topography / DEM:** Copernicus DEM 30m / SRTM elevation grid for Pune basin dispersion. (*Candidate*)




---

# 7. DATA MODEL / FEATURES

The feature architecture is finalized and validated in `ml/data/processed/features/` (118 columns, 84,096 station-hours):

**Primary Target:**
- `target_pm25_t_plus_1`: Next-hour ground-truth PM2.5 ($\mu\text{g/m}^3$) shifted station-wise ($t+1$).
- `target_available`: Binary indicator (1 if target is valid observed measurement, else 0).

**Temporal & Cyclical:**
- `hour_utc`, `hour_ist`, `day_of_week`, `day_of_month`, `month`, `year`, `is_weekend`
- Cyclical transforms: `hour_sin`, `hour_cos`, `month_sin`, `month_cos`, `day_of_week_sin`, `day_of_week_cos`
- `is_monsoon`: Binary indicator for Indian Summer Monsoon (June–September)

**Wind Vectors & Dispersion:**
- Meteorological wind decomposition: `wind_u`, `wind_v` (m/s, positive East and North)
- Ventilation Index: $\text{ventilation\_index} = \text{wind\_speed\_ms} \times \text{pbl\_height\_m}\ (\text{m}^2/\text{s})$
- `temp_dewpoint_spread` ($^\circ\text{C}$), `is_precipitating` (0/1), `atmospheric_stagnation_flag` (0/1)

**Pollution History & Lags (Station-Wise):**
- Contemporaneous: `pm25` at time $t$
- Lags: `pm25_lag_1h`, `pm25_lag_2h`, `pm25_lag_3h`, `pm25_lag_6h`, `pm25_lag_12h`, `pm25_lag_24h`
- Weather Lags: `temp_c_lag_1h/3h/6h`, `wind_speed_ms_lag_1h/3h/6h`, `pbl_height_m_lag_1h/3h`, `humidity_pct_lag_1h`, `ventilation_index_lag_1h`

**Leakage-Safe Rolling Statistics:**
- PM2.5 past rolling windows: `pm25_rolling_mean_3h/6h/12h/24h`, `pm25_rolling_std_6h/24h`
- Weather rolling windows: `temp_c_rolling_mean_6h`, `wind_speed_ms_rolling_mean_6h`, `pbl_height_m_rolling_mean_6h`, `precip_rolling_sum_6h/24h`

**Traffic Features & Interactions:**
- Static road network: `total_road_length_km`, `major_road_length_km`, `major_road_density_km_per_km2`, `distance_to_nearest_major_road_m`
- Diurnal proxy: `traffic_proxy_index`
- Physical interactions: `traffic_stagnation_ratio`, `traffic_ventilation_ratio`

**Urban Activity, Industrial, Construction & Land Use:**
- Static proxies: `industrial_elements_2km`, `dist_nearest_industrial_m`, `has_industrial_within_1km`, `construction_elements_1_5km`, `dist_nearest_construction_m`, `has_construction_within_1km`, `poi_total_count_1_5km`, `poi_density_per_km2`, `landuse_residential/commercial/industrial/green_count`, `dominant_landuse`
- Physical interactions: `industrial_dispersion_ratio`, `construction_dispersion_ratio`, `poi_traffic_interaction`

**Feature Documentation:** See `docs/ml/feature_engineering_report.md` and `ml/data/processed/features/feature_manifest.json`.

---

# 8. OBSERVED VS MODELED DATA RULE

This is a critical project rule.

**OBSERVED DATA:** Real measurements obtained from credible data sources.

**MODELED DATA:** Predictions, simulations, scenario outputs, or estimates
generated by our models.

The UI, API responses, database fields, documentation, and charts must
preserve this distinction. Never label a model prediction as an observed
measurement.

---

# 9. SOURCE CONTRIBUTION / EXPLAINABILITY

The first implementation may use SHAP or other model explainability methods.

**Important scientific limitation:** SHAP feature importance is NOT
automatically equivalent to physical emission-source apportionment.

Therefore:

- Clearly call it **model-based feature influence/contribution** unless a
  physically grounded source-apportionment methodology is implemented.
- Document assumptions.
- Do not claim causal relationships solely from feature importance.
- If a physical emissions model is introduced later, document it separately.

---

# 10. DIGITAL TWIN / WHAT-IF ENGINE

The digital twin should allow users to modify intervention variables.

Example:

```
Baseline:
  Traffic  = 100%
  Industry = 100%
  Dust     = 100%

Scenario:
  Traffic  = 80%
  Industry = 100%
  Dust     = 100%
```

The modified features are passed through the prediction model.

The system returns:

- Baseline prediction
- Scenario prediction
- Absolute difference
- Percentage difference
- Changed parameters
- Scenario metadata

**Important:** Scenario outputs are modeled simulations, not observed
measurements.

---

# 11. DATABASE ARCHITECTURE

**Database:** PostgreSQL

Planned entities (**Planned**):

- locations
- pollution_readings
- weather_readings
- traffic_readings
- activity_readings
- forecasts
- scenarios
- model_runs

Database design should be based on actual datasets after inspection. Do not
prematurely create a highly complex schema.

**Future migration system:** Alembic (**Planned**)

---

# 12. BACKEND ARCHITECTURE

**Backend:** FastAPI

High-level structure:

```
Frontend
    ↓
FastAPI
    ↓
Services
    ├── Database
    ├── ML
    ├── Scenario Engine
    └── AI
```

Expected API categories (**Planned**):

- /api/pollution
- /api/forecast
- /api/scenarios
- /api/ai

API contracts should use Pydantic schemas. Business logic should remain in
services rather than being placed directly inside route handlers.

---

# 13. ML-BACKEND INTEGRATION

The ML model should not be duplicated inside multiple backend routes.

Preferred architecture:

```
FastAPI
    ↓
ML Service
    ↓
Saved Model
    ↓
Prediction
```

The scenario engine should reuse the same prediction pipeline. Model
preprocessing and feature ordering must remain consistent between training and
inference.

---

# 14. AI / LLM ARCHITECTURE

The LLM is NOT responsible for numerical pollution prediction.

Correct architecture:

```
Environmental Data
    ↓
ML Model
    ↓
Numerical Results
    ↓
LLM
    ↓
Natural-language explanation
```

The LLM may explain:

- Forecast
- Main contributing features
- Scenario comparison
- Important changes
- Model limitations

The LLM must not invent numerical results. Use structured model output as the
source of truth.

---

# 15. FRONTEND ARCHITECTURE

**Frontend:** React + Vite

Frontend will be developed AFTER:

1. Dataset understanding
2. ML model
3. Validation
4. Scenario engine
5. Database
6. FastAPI APIs

Planned UI sections (**Planned**):

- Overview dashboard
- Digital twin map
- Pollution forecast
- Source/contribution analysis
- Scenario simulator
- Scenario comparison
- AI explanation
- Model validation

Do not begin frontend development before backend contracts are reasonably
stable.

---

# 16. PROJECT FOLDER STRUCTURE

Current repository structure (synchronized with the actual repository):

```
urban-environmental-digital-twin/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config/          (__init__.py)
│   │   ├── database/        (__init__.py)
│   │   ├── models/          (__init__.py)
│   │   ├── schemas/         (__init__.py)
│   │   ├── routes/          (__init__.py)
│   │   └── services/        (__init__.py)
│   └── tests/               (__init__.py)
│
├── ml/
│   ├── data/
│   │   ├── raw/             (.gitkeep)
│   │   ├── processed/       (.gitkeep)
│   │   └── external/        (.gitkeep)
│   ├── notebooks/           (.gitkeep)
│   ├── src/                 (__init__.py)
│   └── models/              (.gitkeep)
│
├── database/
│   ├── migrations/          (.gitkeep)
│   └── seed/                (.gitkeep)
│
├── ai/
│   ├── prompts/             (.gitkeep)
│   └── services/            (.gitkeep)
│
├── frontend/                (.gitkeep — NOT yet initialized with Vite)
│
├── docs/
│   ├── architecture/        (README.md, .gitkeep)
│   ├── dataset/             (.gitkeep)
│   └── .gitkeep
│
├── .gitignore
├── .env.example
├── README.md
├── brain.md
└── docker-compose.yml       (dev-only PostgreSQL placeholder)
```

Keep this section synchronized with the repository.

**Note:** Only skeleton/placeholder files exist so far (`__init__.py` and
`.gitkeep`). No application implementation files have been created.

---

# 17. DEVELOPMENT ORDER

Follow this order unless there is a documented reason to change it:

| Phase | Task |
| ----- | ---- |
| Phase 1  | Dataset discovery |
| Phase 2  | Data cleaning |
| Phase 3  | EDA |
| Phase 4  | Feature engineering |
| Phase 5  | Baseline ML model |
| Phase 6  | Model evaluation |
| Phase 7  | XGBoost / improved model |
| Phase 8  | Explainability |
| Phase 9  | What-if simulation engine |
| Phase 10 | Database |
| Phase 11 | FastAPI |
| Phase 12 | API testing |
| Phase 13 | React + Vite |
| Phase 14 | Map integration |
| Phase 15 | LLM explanation |
| Phase 16 | End-to-end integration |
| Phase 17 | Testing |
| Phase 18 | Hackathon demo preparation |

---

# 18. CURRENT STATUS

At project initialization:

```
[ ] Dataset selected
[ ] Dataset downloaded
[ ] Data cleaned
[ ] EDA completed
[ ] Baseline model trained
[ ] Model evaluated
[ ] Explainability implemented
[ ] Scenario engine implemented
[ ] Database implemented
[ ] FastAPI implemented
[ ] API tested
[ ] Frontend implemented
[ ] Map implemented
[ ] AI explanation implemented
[ ] End-to-end integration
[ ] Final testing
[ ] Demo ready
```

**Overall status:** Repository scaffolding **Completed** (skeleton only). All
functional items above are **Planned**.

Only mark an item as completed when it is actually implemented and tested.

---

# 19. TECHNICAL RULES

1. Prefer simple, reliable solutions over unnecessary complexity.
2. Do not introduce technologies without a clear requirement.
3. Do not duplicate business logic.
4. Keep ML code independent from UI code.
5. Keep database access inside the backend/database layer.
6. Keep secrets in environment variables.
7. Never commit API keys.
8. Never fabricate real-world observations.
9. Clearly label proxy/derived/synthetic data.
10. Clearly distinguish observed and modeled results.
11. Validate ML models on historical holdout/test periods.
12. Record model metrics.
13. Keep reproducible preprocessing and feature pipelines.
14. Avoid hard-coded prediction values.
15. Scenario results must be generated by the model.
16. Do not let the LLM override numerical model outputs.
17. Document assumptions and limitations.
18. Keep APIs versionable and predictable.
19. Avoid unnecessary dependencies.
20. Do not change major architecture without documenting the decision.

---

# 20. SECURITY RULES

Never commit:

- API keys
- Database passwords
- JWT secrets
- Cloud credentials
- LLM credentials
- Private datasets
- Personal information

Use `.env` and provide `.env.example` for required variables.

---

# 21. MODEL REPRODUCIBILITY

Every trained model should eventually record:

- Model type
- Training dataset/version
- Feature list
- Training date
- Test period
- Metrics
- Hyperparameters
- Preprocessing version

Avoid situations where the backend loads a model whose feature ordering does
not match the training pipeline.

---

# 22. TESTING STRATEGY

Testing will eventually cover:

**Backend:**

- API tests
- Schema validation
- Database operations

**ML:**

- preprocessing tests
- feature consistency
- prediction tests
- evaluation metrics

**Scenario:**

- baseline consistency
- intervention changes
- invalid inputs

**Frontend:**

- API integration
- map rendering
- scenario controls

**End-to-end:**

```
Data → ML → Database → API → Frontend → AI explanation
```

---

# 23. DECISION LOG

Maintain important technical decisions here.

Format:

```
## Decision: <title>
Date:
Status:
Decision:
Reason:
Alternatives considered:
Impact:
```

---

## Decision: Use FastAPI instead of Node/Express

Date: Project initialization
Status: Accepted

Decision:
Use FastAPI as the primary backend.

Reason:
The ML pipeline is Python-based and FastAPI allows direct integration with the
Python ML services while reducing unnecessary service complexity.

Alternatives considered:
Node/Express (would require a separate service boundary to reach the Python ML
code).

Impact:
Backend and ML share the Python ecosystem; simpler integration for the MVP.

---

## Decision: Repository scaffolding only (no implementation code)

Date: Project initialization
Status: Accepted

Decision:
Create the full folder skeleton, configuration placeholders, and documentation
without implementing application logic, APIs, ML models, database logic, UI, or
AI functionality.

Reason:
Establish a clean, agreed-upon structure before the dataset-discovery phase so
implementation is grounded in the actual data.

Alternatives considered:
Begin implementation immediately (rejected — premature before dataset
discovery).

Impact:
Repository is ready for Phase 1 (dataset discovery). No functional code exists
yet.

---

# 24. KNOWN LIMITATIONS

- Traffic data may initially be represented by a proxy/index.
- Industrial activity may initially use a proxy variable.
- SHAP contribution should not be interpreted as physical causal source
  apportionment.
- Scenario outputs represent model simulations.
- Prediction accuracy depends on historical data quality.
- Spatial resolution may be limited by available datasets.

Update this section as the project develops.

---

# 25. FUTURE ENHANCEMENTS

Possible future features (**Deferred** unless required for the MVP):

- More pollutants
- Higher spatial resolution
- Real-time sensor ingestion
- Advanced emissions modeling
- More sophisticated temporal models
- Weather forecasting integration
- Automated anomaly detection
- More intervention types
- Advanced geospatial analysis
- Mobile interface

Do not implement these unless they become necessary for the MVP.

---

# 26. AI AGENT INSTRUCTIONS

Any AI coding agent working on this repository MUST:

1. Read `brain.md` before modifying the project.
2. Understand the current project status.
3. Follow the documented architecture.
4. Avoid implementing features outside the current phase unless requested.
5. Avoid changing architecture without approval.
6. Never fabricate datasets or observations.
7. Never expose secrets.
8. Keep observed and modeled data separate.
9. Update `brain.md` after important architectural decisions.
10. Update the project status when a milestone is genuinely completed.
11. Prefer incremental changes.
12. Explain major changes before making architectural changes.
13. Do not add unnecessary dependencies.
14. Do not delete existing functionality without checking dependencies.
15. Preserve compatibility between ML training and inference.

---

# 27. CURRENT NEXT ACTION

### Status Update (Dataset Discovery & Acquisition):
- [x] **Air Quality Dataset (OpenAQ Pune):** **COMPLETED & SELECTED**.
  - Acquired ground-truth observed ambient air quality for Pune metropolitan area (19 stations discovered, 6 core spatial stations ingested, 2025–2026 synchronized window).
  - Target variable PM2.5 + co-pollutants (PM10, NO2) + in-situ meteorology (temperature, humidity, wind speed) cataloged and downloaded under `ml/data/raw/pollution/openaq/`.
  - Comprehensive inventory created in `docs/dataset/openaq_pune_inventory.md` and dataset source documentation in `docs/dataset/openaq_pune.md`.
  - Quality inspection completed in `docs/dataset/openaq_pune_quality_report.md`.
- [x] **Meteorological Dataset (Open-Meteo ERA5-Land Reanalysis):** **COMPLETED & SELECTED**.
  - Ingested 14,016 contiguous hourly records across 7 spatial Pune locations (98,112 total rows) covering February 18, 2025 to September 24, 2026.
  - All 5 required variables (temperature, relative humidity, wind speed, wind direction, precipitation) + 6 atmospheric covariates (pressure, dew point, solar radiation, cloud cover, PBL height) verified with 0% missing values and 0 physical anomalies.
  - Raw archive preserved in `ml/data/raw/weather/openmeteo/` and standardized hourly dataset generated in `ml/data/processed/weather/`.
  - Quality inspection completed in `docs/dataset/weather_quality_report.md` and source evaluation in `docs/dataset/weather_source_inventory.md`.
- [x] **Traffic & Road Network Datasets (OpenStreetMap + Empirical Proxy):** **COMPLETED & SELECTED**.
  - Ingested 4,332 road segments (707.95 km total length) across 1,500m buffers around the 6 core Pune monitoring stations via Overpass API (`STATIC_ROAD_NETWORK`).
  - Derived station road exposure metrics: total road length, major arterial length, major road density ($\text{km/km}^2$), and distance to nearest major highway corridor.
  - Ingested 24-hour empirical diurnal traffic intensity profile (`TRAFFIC_PROXY`) calibrated to Pune CMP and IITM SAFAR urban mobility studies.
  - Source evaluation completed in `docs/dataset/traffic_source_inventory.md` and quality report in `docs/dataset/traffic_quality_report.md`.
- [x] **Activity / Construction / Industrial Datasets (OpenStreetMap Multi-Domain):** **COMPLETED & SELECTED**.
  - Evaluated MIDC, MPCB, MahaRERA, PMC Development Plan, Copernicus GHSL, and NASA VIIRS.
  - Ingested 896 spatial elements across 6 station buffers: 49 industrial units (`STATIC_INDUSTRIAL`), 25 active construction/infrastructure sites (`CONSTRUCTION_PROXY`), 405 land-use zones (`STATIC_LAND_USE`), and 417 POIs (`ACTIVITY_PROXY`).
  - Generated station-level exposure table (`ml/data/processed/activity/station_activity_features.csv`) with 23 features including distance to nearest industrial facility, construction density, and POI density per km².
  - Source evaluation completed in `docs/dataset/activity_source_inventory.md` and quality report in `docs/dataset/activity_quality_report.md`.
- [x] **Data Integration & Master Analytical Dataset Generation:** **COMPLETED & VALIDATED**.
  - Resampled 419,781 raw 15-minute OpenAQ measurements to hourly averages across 6 core stations in `ml/data/processed/pollution/openaq_hourly_processed.csv`.
  - Constructed the canonical analytical grid at `ONE ROW = ONE STATION × ONE HOUR` (`station_id`, `datetime_utc`).
  - Executed reproducible cross-domain join via `ml/src/data/build_master_dataset.py`.
  - Generated unified `ml/data/processed/integration/master_hourly_dataset.csv` (84,096 rows, 70 columns, exactly 14,016 contiguous hours across 6 stations).
  - Verified 0 duplicate keys, 0 nulls across weather, traffic, and activity domains, and audited PM2.5 regulatory completeness (63,019 valid observed hours).
  - Schema documented in `docs/dataset/integration_schema.md` and quality report in `docs/dataset/integration_quality_report.md`.
- [x] **Phase 6: ML Feature Engineering & Digital Twin Transformation:** **COMPLETED & VALIDATED**.
  - Formulated primary forecast target `target_pm25_t_plus_1` shifted forward station-wise ($t+1$ hour).
  - Engineered 118 multi-domain features: temporal cyclical encodings (`hour_sin/cos`, `month_sin/cos`), meteorological wind vectors (`wind_u`, `wind_v`), atmospheric ventilation index, stagnation flag, station-wise autoregressive lags (1h to 24h), leakage-safe historical rolling statistics (3h to 24h), and non-linear physical interactions (`traffic_stagnation_ratio`, `traffic_ventilation_ratio`, `industrial_dispersion_ratio`).
  - Passed all 5 automated time-series leakage checks with zero forward-looking data leakage.
  - Partitioned into strictly chronological splits: Train (69.7%, 58,608 rows), Validation (15.6%, 13,104 rows), Test (14.7%, 12,384 rows).
  - Produced `ml/data/processed/features/` (`feature_dataset.csv`, `train.csv`, `validation.csv`, `test.csv`, `feature_manifest.json`, `feature_quality_report.json`, `README.md`).
  - Pipeline script: `ml/src/features/build_features.py`. Detailed documentation: `docs/ml/feature_engineering_report.md`.

- [x] **Phase 7: Baseline ML Models & Evaluation:** **COMPLETED & AUDITED**.
  - Trained and evaluated 4 baseline forecasting models for next-hour PM2.5 (`target_pm25_t_plus_1`):
    * **Model 0 (Persistence Baseline):** Non-parametric heuristic $\hat{y}_{t+1} = y_t$. Validation MAE: $4.941\,\mu\text{g/m}^3$, RMSE: $7.773\,\mu\text{g/m}^3$, $R^2$: $0.673$. Test MAE: $4.184\,\mu\text{g/m}^3$, RMSE: $9.878\,\mu\text{g/m}^3$, $R^2$: $0.363$. (Contemporaneous observed pairs test MAE: $3.969\,\mu\text{g/m}^3$, RMSE: $8.573\,\mu\text{g/m}^3$, $R^2$: $0.480$).
    * **Model 1 (Standardized Ridge Regression):** Linear regularized baseline ($\alpha=100.0$). Validation MAE: $5.722\,\mu\text{g/m}^3$, $R^2$: $0.616$. Test MAE: $4.682\,\mu\text{g/m}^3$, $R^2$: $0.354$. Confirms non-linear nature of atmospheric and dispersion interactions.
    * **Model 2 (Random Forest Regressor):** 100-tree bagged ensemble. Validation MAE: $4.736\,\mu\text{g/m}^3$, RMSE: $7.206\,\mu\text{g/m}^3$, $R^2$: $0.719$. Test MAE: $4.048\,\mu\text{g/m}^3$, RMSE: $9.117\,\mu\text{g/m}^3$, $R^2$: $0.457$ ($\Delta\text{MAE vs persist} = -0.136\,\mu\text{g/m}^3$).
    * **Model 3 (HistGradientBoosting Regressor):** Gradient-boosted histogram trees. Validation MAE: **$4.669\,\mu\text{g/m}^3$**, RMSE: **$7.129\,\mu\text{g/m}^3$**, $R^2$: **$0.725$**. Test MAE: $4.103\,\mu\text{g/m}^3$, RMSE: **$9.109\,\mu\text{g/m}^3$**, $R^2$: **$0.458$** ($\Delta\text{RMSE vs persist} = -0.769\,\mu\text{g/m}^3$).
    * **Station 11613 Extended Benchmark:** Core universal network model ($N=42,796$, Val MAE: $4.962\,\mu\text{g/m}^3$) outperformed single-station co-pollutant model ($N=7,535$, Val MAE: $5.933\,\mu\text{g/m}^3$), confirming value of cross-station generalization over noisy single-station co-pollutants.
  - Station-level breakdown: Tree models outperform persistence in 5 of 6 stations; largest error reductions achieved at Pashan (7.45% lift) and Bhosari (4.57% lift).
  - Subgroup breakdown: Under elevated PM2.5 conditions ($> 35\,\mu\text{g/m}^3$), HistGradientBoosting beats persistence by **$1.11\,\mu\text{g/m}^3$ (10.6% error reduction)**.
  - Top predictive features: `pm25` (29.4%), `pm25_rolling_mean_3h` (24.2%), `pm25_lag_1h` (12.4%), `pm25_rolling_mean_6h` (11.2%), followed by `solar_rad_wm2`, `pbl_height_m`, `wind_v`, and `ventilation_index`.
  - Saved model artifacts: `ml/models/` (`ridge_baseline.joblib`, `random_forest_baseline.joblib`, `gradient_boosting_baseline.joblib`, `preprocessor.joblib`, `gradient_boosting_extended_11613.joblib`, `feature_names.json`).
  - Saved evaluation results: `ml/results/` (`model_comparison.csv`, `station_metrics.csv`, `subgroup_metrics.csv`, `feature_importance.csv`, `validation_predictions.csv`, `test_predictions.csv`, `evaluation_report.json`, `README.md`).
  - Saved 7 publication figures: `ml/results/figures/` (`actual_vs_predicted.png`, `residual_distribution.png`, `residual_vs_predicted.png`, `model_comparison.png`, `per_station_mae.png`, `time_series_forecast_sample.png`, `feature_importance.png`).
  - Scripts: `ml/src/models/train_baselines.py`, `ml/src/models/evaluate_models.py`, `ml/src/models/run_baseline_experiments.py`.
  - Comprehensive documentation: `docs/ml/baseline_model_report.md`.

- [x] **Phase 8: PostgreSQL Database & Application Data Architecture:** **COMPLETED & VERIFIED**.
  - Designed normalized 3NF relational schema separating: Station metadata, In-situ hourly environmental observations, Weather reanalysis, Static spatial exposures (traffic & activity), Diurnal traffic proxy, Model registry, Forecast predictions, and What-if scenarios.
  - Implemented 10 SQLAlchemy 2.0 declarative models under `backend/app/models/` (`Station`, `EnvironmentalObservation`, `WeatherReanalysis`, `StationTrafficExposure`, `StationActivityExposure`, `TrafficProxy`, `ModelRegistry`, `ModelPrediction`, `Scenario`, `ScenarioResult`).
  - Implemented companion Pydantic v2 schemas under `backend/app/schemas/` cleanly separated from database ORM models.
  - Configured Alembic (`alembic.ini`, `backend/alembic/`) with target metadata and verified offline PostgreSQL DDL generation (`python -m alembic -c alembic.ini upgrade head --sql`).
  - Implemented database engine with connection pooling and resilient local verification mode in `backend/app/database/session.py`.
  - Built and executed idempotent data loading scripts under `backend/scripts/`:
    * `load_reference_data.py`: 6 stations, 6 traffic exposures, 6 activity exposures, 48 traffic proxy curves, 4 registered Phase 7 baseline models.
    * `load_observations.py`: 84,096 environmental observations (NULLs strictly preserved) and 84,096 weather reanalysis records from `master_hourly_dataset.csv`.
    * `load_predictions.py`: 80,892 model predictions across validation and test splits.
  - Implemented and passed 100% of automated database validation suite (`backend/scripts/validate_database.py`): table existence, 6 Pune stations, unique constraint on `(station_id, datetime_utc)`, foreign key enforcement, NULL preservation, model registry metrics, scenario table readiness, and exact row counts.
  - Documented full database architecture in `docs/architecture/database_architecture.md`.

- [x] **Phase 9: FastAPI Backend & Model Serving API:** **COMPLETED & VERIFIED (29/29 TESTS PASSED)**.
  - Built production FastAPI application layer under `backend/app/` with clean separation between API routes, schemas, services, and persistence layers.
  - Implemented core endpoints:
    * `GET /health` and `GET /api/v1/health`: Live database connection probe (`SELECT 1`), active station counts, registered model counts.
    * `GET /api/v1/stations`: Active monitoring stations listing (6 Pune/PCMC stations).
    * `GET /api/v1/stations/{station_id}`: Station detail with static road network (`traffic_exposure`) and activity/land-use (`activity_exposure`) buffer metrics.
    * `GET /api/v1/stations/{station_id}/observations`: Paginated historical observations with `start`, `end`, `limit`, `offset` filters; preserves `NULL` values for unmonitored sensors.
    * `GET /api/v1/stations/{station_id}/weather`: Paginated ECMWF ERA5-Land reanalysis with explicit `REANALYSIS` classification flag.
    * `GET /api/v1/stations/{station_id}/predictions`: Historical model predictions with actuals and on-the-fly `absolute_error` calculation.
    * `GET /api/v1/models` and `GET /api/v1/models/{model_id}`: MLOps model registry metadata and metrics; server filesystem paths omitted.
    * `GET /api/v1/stations/{station_id}/forecast`: Next-hour PM2.5 forecasting serving endpoint using in-memory pre-loaded models (defaulting to active baseline `gradient_boosting_baseline`). Constructs the exact 98 multi-domain feature inputs; returns structured `422 Unprocessable Content` if historical inputs at prediction time are unavailable.
  - In-memory `ModelServingManager` loaded once during application startup (`lifespan`).
  - CORS middleware configured for React development origins.
  - Standardized error handlers for 400, 404, 422, and 500 without leaking credentials or stack traces.
  - Created automated test suite with 29 test cases under `backend/tests/` (100% pass rate).
  - Documented API architecture in `docs/architecture/api_architecture.md`.

### Next Immediate Action:
**Phase 10: Digital Twin What-If Intervention Simulation Engine & Attribution Layer.**
*(Awaiting user instructions. Do NOT implement simulator or React/frontend until requested.)*

---

# 28. PROJECT COMPLETION CHECKLIST

END OF PROJECT BRAIN

