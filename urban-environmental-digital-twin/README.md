# Urban Environmental Digital Twin

> A Pune-focused urban environmental modeling and digital twin platform for hourly PM2.5 forecasting, multi-domain environmental data integration, and model-based what-if intervention simulation.

[![Tests](https://img.shields.io/badge/Tests-50%2F50%20Passed-brightgreen)](backend/tests/)
[![FastAPI](https://img.shields.io/badge/API-FastAPI%200.110%2B-blue)](backend/app/)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.14-blue)](backend/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Supabase%20%2F%20SQLite-indigo)](backend/app/models/)
[![License](https://img.shields.io/badge/License-CC%20BY%204.0%20%2F%20ODbL-lightgrey)](docs/dataset/dataset_inventory.md)

---

## 1. Project Purpose & Overview

Urban environments generate high-volume, heterogeneous data across air quality networks, numerical weather models, road infrastructure, and spatial human activities. In most cities, these streams remain siloed, hindering forward-looking air quality management.

The **Urban Environmental Digital Twin** addresses this challenge for the **Pune Metropolitan Area (PMC & PCMC), Maharashtra, India**. The platform integrates continuous regulatory air monitoring, numerical weather reanalysis, OpenStreetMap road topology, diurnal traffic mobility proxies, and spatial activity buffers into a unified, high-resolution analytical grid.

### Current Core Capabilities:
1. **Multi-Source Environmental Data Integration:** Synchronized hourly integration across 6 continuous air quality monitoring stations in Pune and PCMC.
2. **PM2.5 Next-Hour Forecasting:** Machine learning pipelines forecasting ambient PM2.5 concentrations at $t+1$ hour.
3. **Weather Reanalysis Integration:** High-resolution ECMWF ERA5-Land meteorological covariates and derived atmospheric dispersion terms (wind vectors, ventilation index, atmospheric stagnation flags).
4. **Traffic & Urban Context Proxy Features:** Diurnal mobility curves, road density buffers, nearest highway distances, and commercial/transit point-of-interest density.
5. **Persistence Architecture:** Normalized 3NF PostgreSQL/Supabase schema with SQLAlchemy 2.0 ORM, Alembic migrations, and local verification support.
6. **Production FastAPI Backend:** High-performance REST API with CORS, structured validation, and centralized error handling.
7. **In-Memory Baseline Model Serving:** Singleton model server loading pre-trained scikit-learn estimators once at application startup for zero-disk-I/O inference.
8. **What-If Counterfactual Scenario Simulation:** Policy intervention engine evaluating model-based PM2.5 shifts under hypothetical traffic and industrial curbs without altering raw historical records.
9. **Interactive API Documentation:** Full OpenAPI 3.0 specification with interactive Swagger UI and ReDoc explorers.

---

## 2. Implementation Status

| Phase | Description | Status | Verification |
| :--- | :--- | :---: | :--- |
| **Phase 1** | OpenAQ Air Quality Data Acquisition & Audit | **Completed** | 6 stations, 15-min raw measurements audited |
| **Phase 2** | Weather Data Acquisition (Open-Meteo / ERA5-Land) | **Completed** | 7 locations, 14,016 contiguous hours, 0 nulls |
| **Phase 3** | Traffic & Road Infrastructure Acquisition | **Completed** | OSM Overpass topology + diurnal traffic proxy |
| **Phase 4** | Activity, Industrial & Land-Use Acquisition | **Completed** | 49 industrial, 25 construction, 405 land-use, 417 POIs |
| **Phase 5** | Data Integration & Master Dataset Generation | **Completed** | 84,096 station-hours, 70 columns, 0 duplicate keys |
| **Phase 6** | ML Feature Engineering & Digital Twin Transformation | **Completed** | 118 engineered features, 5 time-series leakage checks |
| **Phase 7** | Baseline ML Model Training & Evaluation | **Completed** | 4 models evaluated, Test MAE $4.05$--$4.18\,\mu\text{g/m}^3$ |
| **Phase 8** | Database Architecture & Persistence Layer | **Completed** | 10 tables, Alembic migrations, PostgreSQL + local SQLite |
| **Phase 9** | FastAPI Backend & Real-Time Model Serving API | **Completed** | 29/29 tests passed, in-memory model serving |
| **Phase 10** | What-If / Counterfactual Simulation Engine | **Completed** | 50/50 tests passed, counterfactual API verified |
| **Phase 10.5** | Repository Consistency & Reproducibility Cleanup | **Completed** | Docs, schemas, provenance, and tests synchronized |
| **Phase 11** | Interactive React / Vite Frontend Dashboard | **Completed** | React 18, TS 5, Vite 5, Recharts, 5 pages operational |

### Future / Planned Capabilities (Not Yet Implemented):
- **SHAP Feature Attribution Layer:** Calibrated Shapley-value contribution analysis and waterfall visualizers (Planned Phase 12).
- **AI / LLM Natural Language Explanation Layer:** Natural-language translation of model predictions and scenario deltas (Planned Phase 13).
- **Advanced Spatio-Temporal Models:** Graph Neural Networks (GNNs) or temporal deep architectures.
- **Additional Data Streams:** Continuous satellite aerosol optical depth (AOD) and real-time sensor IoT telemetry.

*(These features are planned for future phases; they are not currently implemented).*

---

## 3. Datasets & Data Provenance

The system enforces strict data classification standards to guarantee transparency and scientific integrity:

### 3.1 Data Classification Taxonomy

| Classification | Meaning & Epistemological Boundary |
| :--- | :--- |
| **`OBSERVED`** | Physical measurements recorded directly by regulatory monitoring instrumentation (e.g., BAM or optical particle counters). |
| **`REANALYSIS`** | Numerical atmospheric model simulations assimilating global observations (ECMWF ERA5-Land), **not** local station sensor readings. |
| **`STATIC_ROAD_NETWORK`** | Topological vector geometry and highway infrastructure metrics extracted from OpenStreetMap. |
| **`TRAFFIC_PROXY`** | Mathematical representation of diurnal traffic volume derived from empirical surveys; **strictly not** continuous physical vehicle counts. |
| **`STATIC_INDUSTRIAL`** / **`INDUSTRIAL_PROXY`** | Geographic facility coordinates and spatial buffer counts; **strictly not** measured stack emission rates. |
| **`CONSTRUCTION_PROXY`** | Static OpenStreetMap spatial tags of active construction zones; **strictly not** daily dust emission measurements. |
| **`STATIC_LAND_USE`** | Urban zoning categories and polygon distributions surrounding monitoring stations. |
| **`ACTIVITY_PROXY`** | Commercial, institutional, and transit point-of-interest density representing human activity intensity. |

> **Scientific Transparency Rules:**
> - The traffic proxy is **never** presented as observed vehicular traffic volume.
> - Construction and industrial proxies are **never** presented as measured physical emissions.
> - Missing sensor observations remain strictly `null` and are **never** fabricated.

### 3.2 Dataset Inventory & Metrics

```
+---------------------------------------------------------------------------------------------------------+
|                                    MASTER INTEGRATED ANALYTICAL GRID                                    |
|                   84,096 Station-Hours (6 Stations x 14,016 Contiguous Hours, 70 Columns)               |
|                               Feb 18, 2025 00:00 UTC -> Sep 24, 2026 23:00 UTC                         |
+------------------------------------+------------------------------------+-------------------------------+
                  |                                    |                                  |
                  v                                    v                                  v
+------------------------------------+ +----------------------------------+ +-----------------------------+
|        POLLUTION & METEOROLOGY     | |       WEATHER REANALYSIS         | |      SPATIAL & PROXIES      |
| Source: OpenAQ v3 (CPCB/IITM)      | | Source: Open-Meteo / ERA5-Land   | | Source: OSM & Empirical CMP |
| Classification: OBSERVED           | | Classification: REANALYSIS       | | Class: PROXY & STATIC       |
| 6 Core Pune Stations               | | 7 Locations (6 Stns + Central)   | | 6 Station Buffers           |
| 15-min raw -> 14,016 hourly obs    | | 14,016 hourly timestamps/loc     | | Road network, diurnal curve |
| 63,019 valid observed PM2.5 hours  | | 98,112 rows, 0 nulls             | | Industrial & POI density    |
+------------------------------------+ +----------------------------------+ +-----------------------------+
```

- **OpenAQ Ambient Air Quality (`OBSERVED`):** 6 core continuous ambient air quality monitoring stations in Pune (Mhada Colony, Shivajinagar, Hadapsar, Bhosari, Katraj Dairy, Pashan). Modern synchronized period: **February 18, 2025 to September 24, 2026** (~19 continuous months). Raw 15-minute observations aggregated into standardized hourly timestamps.
- **Open-Meteo / ECMWF ERA5-Land (`REANALYSIS`):** 7 spatial grid points covering the 6 monitoring stations and a Central Pune reference point. 14,016 contiguous hours per location (**98,112 total rows**). Zero missing values. Covers 2m temperature, relative humidity, dewpoint, precipitation, wind speed, wind direction, surface pressure, solar radiation, cloud cover, and planetary boundary layer (PBL) height.
- **OpenStreetMap Road Network (`STATIC_ROAD_NETWORK`):** 1.5 km buffer extracts surrounding each station. Computes total road length (km), major road length (km), major road density ($\text{km/km}^2$), and distance to nearest major highway corridor (m).
- **Diurnal Traffic Intensity (`TRAFFIC_PROXY`):** Empirical 24-hour diurnal profile indexed from 0.0 to 1.0, capturing weekday and weekend traffic peaks.
- **Urban Activity Proxies (`INDUSTRIAL_PROXY`, `CONSTRUCTION_PROXY`, `ACTIVITY_PROXY`, `STATIC_LAND_USE`):** Spatial element counts within 1.5–2.0 km buffers: 49 industrial units, 25 construction sites, 405 land-use polygons, and 417 POIs.
- **Master Dataset (`master_hourly_dataset.csv`):** 84,096 rows, 70 columns. Strictly zero nulls across weather, traffic, and activity domains.
- **Feature Store (`feature_dataset.csv`):** 84,096 rows, 118 columns. Target: `target_pm25_t_plus_1`.

---

## 4. Machine Learning Baseline Models & Evaluation

The machine learning layer predicts the next-hour ambient PM2.5 concentration:
$$\hat{y}_{s, t+1} = f(\mathbf{x}_{s, t})$$

### 4.1 Implemented Baseline Models

All four baseline models are trained, evaluated, serialized in `ml/models/`, and registered in the database:

1. **Persistence Baseline (`persistence_baseline`):** Non-parametric heuristic predicting $\hat{y}_{t+1} = y_t$ with lag fallback.
2. **Standardized Ridge Regression (`ridge_baseline`):** Regularized linear model ($L_2$ penalty $\alpha=100.0$) with median imputation and standard scaling.
3. **Random Forest Regressor (`random_forest_baseline`):** Bagged ensemble of 100 regression trees (`max_depth=15`, `min_samples_split=5`).
4. **HistGradientBoosting Regressor (`gradient_boosting_baseline`):** Production default histogram-based gradient boosted trees (`max_iter=150`, `learning_rate=0.08`, `max_depth=10`).

*(Note: XGBoost, deep neural architectures, and SHAP attribution models are planned future experiments and are not currently deployed in production).*

### 4.2 Benchmark Performance on Chronological Test Holdout (Jul–Sep 2026, $N=9,769$)

*Performance metrics copied verbatim from [`docs/ml/baseline_model_report.md`](docs/ml/baseline_model_report.md):*

| Model ID | Model Name | Test MAE ($\mu\text{g/m}^3$) | Test RMSE ($\mu\text{g/m}^3$) | Test $R^2$ | Test MedAE ($\mu\text{g/m}^3$) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `persistence_baseline` | Operational Persistence Heuristic | 4.1837 | 9.8782 | 0.3628 | 2.8275 |
| `ridge_baseline` | Standardized Ridge Regression | 4.6819 | 9.9457 | 0.3540 | 3.1623 |
| `random_forest_baseline` | Random Forest Regressor (100 Trees) | **4.0475** | 9.1171 | 0.4572 | **2.9102** |
| `gradient_boosting_baseline` | HistGradientBoosting Regressor | 4.1034 | **9.1094** | **0.4581** | 2.9682 |

### Key Evaluation Findings:
- **Tree Ensembles Outperform Persistence:** Tree models outperform persistence in 5 of 6 stations; error reductions reach **7.45%** at Pashan and **4.57%** at Bhosari.
- **Pollution Episode Superiority:** During elevated pollution spikes ($> 35\,\mu\text{g/m}^3$), HistGradientBoosting reduces error from $10.47\,\mu\text{g/m}^3$ to $9.35\,\mu\text{g/m}^3$—a **10.6% error reduction ($1.11\,\mu\text{g/m}^3$ lift)** over persistence.
- **Leakage Prevention:** Features are strictly past-looking; 5 automated time-series leakage checks verified zero forward-looking data contamination.

---

## 5. What-If Counterfactual Simulation Engine

The What-If engine estimates how the trained model changes its prediction under user-specified interventions:

```
baseline_features (verified historical state) ---> baseline_prediction
                       |
                       v [modify intervention features only]
counterfactual_features --------------------------> counterfactual_prediction
                                                           |
                                                           v
                                            difference = cf_pred - base_pred
                                            reduction  = base_pred - cf_pred
```

### Supported Interventions:
- `TRAFFIC_REDUCTION`: Modifies `traffic_proxy_index`, `traffic_stagnation_ratio`, `traffic_ventilation_ratio`, `poi_traffic_interaction` by $(1.0 - p_t/100)$.
- `INDUSTRIAL_ACTIVITY_REDUCTION`: Modifies `has_industrial_within_1km` and `industrial_dispersion_ratio` by $(1.0 - p_i/100)$.
- `COMBINED_INTERVENTION`: Applies traffic and industrial curbs simultaneously and independently.

*(Note: Construction intervention is currently a documented future concept and is not yet implemented in the scenario engine).*

### Epistemological Disclosure:
Every simulation result explicitly returns:
- `uncertainty_available`: `false`
- `uncertainty_note`: `"Point estimate only; the current baseline model does not provide calibrated uncertainty."`
- `interpretation_note`: `"Counterfactual model estimate; not a causal measurement."`
- `data_classification`: `"MODEL_COUNTERFACTUAL_ESTIMATE"`

---

## 6. API Reference

The FastAPI service exposes RESTful endpoints under `/api/v1/`:

### System & Health
- `GET /health`: Live root probe verifying database connectivity, station counts, and model registry.
- `GET /api/v1/health`: Versioned health check alias.
- `GET /`: Service metadata and links to documentation.

### Stations & Observations
- `GET /api/v1/stations`: List active monitoring stations.
- `GET /api/v1/stations/{station_id}`: Station detail with static road and activity buffer metrics.
- `GET /api/v1/stations/{station_id}/observations`: Paginated historical observations (`start`, `end`, `limit`, `offset`).
- `GET /api/v1/stations/{station_id}/weather`: Paginated ECMWF ERA5-Land reanalysis records.
- `GET /api/v1/stations/{station_id}/predictions`: Historical test/validation predictions with computed errors.

### Model Registry & Real-Time Forecasting
- `GET /api/v1/models`: List registered baseline models and evaluation metrics.
- `GET /api/v1/models/{model_id}`: Detailed model registry record.
- `GET /api/v1/stations/{station_id}/forecast`: Serves real-time next-hour PM2.5 forecast ($t+1$) using in-memory model. Rejects unobserved future timestamps with structured `422 Unprocessable Content`.

### What-If Scenario Simulations
- `POST /api/v1/scenarios`: Define and validate a new intervention scenario.
- `GET /api/v1/scenarios`: List created scenarios with pagination.
- `GET /api/v1/scenarios/{scenario_id}`: Get scenario metadata and status.
- `POST /api/v1/scenarios/{scenario_id}/run`: Execute counterfactual simulation, save results, return feature audits.
- `GET /api/v1/scenarios/{scenario_id}/results`: Retrieve persisted simulation history and feature delta audits.

### Interactive API Explorers:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI Schema:** `http://localhost:8000/openapi.json`

---

## 7. Repository Structure

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
├── frontend/                         # React 18 + Vite 5 + TypeScript SPA (Phase 11 - Complete)
├── docs/
│   ├── architecture/                 # api_architecture.md, database_architecture.md, README.md
│   ├── dataset/                      # Dataset inventories, schemas, and quality reports
│   ├── ml/                           # baseline_model_report.md, counterfactual_simulation_report.md, feature_engineering_report.md
│   └── REPRODUCIBILITY.md            # Detailed environment setup, artifact regeneration, and workflow guide
├── brain.md                          # Single source of truth project brain
├── README.md                         # This file
├── docker-compose.yml                # Development PostgreSQL container configuration
├── alembic.ini                       # Alembic CLI configuration
├── .env.example                      # Sanitized environment configuration template
└── .gitignore                        # Git exclusion rules
```

---

## 8. Getting Started & Reproducibility

For a complete guide detailing tracked vs. generated files and end-to-end artifact reproduction, see [`docs/REPRODUCIBILITY.md`](docs/REPRODUCIBILITY.md).

### Quickstart (Local Backend):

1. **Clone the repository and prepare Python environment:**
   ```bash
   git clone https://github.com/sohamramshette/PCCOE.git
   cd PCCOE/urban-environmental-digital-twin
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL/Supabase URI or use local SQLite verification mode
   ```

3. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

4. **Start the FastAPI backend:**
   ```bash
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Run the full test suite:**
   ```bash
   python -m pytest backend/tests -v
   ```
   *(50/50 automated tests must pass).*

---

## 9. Security & Data Integrity Note

- **Never commit secrets:** The `.env` file is git-ignored. Only `.env.example` with empty placeholders is committed.
- **Model binaries:** Serialized model weights (`*.joblib`) and local databases (`*.db`, `*.sqlite`) are git-ignored.
- **Database immutability:** Raw observations and reanalysis data cannot be modified by forecast or scenario simulation routes.
