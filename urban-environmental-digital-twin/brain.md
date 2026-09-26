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

Pipeline:

```
Data Sources (OpenAQ, ERA5-Land, OSM, Traffic Proxy)
    ↓
Data Cleaning & Multi-Domain Spatio-Temporal Alignment
    ↓
Feature Engineering (118 features, strict chronological splits)
    ↓
ML Prediction Models (Persistence, Ridge, Random Forest, HistGradientBoosting)
    ↓
PM2.5 Forecast (Next-hour t+1)
    ↓
What-If / Counterfactual Scenario Engine (Traffic & Industrial curbs)
    ↓
FastAPI Model Serving & Scenario Execution Layer
    ↓
Interactive Digital Twin Visualization (Phase 11 — Next)
    ↓
Future Attribution & AI Explanation (SHAP & LLM — Planned Future)
```

Implemented Baseline ML Models (Phase 7):
- **Model 0 — Persistence Baseline:** Non-parametric heuristic $\hat{y}_{t+1} = y_t$ with lag fallback.
- **Model 1 — Standardized Ridge Regression:** Regularized linear model ($L_2$ penalty $\alpha=100.0$) with median imputation and standard scaling.
- **Model 2 — Random Forest Regressor:** Bagged ensemble of 100 regression trees (`max_depth=15`, `min_samples_split=5`).
- **Model 3 — HistGradientBoosting Regressor:** Production default histogram-based gradient boosted trees (`max_iter=150`, `learning_rate=0.08`, `max_depth=10`, Test MAE: $4.10\,\mu\text{g/m}^3$, RMSE: $9.11\,\mu\text{g/m}^3$).

*Planned / Future models:* XGBoost, deep spatio-temporal architectures (e.g. Graph Neural Networks or LSTMs) may be evaluated in future research phases. None are currently deployed in production. Do not introduce complex models without measurable benefit.

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

> **Status:** Planned Future Work (Phase 12+). Not currently implemented in production.

Future implementations may use SHAP (SHapley Additive exPlanations) or tree feature attribution methods.

**Important scientific limitation:** SHAP feature importance is NOT
automatically equivalent to physical emission-source apportionment.

Therefore:

- Clearly call it **model-based feature influence/contribution** unless a
  physically grounded source-apportionment methodology is implemented.
- Document assumptions.
- Do not claim causal relationships solely from feature importance.
- If a physical emissions model is introduced later, document it separately.

---

# 10. DIGITAL TWIN / WHAT-IF COUNTERFACTUAL ENGINE

> **Status:** Implemented & Verified in Phase 10 (21/21 Scenario Tests Passed).

The What-If / Counterfactual Simulation Engine allows users to evaluate model-based shifts under hypothetical policy interventions without modifying raw historical records.

### Supported Interventions:
1. `TRAFFIC_REDUCTION`: $0.0 \le p_t \le 100.0\%$. Modifies `traffic_proxy_index`, `traffic_stagnation_ratio`, `traffic_ventilation_ratio`, `poi_traffic_interaction` by $(1.0 - p_t/100)$.
2. `INDUSTRIAL_ACTIVITY_REDUCTION`: $0.0 \le p_i \le 100.0\%$. Modifies `has_industrial_within_1km` and `industrial_dispersion_ratio` by $(1.0 - p_i/100)$.
3. `COMBINED_INTERVENTION`: Applies traffic and industrial curbs simultaneously and independently.

*Note on Construction:* Construction intervention is currently a documented/future concept and is not yet implemented in the scenario engine.

The engine returns:
- Baseline prediction ($\mu\text{g/m}^3$)
- Counterfactual prediction ($\mu\text{g/m}^3$)
- Absolute difference ($\Delta = \hat{y}_{\text{cf}} - \hat{y}_{\text{base}}$)
- Estimated reduction ($-\Delta$)
- Percentage change ($\% \Delta$, division-by-zero protected)
- Structured feature modification audit list
- Explicit non-causal disclaimer and `uncertainty_available: false`

**Important:** Scenario outputs are strictly **model-based counterfactual estimates**, not physical measurements or causal claims.

---

## 11. DATABASE ARCHITECTURE

