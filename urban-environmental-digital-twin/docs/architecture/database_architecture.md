# PostgreSQL Database & Application Data Architecture

> **System Component:** Persistence Layer (Phase 8)  
> **Status:** Production-Ready & Verified  
> **Target Engine:** PostgreSQL 15+ / 16+ (with dialect-agnostic local verification fallback)  
> **ORM & Migrations:** SQLAlchemy 2.0 / Alembic 1.13+  
> **Data Integrity:** Fully Normalized, Strict FKs, UTC Timestamps, NULL Preservation  

---

## 1. Executive Summary & Architectural Separation

The Urban Environmental Digital Twin relies on a dual-tier data architecture to balance high-throughput analytical modeling with real-time, low-latency operational serving:

1. **Analytical Feature Store (`ml/data/processed/features/`):** Flat, denormalized 118-column feature matrices optimized for vectorization, lag generation, rolling statistics, cross-validation temporal folds, and scikit-learn/LightGBM model training.
2. **Normalized Application Persistence Layer (PostgreSQL):** A strictly normalized 3NF relational database schema designed to support interactive dashboards, geospatial queries, historical air quality auditing, model governance tracking, multi-horizon forecast serving, and counterfactual what-if scenario simulations.

```
                           +----------------------------------------+
                           |       Upstream Multi-Source Data       |
                           | (OpenAQ, ERA5, OSM, Traffic Profile)   |
                           +-------------------+--------------------+
                                               |
                                               v
                           +----------------------------------------+
                           |  Analytical Dataset Integration Engine |
                           |      (master_hourly_dataset.csv)       |
                           +---------+--------------------+---------+
                                     |                    |
             +-----------------------+                    +------------------------+
             v                                                                     v
+-------------------------------+                                +-----------------------------------+
|  ML Feature Store (118 cols)  |                                |   Normalized PostgreSQL Serving   |
|  - Lags & rolling windows     |                                |   - Station metadata              |
|  - Cyclical encodings         |                                |   - Hourly observations           |
|  - Offline model training     |                                |   - Hourly ERA5 reanalysis        |
|  ml/data/processed/features/  |                                |   - Static spatial exposures      |
+-------------------------------+                                |   - Traffic diurnal proxy         |
                                                                 |   - Model registry & predictions  |
                                                                 |   - What-If Digital Twin scenarios|
                                                                 +-----------------------------------+
```

### Why the 118-Column Feature Matrix is NOT Duplicated into SQL
- **Schema Rigidity vs Evolution:** ML feature sets change frequently (e.g., trying a 72-hour rolling mean, differential lags, polynomial interactions). Forcing 118 dynamically derived columns into a production relational database causes brittle schema migrations and massive row-bloat.
- **Query Optimization:** API clients and web dashboards rarely request 118 columns simultaneously. A frontend map requests current observations (`pm25`, `aqi_category`), historical 24-hour trends, or 1-hour forecasts. Storing observations cleanly in 19 columns reduces I/O by over 80%.
- **Separation of Concerns:** Feature computation belongs in reproducible preprocessing/pipeline code (`ml/src/features/`), whereas transactional state, auditability, and relational integrity belong in PostgreSQL.

---

## 2. Entity-Relationship Overview

