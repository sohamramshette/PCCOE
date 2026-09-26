# Urban Environmental Digital Twin — Reproducibility & Regeneration Guide

> **System Component:** End-to-End Pipeline Reproducibility Manual  
> **Target System:** Urban Environmental Digital Twin (Pune / PCMC)  
> **Status:** Phase 10.5 Verified  

---

## 1. Overview & Repository Architecture

This document details the exact boundaries between code tracked in version control, generated data artifacts, and serialized model weights. It provides a deterministic, step-by-step reproduction guide to regenerate all datasets, features, models, database records, and verification tests from scratch.

---

## 2. Tracked vs. Untracked / Generated Files

To prevent repository bloat, eliminate security vulnerabilities, and adhere to clean MLOps practices, the repository strictly differentiates between source code and generated binaries.

### 2.1 Tracked in Version Control (`git status`)
- **Source Code:**
  - Machine learning pipeline: `ml/src/data/`, `ml/src/features/`, `ml/src/models/`
  - Backend application: `backend/app/` (routes, models, schemas, services, database engine, main factory)
  - Database migrations: `backend/alembic/versions/`, `backend/alembic/env.py`, `alembic.ini`
  - Database loaders and validators: `backend/scripts/`
  - Automated test suite: `backend/tests/`
- **Documentation & Specifications:**
  - Single source of truth: `brain.md`
  - Project documentation: `docs/architecture/`, `docs/dataset/`, `docs/ml/`, `README.md`
- **Metadata, Schemas & Manifests:**
  - Ingestion manifests: `ml/data/raw/pollution/openaq/metadata/ingestion_manifest.json`, `ml/data/raw/weather/openmeteo/metadata/weather_manifest.json`, `ml/data/raw/traffic/osm/metadata/traffic_manifest.json`, `ml/data/raw/activity/metadata/activity_manifest.json`
  - Feature store metadata: `ml/data/processed/features/feature_manifest.json`, `ml/data/processed/features/feature_quality_report.json`
  - Model evaluation outputs: `ml/results/evaluation_report.json`, `ml/results/model_comparison.csv`, `ml/results/station_metrics.csv`, `ml/results/subgroup_metrics.csv`
- **Configuration Templates:**
  - `.env.example`, `docker-compose.yml`, `requirements.txt`

### 2.2 Untracked / Generated Artifacts (`.gitignore`)
- **Trained Model Binaries:**
  - Serialized estimators (`*.joblib`, `*.pkl` in `ml/models/`) are excluded from Git. Binary models are several tens of megabytes (e.g., `random_forest_baseline.joblib` is ~34 MB). They are generated deterministically by the training scripts.
- **Local Databases & State:**
  - SQLite databases (`backend/*.db`, `*.sqlite`, `*.sqlite3`) are excluded.
- **Secrets & Credentials:**
  - Local environment files (`.env`, `.env.*`) containing database passwords or API keys are excluded.
- **Node & Frontend Artifacts:**
  - `node_modules/`, `dist/`, `.vite/` (planned for Phase 11).
- **Python & Pytest Caches:**
  - `__pycache__/`, `.pytest_cache/`, `*.pyc`.

---

## 3. End-to-End Logical Reproduction Workflow

The complete pipeline can be reproduced sequentially from raw data ingestion through API serving:

```
  [1. Env Config]
         ↓
  [2. Ingest OpenAQ] ──→ [3. Ingest Weather] ──→ [4. Ingest Traffic & OSM]
                                                        ↓
                                              [5. Build Master Dataset]
                                                        ↓
                                              [6. Feature Store Engineering]
                                                        ↓
                                              [7. Train & Evaluate Models]
                                                        ↓
                                              [8. Alembic DB Migrations]
                                                        ↓
                                              [9. Seed & Validate Database]
                                                        ↓
                                              [10. Start FastAPI Server]
                                                        ↓
                                              [11. Run Automated Tests]
```

### Step 1: Environment & Dependency Setup
Clone the repository and install dependencies in a clean virtual environment:
```bash
# Clone
git clone https://github.com/sohamramshette/PCCOE.git
cd PCCOE/urban-environmental-digital-twin

# Create virtual environment
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Install backend & ML dependencies
pip install -r backend/requirements.txt
```

Create local environment configuration:
```bash
cp .env.example .env
```
*Note: If no PostgreSQL instance is configured, the backend automatically operates in local verification mode using SQLite (`backend/dev_digital_twin.db`).*

---

### Step 2: Data Acquisition & Ingestion

#### 2.1 Ingest OpenAQ Air Quality Data:
```bash
python ml/src/data/ingest_openaq.py
```
- Fetches 15-minute observations for the 6 core Pune stations (Mhada Colony, Shivajinagar, Hadapsar, Bhosari, Katraj Dairy, Pashan).
- Writes raw measurements to `ml/data/raw/pollution/openaq/` and standardized hourly data to `ml/data/processed/pollution/openaq_hourly_processed.csv`.