> **Status:** Implemented & Verified in Phase 8 (PostgreSQL 15+ / SQLAlchemy 2.0 / Alembic migrations).

The normalized relational schema contains **10 tables**:
1. `stations`: 6 CAAQMN air quality monitoring station entities.
2. `station_traffic_exposure`: Static 1.5 km road buffer metrics.
3. `station_activity_exposure`: Static industrial, construction, land-use, and POI metrics.
4. `traffic_proxy`: 48-hour weekday/weekend diurnal mobility curves.
5. `environmental_observations`: 84,096 in-situ hourly measurements (NULLs strictly preserved).
6. `weather_reanalysis`: 84,096 ECMWF ERA5-Land hourly meteorological records.
7. `model_registry`: 4 registered baseline models with metadata and validation metrics.
8. `model_predictions`: 80,892 historical validation and test prediction logs.
9. `scenarios`: What-If scenario definitions, policy levers, and simulation status.
10. `scenario_results`: Persisted counterfactual simulation outputs and execution metadata.

**Migrations:** Managed via Alembic (`0001_initial_schema`, `0002_scenario_baseline_and_metadata`).

---

## 12. BACKEND ARCHITECTURE

> **Status:** Implemented & Verified in Phase 9 & 10 (FastAPI 0.110+ / Pydantic v2).

High-level structure:
```
Client / Dashboard (Phase 11)
    ↓
FastAPI Master Router (/api/v1/)
    ├── /health & /api/v1/health       (Database & entity connectivity probes)
    ├── /api/v1/stations              (Station metadata & spatial exposure buffers)
    ├── /api/v1/stations/{id}/observations  (Paginated historical sensor observations)
    ├── /api/v1/stations/{id}/weather (Paginated ECMWF ERA5-Land reanalysis)
    ├── /api/v1/stations/{id}/predictions (Historical model predictions & errors)
    ├── /api/v1/models                (MLOps model registry & metrics)
    ├── /api/v1/stations/{id}/forecast (Real-time next-hour inference via ModelServingManager)
    └── /api/v1/scenarios             (What-If counterfactual simulation engine)
```

Business logic is completely decoupled from route handlers and resides in dedicated services (`backend/app/services/`).

---

## 13. ML-BACKEND INTEGRATION

> **Status:** Implemented & Verified in Phase 9.

Model serving uses the `ModelServingManager` singleton:
- **One-time startup loading:** Model weights (`.joblib`) and `preprocessor.joblib` are loaded into memory once during application startup (`lifespan`).
- **Zero disk I/O on inference requests:** Both forecast and scenario simulations execute against in-memory models.
- **Pipeline consistency:** The identical 98 core features and preprocessor transformations are shared between offline training and live serving.

---

## 14. AI / LLM EXPLANATION ARCHITECTURE

> **Status:** Planned Future Work (Phase 13+). Not currently implemented.

The LLM is NOT responsible for numerical pollution prediction.

Intended future architecture:
```
Environmental Data
    ↓
ML Model
    ↓
Numerical Forecast & Scenario Delta
    ↓
LLM Natural-Language Explainer (Planned)
    ↓
Human-Readable Advisory / Explanation
```

The LLM will explain:
- Forecast trends
- Model-based contributing features
- Scenario comparison deltas
- Important health cautions

- Forecast
- Main contributing features
- Scenario comparison
- Important changes
- Model limitations

The LLM must not invent numerical results. Use structured model output as the
source of truth.

---

# 15. FRONTEND ARCHITECTURE

> **Status:** Implemented & Verified in Phase 11. Production build passed (`tsc && vite build` in 31.92s).

**Frontend Technology Stack:**
- **Framework:** React 18 (`react`, `react-dom` 18.3.1)
- **Tooling:** Vite 5 + TypeScript 5 (Strict Mode)
- **Routing:** React Router DOM v6
- **Data Visualization:** Recharts 2 (Null-preserving line charts, dual-axis weather, scenario bars)
- **Iconography:** Lucide React
- **Styling:** Custom Vanilla CSS Design System with dark slate palette and epistemological badges