```mermaid
erDiagram
    stations ||--o{ environmental_observations : "monitors"
    stations ||--o{ weather_reanalysis : "spatially joined"
    stations ||--|| station_traffic_exposure : "characterizes"
    stations ||--|| station_activity_exposure : "characterizes"
    stations ||--o{ model_predictions : "forecasted for"
    stations ||--o{ scenarios : "targeted by"

    model_registry ||--o{ model_predictions : "generates"
    model_registry ||--o{ scenario_results : "evaluated with"

    scenarios ||--o{ scenario_results : "contains"

    stations {
        int station_id PK
        string station_name
        float latitude
        float longitude
        string zone_type
        string city
        string monitoring_authority
        boolean is_active
        string data_provenance
    }

    environmental_observations {
        bigint observation_id PK
        int station_id FK
        datetime datetime_utc "Indexed, Unique compound"
        datetime datetime_local_ist
        float pm25
        float pm10
        float no2
        float so2
        float co
        float o3
        string pm25_completeness_flag
        string data_provenance
    }

    weather_reanalysis {
        bigint weather_id PK
        int station_id FK
        datetime datetime_utc "Indexed, Unique compound"
        datetime datetime_local_ist
        float temp_c
        float humidity_pct
        float dew_point_c
        float precip_mm
        float rain_mm
        float pressure_hpa
        float wind_speed_ms
        float wind_dir_deg
        float solar_rad_wm2
        float cloud_cover_pct
        float pbl_height_m
        string data_provenance
    }

    station_traffic_exposure {
        int station_id PK, FK
        float road_dist_motorway_m
        float road_dist_primary_m
        float road_dist_secondary_m
        float road_len_primary_500m
        float road_len_primary_1000m
        float road_len_total_1000m
        float traffic_exposure_score
        string data_provenance
    }

    station_activity_exposure {
        int station_id PK, FK
        float ind_dist_facility_m
        int ind_count_1000m
        int ind_count_2000m
        float constr_dist_active_m
        int constr_count_1000m
        int commercial_count_1000m
        int residential_count_1000m
        float activity_density_score
        string data_provenance
    }

    traffic_proxy {
        int proxy_id PK
        int hour_of_day "0 to 23"
        string day_type "WEEKDAY or WEEKEND"
        float traffic_multiplier
        string data_provenance
    }

    model_registry {
        string model_id PK
        string model_name
        string model_type
        string version
        string target_variable
        int horizon_hours
        string feature_set_version
        jsonb validation_metrics
        jsonb test_metrics
        string artifact_path
        boolean is_active
    }

    model_predictions {
        bigint prediction_id PK
        string model_id FK
        int station_id FK
        datetime prediction_time_utc "Indexed"
        datetime target_time_utc "Indexed"
        int horizon_hours
        float predicted_pm25
        float actual_pm25
        float absolute_error
        string split_type
    }

    scenarios {
        string scenario_id PK
        string scenario_name
        int station_id FK
        string model_id FK
        float traffic_reduction_pct
        float industrial_curfew_pct
        float construction_ban_pct
        string meteorological_context
        string causal_disclaimer
    }

    scenario_results {
        bigint result_id PK
        string scenario_id FK
        datetime target_time_utc
        float baseline_predicted_pm25
        float scenario_predicted_pm25
        float delta_pm25
        float percentage_change
    }
```

---

## 3. Strict Data Classification & Provenance Conventions

Every column and table follows explicit ontological labeling to prevent scientific misrepresentation or user deception:

| Category | Classification | Tables | Description & Epistemological Status |
| :--- | :--- | :--- | :--- |
| **A. Observed Ground Truth** | `OBSERVED` | `stations`, `environmental_observations` | Actual physical sensor readings from IITM/SAFAR and MPCB continuous ambient monitoring stations. Missing values are preserved strictly as `NULL`. Never interpolated into fake 0.0 values. |
| **B. Atmospheric Reanalysis** | `REANALYSIS` | `weather_reanalysis` | Numerical model outputs from ECMWF ERA5-Land via Open-Meteo reanalysis. Sourced at 0.1° grid spatial resolution. Clearly documented as reanalysis rather than in-situ weather observations. |
| **C. Spatial Static Proxies** | `SPATIAL_PROXY` | `station_traffic_exposure`, `station_activity_exposure` | Fixed GIS exposures computed via Overpass OSM queries and geodetic distance buffers (500m, 1000m, 2000m). Represent static land use, highway distance, and industrial density. |
| **D. Diurnal Dynamic Proxy** | `TRAFFIC_PROXY` | `traffic_proxy` | Empirical 24-hour mobility multiplier curves derived from Google Community Mobility and TomTom congestion indexes. Explicitly designated as a proxy; not vehicle count sensors. |
| **E. Governed ML Artifacts** | `MODEL_REGISTRY` | `model_registry`, `model_predictions` | Fully documented models trained across Phase 7 (Ridge, Persistence, Random Forest, Gradient Boosting). Contains deterministic evaluation metrics and verified offline model outputs. |
| **F. Counterfactual Scenarios** | `MODELLED_SCENARIO`| `scenarios`, `scenario_results` | What-if policy simulations (e.g., Low Emission Zones, construction curfews). Explicitly labeled with causal disclaimers; models represent associative shifts, not causal certainty. |

---

## 4. Table Specifications