#### 2.2 Ingest ECMWF ERA5-Land Weather Reanalysis:
```bash
python ml/src/data/ingest_weather.py
```
- Queries the Open-Meteo Historical Weather API across the 7 geographic locations.
- Writes raw records to `ml/data/raw/weather/openmeteo/` and standardized hourly records to `ml/data/processed/weather/weather_hourly_processed.csv`.

#### 2.3 Ingest OpenStreetMap Road Network & Diurnal Traffic Proxy:
```bash
python ml/src/data/ingest_traffic.py
```
- Extracts highway vector topology via Overpass API within 1.5 km buffers.
- Combines with Pune Comprehensive Mobility Plan (CMP) diurnal curves.
- Outputs `ml/data/processed/traffic/station_road_features.csv` and `traffic_hourly_proxy.csv`.

#### 2.4 Ingest Urban Activity, Industrial, Construction & Land Use:
```bash
python ml/src/data/ingest_activity.py
```
- Extracts industrial elements (2 km buffer), construction sites (1.5 km buffer), land-use polygons, and POIs.
- Outputs `ml/data/processed/activity/station_activity_features.csv`.

---

### Step 3: Dataset Integration & Analytical Grid Assembly

Execute the cross-domain spatio-temporal join:
```bash
python ml/src/data/build_master_dataset.py
```
- Performs exact `(station_id, datetime_utc)` alignment across all 4 domains.
- Verifies 0 duplicate primary keys and 0 nulls across weather, traffic, and activity covariates.
- Generates `ml/data/processed/integration/master_hourly_dataset.csv` (84,096 station-hours, 70 columns).

---

### Step 4: ML Feature Store Engineering

Generate the 118-feature model-ready feature store:
```bash
python ml/src/features/build_features.py
```
- Computes cyclical time encodings, wind vectors, atmospheric ventilation index, autoregressive lags (1h–24h), rolling statistics (3h–24h), and non-linear dispersion interaction terms.
- Executes automated 5-point time-series leakage checks.
- Generates strictly chronological splits:
  - `ml/data/processed/features/train.csv` (Feb 18, 2025 → Mar 31, 2026; 58,608 rows)
  - `ml/data/processed/features/validation.csv` (Apr 01, 2026 → Jun 30, 2026; 13,104 rows)
  - `ml/data/processed/features/test.csv` (Jul 01, 2026 → Sep 24, 2026; 12,384 rows)
  - Metadata: `feature_manifest.json` and `feature_quality_report.json`.

---

### Step 5: Baseline ML Training & Model Artifact Generation

Train, evaluate, and serialize baseline models:
```bash
# 1. Train models and generate preprocessor and joblib artifacts
python ml/src/models/train_baselines.py

# 2. Evaluate models against validation and holdout test partitions
python ml/src/models/evaluate_models.py

# 3. Or run the full consolidated experiment runner
python ml/src/models/run_baseline_experiments.py
```
- Generates model artifacts in `ml/models/`:
  - `preprocessor.joblib` (fitted scikit-learn `ColumnTransformer`)
  - `gradient_boosting_baseline.joblib` (HistGradientBoosting)
  - `random_forest_baseline.joblib` (Random Forest)
  - `ridge_baseline.joblib` (Ridge Regression)
  - `feature_names.json` (canonical 98 core features manifest)
- Generates metrics in `ml/results/` (`model_comparison.csv`, `station_metrics.csv`, `evaluation_report.json`, figures).

---

### Step 6: Database Setup & Seed Ingestion

Apply Alembic migrations to construct the normalized schema:
```bash
alembic upgrade head
```

Load reference stations, exposure buffers, observations, and prediction logs:
```bash
# 1. Load reference stations, traffic exposure, activity exposure, traffic proxy, model registry
python backend/scripts/load_reference_data.py

# 2. Load 84,096 observations and 84,096 weather reanalysis rows
python backend/scripts/load_observations.py

# 3. Load 80,892 test and validation prediction logs
python backend/scripts/load_predictions.py

# 4. Verify database integrity and row counts
python backend/scripts/validate_database.py
```

---

### Step 7: Application Server Launch & API Verification

Start the FastAPI application:
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify service endpoints:
- Root Health Probe: `http://localhost:8000/health`
- Interactive API Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

### Step 8: Automated Test Suite

Run the full automated test suite:
```bash
python -m pytest backend/tests -v
```
All **50 automated test cases** must pass:
- Forecast serving: 6 tests
- Health probes: 3 tests
- Model registry: 3 tests
- Observations: 6 tests
- Predictions: 4 tests
- What-If Scenarios & Counterfactual Engine: 21 tests
- Stations: 3 tests
- Weather reanalysis: 4 tests

---

## 4. Frontend Reproduction (Phase 11 — Next)

The frontend application will be initialized in Phase 11 within the `frontend/` directory using React + Vite. Currently, `frontend/` contains only `.gitkeep`.