**Implemented Pages & Features:**
1. **Overview Dashboard (`/`):** Network KPI tiles (6 active stations, latest observed PM2.5, next-hour forecast, serving model), focus station toggle, 48-hour PM2.5 trend, contemporaneous ERA5-Land weather parameters, baseline models registry table.
2. **Stations Registry (`/stations`):** Grid of all 6 continuous CAAQMS stations in Pune & PCMC with authority, geographic coordinates, and zone classifications.
3. **Station Diagnostics (`/stations/:stationId`):** In-depth geospatial profile with 1.5 km road exposure buffers, 2.0 km industrial and activity buffers, co-located observed vs predicted PM2.5 time-series, ERA5-Land atmospheric trends, and raw hourly observations table.
4. **Real-Time Next-Hour Forecasting (`/forecast`):** Live model inference ($t+1$) served by in-memory `ForecastService`, contemporaneous input features snapshot, and verification status.
5. **What-If Policy Intervention Simulator (`/scenarios`):** Interactive parameter configuration supporting `TRAFFIC_REDUCTION`, `INDUSTRIAL_ACTIVITY_REDUCTION`, and `COMBINED_INTERVENTION`. Simulation execution against `/api/v1/scenarios/{id}/run`, bar chart delta visualization, and granular feature audit trail.

**Epistemological Integrity in UI:**
- Missing sensor values remain visibly missing (no synthetic interpolation).
- All cards and metrics display clear provenance badges: `OBSERVED`, `REANALYSIS`, `STATIC_ROAD_NETWORK`, `TRAFFIC_PROXY`, `ACTIVITY_PROXY`, `PREDICTED`, `SCENARIO / SIMULATED`.
- Counterfactual simulations include explicit scientific interpretation and uncertainty notices (`MODEL_COUNTERFACTUAL_ESTIMATE`).

---

# 16. PROJECT FOLDER STRUCTURE

Current repository structure (synchronized with the actual repository):

```
urban-environmental-digital-twin/
├── backend/
│   ├── alembic/                      # Alembic database migrations
│   │   ├── versions/                 # 0001_initial_schema, 0002_scenario_baseline_and_metadata
│   │   └── env.py
│   ├── app/
│   │   ├── api/                      # FastAPI routes & master router
│   │   │   ├── routes/               # stations, observations, weather, predictions, models, forecast, scenarios, health
│   │   │   └── router.py
│   │   ├── config/                   # pydantic-settings configuration
│   │   ├── database/                 # SQLAlchemy Base, connection pooling, SQLite verification fallback
│   │   ├── models/                   # 10 Declarative SQLAlchemy 2.0 ORM models
│   │   ├── schemas/                  # Pydantic v2 validation and serialization schemas
│   │   ├── services/                 # Business logic, feature construction, model serving, scenarios
│   │   └── main.py                   # FastAPI application factory & lifespan
│   ├── scripts/                      # Idempotent DB loaders & validation suite
│   ├── tests/                        # Pytest suite (50 automated tests, 100% pass)
│   └── requirements.txt
├── ml/
│   ├── data/
│   │   ├── raw/                      # OpenAQ, ERA5-Land, OSM ways, traffic proxy archives
│   │   └── processed/                # master_hourly_dataset.csv, feature_dataset.csv, train/val/test splits
│   ├── models/                       # Model artifacts (preprocessor.joblib, model joblibs, feature_names.json)
│   ├── results/                      # Evaluation reports, station metrics, figures
│   └── src/
│       ├── data/                     # Ingestion scripts & build_master_dataset.py
│       ├── features/                 # build_features.py (118-feature store engineering)
│       └── models/                   # train_baselines.py, evaluate_models.py, run_baseline_experiments.py
├── frontend/
│   ├── src/                          # React + Vite application (Phase 11 - Complete & Verified)
│   │   ├── api/                      # Centralized typed fetch API client
│   │   ├── components/               # Layout, common badges, Recharts, feature tables
│   │   ├── pages/                    # Dashboard, Stations, StationDetails, Forecast, Scenarios
│   │   ├── types/                    # Strict TypeScript models matching Pydantic schemas
│   │   ├── utils/                    # Formatters, NAQI bands, provenance classifications
│   │   ├── App.tsx                   # React Router route tree
│   │   ├── main.tsx                  # React 18 DOM mount
│   │   └── index.css                 # Design system & responsive styling
│   ├── .env.example                  # VITE_API_BASE_URL=http://localhost:8000
│   ├── index.html                    # HTML5 entry with Outfit & Inter typography
│   ├── package.json                  # Dependencies & scripts
│   ├── tsconfig.json                 # Strict TypeScript compiler options
│   ├── vite.config.ts                # Vite configuration
│   └── README.md                     # Frontend architecture & local development guide
├── docs/
│   ├── architecture/                 # api_architecture.md, database_architecture.md, README.md
│   ├── dataset/                      # Dataset inventories, schemas, and quality reports
│   ├── ml/                           # baseline_model_report.md, counterfactual_simulation_report.md, feature_engineering_report.md
│   ├── REPRODUCIBILITY.md            # Detailed environment setup, artifact regeneration, and workflow guide
│   ├── phase_10_5_repository_cleanup_report.md # Consistency audit report
│   └── phase_11_frontend_report.md   # Complete frontend development report
├── brain.md                          # Single source of truth project brain
├── README.md                         # Project overview and public documentation
├── docker-compose.yml                # Development PostgreSQL container configuration
├── alembic.ini                       # Alembic CLI configuration
├── .env.example                      # Sanitized environment configuration template
└── .gitignore                        # Git exclusion rules
```