### 4.1 `stations`
- **Purpose:** Authoritative registry of the 6 official continuous air quality monitoring stations across the Pune Metropolitan Region.
- **Primary Key:** `station_id` (Integer - matches official OpenAQ station ID).
- **Key Columns:** `station_name`, `latitude`, `longitude`, `zone_type`, `city`, `monitoring_authority`, `elevation_m`, `is_active`, `data_provenance`.
- **Row Count:** Exactly 6 rows.

### 4.2 `environmental_observations`
- **Purpose:** High-resolution hourly time-series of in-situ ambient pollution measurements.
- **Primary Key:** `observation_id` (BigInteger, auto-incrementing).
- **Foreign Key:** `station_id` references `stations(station_id)` on delete CASCADE.
- **Unique Constraint:** `(station_id, datetime_utc)` enforces strict temporal uniqueness per station.
- **Key Columns:** `datetime_utc`, `datetime_local_ist`, `pm25`, `pm10`, `no2`, `so2`, `co`, `o3`, `pm25_completeness_flag`, `data_provenance`.
- **Integrity Rule:** Sensor dropouts remain `NULL`. Never filled with zeroes or unscientific synthetic values.
- **Row Count:** 84,096 rows (14,016 hourly steps × 6 stations).

### 4.3 `weather_reanalysis`
- **Purpose:** Spatio-temporally aligned atmospheric parameters from ECMWF ERA5-Land reanalysis.
- **Primary Key:** `weather_id` (BigInteger, auto-incrementing).
- **Foreign Key:** `station_id` references `stations(station_id)`.
- **Unique Constraint:** `(station_id, datetime_utc)`.
- **Key Columns:** `temp_c`, `humidity_pct`, `dew_point_c`, `precip_mm`, `rain_mm`, `pressure_hpa`, `wind_speed_ms`, `wind_dir_deg`, `solar_rad_wm2`, `cloud_cover_pct`, `pbl_height_m`, `grid_resolution_km` (10.0), `data_provenance` (`ECMWF_ERA5_LAND_OPEN_METEO_REANALYSIS`).
- **Row Count:** 84,096 rows.

### 4.4 `station_traffic_exposure` & `station_activity_exposure`
- **Purpose:** Station-level static spatial features derived from OpenStreetMap spatial buffers.
- **Primary Key / Foreign Key:** `station_id` references `stations(station_id)`.
- **Traffic Columns:** `road_dist_motorway_m`, `road_dist_primary_m`, `road_dist_secondary_m`, `road_len_primary_500m`, `road_len_primary_1000m`, `road_len_total_1000m`, `traffic_exposure_score`.
- **Activity Columns:** `ind_dist_facility_m`, `ind_count_1000m`, `ind_count_2000m`, `constr_dist_active_m`, `constr_count_1000m`, `commercial_count_1000m`, `residential_count_1000m`, `activity_density_score`.
- **Row Count:** 6 rows each (1 per station).

### 4.5 `traffic_proxy`
- **Purpose:** Baseline 24-hour diurnal mobility distribution curve representing human activity cycles.
- **Primary Key:** `proxy_id` (Integer, auto-incrementing).
- **Unique Constraint:** `(hour_of_day, day_type)`.
- **Key Columns:** `hour_of_day` (0-23), `day_type` (`WEEKDAY` or `WEEKEND`), `traffic_multiplier` (normalized 0.1 to 1.0), `peak_period_classification`, `data_provenance`.
- **Row Count:** 48 rows (24 hours × 2 day types).

### 4.6 `model_registry`
- **Purpose:** MLOps governance table tracking trained ML model specifications, artifacts, and temporal validation results.
- **Primary Key:** `model_id` (String - e.g., `gradient_boosting_baseline`).
- **Key Columns:** `model_name`, `model_type`, `version`, `target_variable` (`pm25`), `horizon_hours` (1), `feature_set_version`, `training_start_utc`, `training_end_utc`, `validation_start_utc`, `validation_end_utc`, `test_start_utc`, `test_end_utc`, `validation_metrics` (JSONB), `test_metrics` (JSONB), `artifact_path`, `is_active`.
- **Row Count:** 4 rows (Ridge, Persistence, Random Forest, Gradient Boosting).