---

# 17. DEVELOPMENT EXECUTION & PHASES

The project follows a phased engineering progression:

| Phase | Milestone | Status | Key Deliverable |
| :---: | :--- | :---: | :--- |
| **Phase 1** | OpenAQ Air Quality Data Acquisition & Audit | **Completed** | 6 CAAQMN stations, 15-min raw measurements |
| **Phase 2** | Weather Data Acquisition (Open-Meteo / ERA5-Land) | **Completed** | 7 locations, 14,016 contiguous hours, 0 nulls |
| **Phase 3** | Traffic & Road Infrastructure Acquisition | **Completed** | OSM Overpass highway ways + Pune diurnal traffic curve |
| **Phase 4** | Activity, Industrial & Land-Use Acquisition | **Completed** | 49 industrial, 25 construction, 405 land-use, 417 POIs |
| **Phase 5** | Data Integration & Master Dataset Generation | **Completed** | `master_hourly_dataset.csv` (84,096 station-hours, 70 cols) |
| **Phase 6** | ML Feature Engineering & Digital Twin Transformation | **Completed** | `feature_dataset.csv` (118 cols, 5 leakage checks passed) |
| **Phase 7** | Baseline ML Model Training & Evaluation | **Completed** | 4 models evaluated, Test MAE $4.05$--$4.18\,\mu\text{g/m}^3$ |
| **Phase 8** | Database Architecture & Persistence Layer | **Completed** | 10 normalized tables, Alembic migrations, PostgreSQL/SQLite |
| **Phase 9** | FastAPI Backend & Real-Time Model Serving API | **Completed** | 29/29 tests passed, in-memory model serving |
| **Phase 10** | What-If / Counterfactual Simulation Engine | **Completed** | 50/50 tests passed, counterfactual API verified |
| **Phase 10.5** | Repository Consistency & Reproducibility Cleanup | **Completed** | Docs, schemas, provenance, and tests synchronized |
| **Phase 11** | Interactive React / Vite Frontend Dashboard | **Completed** | React 18, TS 5, Vite 5, Recharts, 5 pages operational |
| **Phase 12** | Model Explainability & Attribution Layer (SHAP) | **Planned** | Post-frontend attribution visualization |
| **Phase 13** | AI / LLM Explanation & Advisory Layer | **Planned** | LLM-based natural language summaries |

---

# 18. CURRENT VERIFIED STATUS

```
[x] Phase 1: OpenAQ air quality dataset acquired & audited
[x] Phase 2: Open-Meteo / ERA5-Land weather acquired & verified (0 nulls)
[x] Phase 3: Traffic road network & diurnal proxy acquired
[x] Phase 4: Industrial, construction, land-use, and POI proxies acquired
[x] Phase 5: Master hourly dataset generated (84,096 rows, 70 cols)
[x] Phase 6: Feature engineering completed (118 features, zero leakage)
[x] Phase 7: Baseline models trained & evaluated (Persistence, Ridge, RF, HGB)
[x] Phase 8: PostgreSQL database & Alembic migrations verified
[x] Phase 9: FastAPI backend & in-memory model serving verified (29/29 tests)
[x] Phase 10: What-If counterfactual simulation engine verified (50/50 tests)
[x] Phase 10.5: Repository consistency, documentation, and reproducibility cleanup
[x] Phase 11: React + Vite interactive digital twin frontend (COMPLETED & BUILT)
[ ] Phase 12: SHAP feature attribution & contribution analysis (PLANNED)
[ ] Phase 13: LLM natural-language advisory layer (PLANNED)
```

**Overall status:** Phases 1–11 **COMPLETED & FULLY VERIFIED (50/50 backend tests passing, frontend builds with 0 errors)**. Phase 12 (SHAP Explainability) is **NEXT / PLANNED**.

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

- [x] **Phase 10: What-If / Counterfactual Simulation Engine:** **COMPLETED & VERIFIED (50/50 TESTS PASSED)**.
  - Implemented the What-If / Counterfactual Simulation Engine under `backend/app/services/scenario_service.py` adhering to strict scientific boundaries:
    * **Model-Based Counterfactual Estimate:** Explicitly labeled as `MODEL_COUNTERFACTUAL_ESTIMATE`, carrying `interpretation_note: "Counterfactual model estimate; not a causal measurement."` and `uncertainty_available: false`.
    * **Database Immutability:** Raw observations, weather reanalysis, traffic proxy, and spatial exposures remain strictly read-only; snapshot tests guarantee 0 modifications.
    * **Feature Safety:** Modifies ONLY verified features in `ml/models/feature_names.json`:
      - `TRAFFIC_REDUCTION`: `traffic_proxy_index` ($X_{\text{base}} \times m_t$), `traffic_stagnation_ratio` ($X_{\text{base}} \times m_t$), `traffic_ventilation_ratio` ($X_{\text{base}} \times m_t$), `poi_traffic_interaction` ($X_{\text{base}} \times m_t$).
      - `INDUSTRIAL_ACTIVITY_REDUCTION`: `has_industrial_within_1km` ($X_{\text{base}} \times m_i$), `industrial_dispersion_ratio` ($X_{\text{base}} \times m_i$).
      - `COMBINED_INTERVENTION`: Independent application of both policy levers.
    * **In-Memory Serving Reuse:** Pre-loaded `ModelServingManager` evaluates both baseline and counterfactual feature rows without reloading or retraining models.
    * **Calculations:** Absolute change ($\hat{y}_{\text{cf}} - \hat{y}_{\text{base}}$), estimated reduction ($\hat{y}_{\text{base}} - \hat{y}_{\text{cf}}$), and division-by-zero protected percentage change.
  - Minimal schema enhancement with Alembic migration `0002_scenario_baseline_and_metadata.py` adding `baseline_time_utc` and `metadata_json`.
  - Comprehensive Pydantic v2 schemas in `backend/app/schemas/scenario.py` with parameter bounds validation ($0 \le \text{pct} \le 100$).
  - REST API endpoints under `/api/v1/scenarios` (`POST /`, `GET /`, `GET /{id}`, `POST /{id}/run`, `GET /{id}/results`).
  - Automated test suite `backend/tests/test_scenarios.py` with 21 tests (total backend test suite: 50 passed).
  - Comprehensive documentation in `docs/ml/counterfactual_simulation_report.md` and updated `docs/architecture/api_architecture.md`.