### 4.7 `model_predictions`
- **Purpose:** Persistence of model evaluation and future serving forecasts, enabling rapid temporal querying, error tracking, and visual comparison in user dashboards.
- **Primary Key:** `prediction_id` (BigInteger, auto-incrementing).
- **Foreign Keys:** `model_id` references `model_registry(model_id)`, `station_id` references `stations(station_id)`.
- **Indexes:** Compound index on `(station_id, target_time_utc)`, and `(model_id, target_time_utc)`.
- **Key Columns:** `prediction_time_utc`, `target_time_utc`, `horizon_hours`, `predicted_pm25`, `actual_pm25`, `absolute_error`, `split_type` (`VALIDATION` or `TEST_HOLDOUT`).
- **Row Count:** 80,892 rows (41,816 validation + 39,076 test holdout).

### 4.8 `scenarios` & `scenario_results`
- **Purpose:** Counterfactual what-if scenario definitions and time-series impact predictions for the Urban Digital Twin simulator.
- **Key Columns (`scenarios`):** `scenario_id` (PK, UUID), `scenario_name`, `station_id` (FK), `model_id` (FK), `traffic_reduction_pct`, `industrial_curfew_pct`, `construction_ban_pct`, `meteorological_context`, `baseline_reference_period`, `causal_disclaimer`.
- **Key Columns (`scenario_results`):** `result_id` (PK), `scenario_id` (FK), `target_time_utc`, `baseline_predicted_pm25`, `scenario_predicted_pm25`, `delta_pm25`, `percentage_change`.
- **Status:** Fully provisioned in schema; ready for future simulation algorithms.

---

## 5. Indexing & Query Optimization Strategy

Indexes have been selectively placed based strictly on anticipated API and frontend dashboard access patterns:

1. **`ix_obs_station_time` on `environmental_observations (station_id, datetime_utc)`:** Supports rapid time-range queries for station history charts (`WHERE station_id = 11613 AND datetime_utc BETWEEN ...`).
2. **`ix_weather_station_time` on `weather_reanalysis (station_id, datetime_utc)`:** Accelerates synchronous joining with observations.
3. **`ix_pred_station_target` on `model_predictions (station_id, target_time_utc)`:** Supports instant retrieval of forecasted curves alongside observed truth.
4. **`ix_pred_model_target` on `model_predictions (model_id, target_time_utc)`:** Enables model comparison dashboards across Pune.
5. **`ix_scenario_res_scen_time` on `scenario_results (scenario_id, target_time_utc)`:** Enables fast retrieval of what-if scenario impact curves.

---

## 6. Alembic Migration Strategy

Alembic has been initialized and configured under `backend/alembic/` with configuration in `alembic.ini`.

- **Metadata Binding:** `backend/alembic/env.py` imports `Base.metadata` from `backend.app.models`, enabling automated schema inspection and migration diffs.
- **Initial Migration:** `backend/alembic/versions/0001_initial_schema.py` encapsulates the entire normalized schema (10 tables, all primary/foreign keys, indexes, unique constraints).
- **PostgreSQL DDL Compilation:** The migration was tested and verified offline using:
  ```bash
  python -m alembic -c alembic.ini upgrade head --sql
  ```
  The resulting DDL correctly generated native PostgreSQL types (`BIGSERIAL`, `TIMESTAMP WITH TIME ZONE`, `JSONB`, compound constraints).

---

## 7. Data Loading & Ingestion Pipeline

Three reproducible loading scripts under `backend/scripts/` populate the relational persistence layer from existing, validated project artifacts:

| Script | Target Tables | Source Datasets | Rows Loaded | Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `backend/scripts/load_reference_data.py` | `stations`, `station_traffic_exposure`, `station_activity_exposure`, `traffic_proxy`, `model_registry` | `master_hourly_dataset.csv`, `pune_traffic_profile.csv`, `model_comparison.csv`, `metrics.json` | 68 rows | Upsert/Merge, idempotent |
| `backend/scripts/load_observations.py` | `environmental_observations`, `weather_reanalysis` | `ml/data/processed/integration/master_hourly_dataset.csv` | 168,192 rows (84,096 each) | Chunked batching (2,500 rows/batch), NULL preservation, explicit reanalysis labeling |
| `backend/scripts/load_predictions.py` | `model_predictions` | `ml/results/test_predictions.csv`, `val_predictions.csv` | 80,892 rows | Filtered to registered baseline models, compound indexed |

---

## 8. Database Validation & Integrity Verification

An automated verification suite (`backend/scripts/validate_database.py`) executes 8 comprehensive integrity checks:

```text
===========================================================================
URBAN ENVIRONMENTAL DIGITAL TWIN: DATABASE VALIDATION SUITE
===========================================================================

--- Check 1: Verifying All 10 Normalized Tables Exist ---
  [PASSED] All 10 normalized tables verified:
           - environmental_observations     (19 columns)
           - model_predictions              (10 columns)
           - model_registry                 (17 columns)
           - scenario_results               (9 columns)
           - scenarios                      (13 columns)
           - station_activity_exposure      (20 columns)
           - station_traffic_exposure       (14 columns)
           - stations                       (12 columns)
           - traffic_proxy                  (7 columns)
           - weather_reanalysis             (19 columns)

--- Check 2: Verifying 6 Pune Monitoring Stations ---
  [PASSED] Verified all 6 official monitoring stations:
           [11609] Mhada Colony, Pune - IITM | North-Eastern Residential / Airport Corridor (Pune)
           [11613] Revenue Colony-Shivajinagar, Pune - IITM | Commercial / Educational Urban Core (Pune)
           [60658] Hadapsar, Pune - IITM | Eastern Commercial / Mixed Suburban Corridor (Pune)
           [3409331] Bhosari, Pune - IITM | Northern Heavy Industrial / Highway Hub (PCMC) (Pimpri-Chinchwad)
           [3409438] Katraj Dairy, Pune - MPCB | Southern Highway Chokepoint / Ghat Gateway (Pune)
           [3409526] Panchawati_Pashan, Pune - IITM | Western Institutional / Foothill Background (Pune)

--- Check 3: Verifying Unique Constraint on (station_id, datetime_utc) ---
  [PASSED] IntegrityError successfully raised: Duplicate station-hour prevented.

--- Check 4: Verifying Foreign Key Referential Integrity ---
  [PASSED] IntegrityError successfully raised: Invalid station_id rejected.

--- Check 5: Verifying NULL Value Preservation in Observations ---
  [PASSED] Missing sensor observations remain strictly NULL (not fabricated into 0.0).

--- Check 6: Verifying Model Registry Entries & Metrics ---
  [PASSED] Verified 4 registered baseline models:
           - gradient_boosting_baseline     | Type: GRADIENT_BOOSTING      | Val MAE: 4.6686 | Test MAE: 4.1034
           - random_forest_baseline         | Type: RANDOM_FOREST          | Val MAE: 4.7360 | Test MAE: 4.0475
           - ridge_baseline                 | Type: LINEAR_RIDGE           | Val MAE: 5.7222 | Test MAE: 4.6819
           - persistence_baseline           | Type: PERSISTENCE_HEURISTIC  | Val MAE: 4.9410 | Test MAE: 4.1837

--- Check 7: Verifying What-If Scenario Table Readiness ---
  [PASSED] What-If Scenario schema functional (parent-child relationship verified).
           Scenario 'Shivajinagar Low Emission Zone': Delta = -5.5 ug/m3 (-13.1%)

--- Check 8: Table Record Counts Summary ---
  stations                      :       6 rows
  station_traffic_exposure      :       6 rows
  station_activity_exposure     :       6 rows
  traffic_proxy                 :      48 rows
  model_registry                :       4 rows
  environmental_observations    :  84,096 rows
  weather_reanalysis            :  84,096 rows
  model_predictions             :  80,892 rows
  scenarios                     :       0 rows (schema ready)
  scenario_results              :       0 rows (schema ready)

===========================================================================
ALL DATABASE INTEGRITY CHECKS PASSED (100% VERIFIED)
===========================================================================
```

---

## 9. Environment Configuration & Reproduction

### 9.1 Environment Variables (`.env.example`)
To connect to an active PostgreSQL database, configure `.env` with:
```env
# Full SQLAlchemy connection string
DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/urban_digital_twin

# PostgreSQL individual components
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=urban_digital_twin
```

### 9.2 Complete Reproduction Workflow
```bash
# 1. Apply Alembic migrations to PostgreSQL
python -m alembic -c alembic.ini upgrade head

# 2. Ingest reference metadata, stations, spatial exposures, traffic proxy, and registered models
python backend/scripts/load_reference_data.py

# 3. Ingest hourly observations and weather reanalysis (chunked batching)
python backend/scripts/load_observations.py

# 4. Ingest ML baseline model predictions
python backend/scripts/load_predictions.py

# 5. Run full automated validation suite
python backend/scripts/validate_database.py
```