- [x] **Phase 11: Frontend Interactive Urban Digital Twin Dashboard (React + Vite):** **COMPLETED, AUDITED & VERIFIED (51/51 BACKEND TESTS PASSED, ZERO FRONTEND BUILD ERRORS)**.
  - Built production React 18 + Vite 5 + TypeScript single-page application under `frontend/` adhering to strict architectural separation.
  - Implemented core views:
    * **Dashboard (`/`):** Network overview across 6 Pune & PCMC monitoring stations, live observed PM2.5 with Indian NAQI categorization, next-hour forecasting, chronological 48h PM2.5 trends, and ECMWF ERA5-Land meteorology.
    * **Stations Registry (`/stations`):** Active monitoring stations listing with urban morphology zoning and direct diagnostic links.
    * **Station Diagnostics (`/stations/:id`):** Road density (1.5 km buffer) and activity/industrial buffers (2.0 km), observed vs. model prediction time series, and raw historical readings table with regulatory completeness flags.
    * **Next-Hour Forecast Serving (`/forecast`):** Station & model selector, $t+1$ prediction inference with input features audit and clear distinction between observed missingness and model preprocessor median fallback.
    * **What-If Intervention Simulator (`/scenarios`):** Traffic and industrial curtailment policy levers with live counterfactual delta simulation and granular feature modification audit trails.
  - Conducted Phase 11 Frontend Data Consistency Audit:
    * Fixed date parsing bug by implementing `parseUtcDate` in `formatters.ts` to append `'Z'` to naive ISO timestamps, preventing IST (-5h30m) timezone shift into pre-period Feb 17.
    * Enforced canonical analytical date boundaries (`2025-02-18 00:00:00 UTC` to `2026-09-24 23:00:00 UTC`).
    * Corrected scenario percentage representation: user-selected 30% traffic reduction is consistently 30% across slider, domain model, database, API, and UI displays (`Traffic Reduction: 30%`). Added automated regression test `test_thirty_percent_traffic_reduction_semantic_consistency`.
    * Relabeled missing forecast input feature to `Baseline PM2.5 (t): Missing` with distinct `(Input fallback: model pipeline median)` indicator, preserving observed sensor missingness without synthetic target imputation.
    * Fixed PM2.5 chart ordering: removed `.reverse()` calls and enforced chronological ascending ordering (`datetime_utc ASC`, oldest to newest).
    * Updated terminology from "Real-Time" to "Next-Hour PM2.5 Forecast (Historical Inference)".
    * Dashboard correctly renders `Latest Observed PM2.5 = NO DATA` alongside available next-hour forecast without fabricating sensor readings.
  - Implemented **Phase 11 Extension: Pune Digital Twin Map (`/digital-twin`)**:
    * Integrated React Leaflet v4 (`react-leaflet` + `leaflet`) with OpenStreetMap basemap tiles.
    * Real-time spatial mapping of all 6 monitoring stations using verified FastAPI `GET /api/v1/stations` coordinates.
    * Interactive custom HTML markers (`L.divIcon`) with pulse indicators, station ID badges, and popup cards displaying observed PM2.5 (`NO DATA` when missing) and direct station diagnostic links.
    * Toggleable 1.5 km road exposure buffers and 2.0 km activity exposure buffers based on verified spatial schemas.
    * Explicitly labeled vector road networks and industrial footprints as planned/deferred layers without fabricating geometries.
    * Added `/digital-twin` route to `App.tsx` and updated sidebar navigation.
  - Full documentation in `docs/phase_11_frontend_report.md`.

- [x] **Phase 12: Scenario Result Visualization:** **COMPLETED & VERIFIED (51/51 BACKEND TESTS PASSED, ZERO FRONTEND BUILD ERRORS)**.
  - Implemented dedicated `ScenarioResultVisualization` component under `frontend/src/components/scenarios/ScenarioResultVisualization.tsx`.
  - Comprehensive analytical results section:
    * **Scenario Summary:** Station name & numerical ID, baseline timestamp (UTC), target timestamp ($t+1$), status (`COMPLETED`).
    * **Provenance & Warning:** Prominent `MODEL COUNTERFACTUAL ESTIMATE` badge and alert notice: *"Counterfactual values are model estimates produced by the digital twin scenario engine. They are not observed measurements."*
    * **5 Quantitative Result Cards:** Baseline PM2.5, Counterfactual PM2.5, Absolute Change ($\Delta$, with sign and direction), Relative Change (%), and Intervention Magnitude (with explicit multipliers e.g. $m_{\text{traffic}} = 0.70$).
    * **Primary Chart:** Recharts `BarChart` comparing `Baseline PM2.5` vs `Counterfactual PM2.5` labeled strictly in `PM2.5 (µg/m³)`.
    * **Intervention Explanation & Audit:** Narrative description of policy lever transformations accompanied by `FeatureAuditTable` detailing affected core features and applied scaling formulas.
    * **UX States:** Seamless reactive states for Loading, Empty ("Run a scenario to see counterfactual results"), Error, and Success.
- [x] **Phase 13: Model Performance + Data & Methodology Pages:** **COMPLETED & VERIFIED (51/51 BACKEND TESTS PASSED, ZERO FRONTEND BUILD ERRORS, E2E BROWSER VERIFIED)**.
  - Designed and built two informative, technically transparent frontend interfaces under `frontend/src/pages/`:
    * **Model Performance (`/model-performance`):**
      - Overview: Next-hour PM2.5 forecasting objective ($\le 2.5\,\mu\text{m}$, `target_pm25_t_plus_1` in $\mu\text{g/m}^3$) with neutral evaluation metric guidance (lower MAE/RMSE = smaller error, higher R² = greater variance explained; zero subjective ranking or tier labels).
      - Consolidated Performance Matrix: Persistence, Ridge ($\alpha=100.0$), Random Forest, HistGradientBoosting displaying exact documented Validation and Test MAE, RMSE, and R² from `docs/ml/baseline_model_report.md`.
      - Recharts Grouped BarChart: Side-by-side comparison of Test MAE and Test RMSE in `PM2.5 error (µg/m³)` without distorted normalization.
      - Station 11613 Extended Benchmark: Highlights the critical contrast between Universal Network HGB (Test MAE 4.5857, Test R² 0.5065) and Single-Station HGB (Test MAE 7.0194, Test R² -0.1994) explaining multi-station spatial pooling vs seasonal co-pollutant drift.
      - Chronological Split Representation: Train (407 days, 42,796 valid rows / 73.02%), Validation (91 days, 10,454 valid rows / 79.78%), and Test (86 days, 9,769 valid rows / 78.88%) enforcing zero leakage and strictly later test timeframes.
      - Feature Attribution Table: Top 10 predictive features with Gini importance and Permutation MAE loss, accompanied by mandatory non-causal statistical caveat.
      - Project Limitations: 5 documented limitations (sensor missingness, reanalysis weather, proxy traffic, counterfactual model estimates, point forecasts without calibrated Bayesian uncertainty).
    * **Data & Methodology (`/data-methodology`):**
      - Dataset Overview: Master analytical grain `(station_id, datetime_utc)`, 84,096 station-hour rows, 584 calendar days (2025-02-18 to 2026-09-24), 6 monitoring stations, 70 master / 118 engineered columns.
      - Multi-Source Provenance Classification Table: Categorizes all 8 data layers (`OBSERVED`, `REANALYSIS`, `STATIC_ROAD_NETWORK`, `TRAFFIC_PROXY`, `STATIC_INDUSTRIAL`, `CONSTRUCTION_PROXY`, `STATIC_LAND_USE`, `ACTIVITY_PROXY`).
      - PM2.5 Data Quality Breakdown: 63,019 valid observations (74.94%), 21,077 missing sensor dropouts (25.06%), CPCB completeness classifications (`COMPLETE`, `PARTIAL`, `INSUFFICIENT`, `MISSING`), and explicit target non-imputation policy for supervised learning.
      - Visual Data Processing Pipeline: Responsive 9-stage HTML/CSS pipeline flowchart from raw acquisition to counterfactual simulation.
      - Feature Engineering Taxonomy: 10 structured domains covering all 118 engineered features and leakage test confirmations.
      - Epistemological Transparency Panel: Observed vs Derived vs Proxy data definitions and scientific methodology guarantees (UTC timestamps, chronological splits, target non-imputation, raw data immutability).
  - Configured navigation in `Sidebar.tsx` and routes in `App.tsx` with smooth SPA routing and page reload capability.
  - Full documentation in `docs/phase_13_model_performance_methodology_report.md`.

---

# 28. PROJECT COMPLETION CHECKLIST

END OF PROJECT BRAIN

