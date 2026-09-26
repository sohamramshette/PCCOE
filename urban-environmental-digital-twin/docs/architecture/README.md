# High-Level System Architecture

> **System Component:** Urban Environmental Digital Twin Architecture  
> **Status:** Backend, ML & Persistence Implemented (Phases 1–10 Complete); Frontend & AI Attribution Planned (Phase 11+)  

The Urban Environmental Digital Twin is an integrated platform combining continuous air quality monitoring, numerical weather reanalysis, road network topology, empirical diurnal traffic mobility, and urban activity exposure metrics into an interactive digital twin.

---

## 1. System Architecture Diagram

```
+-------------------------------------------------------------------------------------------------+
|                                         Data Layer (Completed)                                  |
|   +-----------------------+     +-----------------------+     +-----------------------------+   |
|   |  OpenAQ Air Quality   |     | Open-Meteo / ERA5-Land|     |    OSM & Diurnal Traffic    |   |
|   | (6 Continuous Stns)   |     | (7 Locations, 14k hrs)|     |  (Road Network & Mobility)  |   |
|   +-----------+-----------+     +-----------+-----------+     +--------------+--------------+   |
+---------------|-----------------------------|--------------------------------|------------------+
                |                             |                                |
                v                             v                                v
+-------------------------------------------------------------------------------------------------+
|                             Data Integration & Feature Engineering                              |
|   - master_hourly_dataset.csv (84,096 station-hours, 70 columns)                                |
|   - feature_dataset.csv (118 features, strict chronological splits, 0 data leakage)              |
+---------------------------------------------+---------------------------------------------------+
                                              |
                                              v
+-------------------------------------------------------------------------------------------------+
|                            ML & Model Serving Layer (Completed)                                 |
|   - Preprocessor (ColumnTransformer)                                                            |
|   - Baseline Models: Persistence, Ridge, Random Forest, HistGradientBoosting (Test MAE: 4.05)  |
|   - ModelServingManager: In-memory cached inference with zero disk I/O per request              |
+---------------------------------------------+---------------------------------------------------+
                                              |
                                              v
+-------------------------------------------------------------------------------------------------+
|                         FastAPI Backend & Scenario Engine (Completed)                           |
|   - REST API (/api/v1/stations, /observations, /weather, /predictions, /models, /forecast)      |
|   - What-If Counterfactual Simulation Engine (/api/v1/scenarios)                                |
|   - PostgreSQL / Supabase Schema (10 normalized tables, Alembic migrations)                     |
+---------------------------------------------+---------------------------------------------------+
                                              |
                                              v
+-------------------------------------------------------------------------------------------------+
|                             Interactive Frontend & AI Layer (Planned)                           |
|   - React + Vite Dashboard & Interactive Map (Leaflet / MapLibre) [Phase 11 - Next]             |
|   - SHAP Feature Attribution Visualization [Planned Future]                                     |
|   - LLM Natural-Language Explanation Layer [Planned Future]                                     |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Component Implementation Status

### Implemented Components (Phases 1–10)
- **Data Ingestion Pipelines:** OpenAQ API v3, Open-Meteo ERA5-Land reanalysis, OSM Overpass highway and activity infrastructure queries, empirical Pune CMP mobility curves.
- **Analytical Grid & Feature Store:** Master 84,096 station-hour hourly dataset; 118-feature store with 5 time-series leakage checks.
- **Baseline Forecasting Models:** Persistence, Ridge Regression, Random Forest, and HistGradientBoosting (serving target `target_pm25_t_plus_1`).
- **PostgreSQL / Supabase Persistence Layer:** 10 normalized tables with Alembic migrations (`0001_initial_schema`, `0002_scenario_baseline_and_metadata`) and resilient local SQLite verification mode.
- **FastAPI Backend:** Production endpoints for health probes, station metadata, paginated observations, weather reanalysis, prediction logs, model registry, and real-time forecast serving.
- **What-If Counterfactual Simulation Engine:** Dedicated service evaluating model-based shifts under traffic and industrial policy curbs with structured feature delta audits and database immutability guarantees.

### Planned Components (Phase 11+)
- **Frontend Application (`frontend/`):** React + Vite interactive dashboard for geospatial exploration, station drill-downs, and what-if scenario design.
- **SHAP Feature Attribution:** Calibrated Shapley-value contribution analysis and waterfall visualizers.
- **AI Explanation Layer:** Natural-language translation of model predictions and scenario deltas using LLMs.

---

## 3. Related Documentation

- [`api_architecture.md`](api_architecture.md) — Comprehensive API endpoint specifications, request/response models, and test suite.
- [`database_architecture.md`](database_architecture.md) — Normalized 3NF relational schema, indexing, and data loaders.
- [`../ml/baseline_model_report.md`](../ml/baseline_model_report.md) — ML baseline evaluation results, station metrics, and leakage checks.
- [`../ml/counterfactual_simulation_report.md`](../ml/counterfactual_simulation_report.md) — Counterfactual simulation engine and feature mappings.
- [`../REPRODUCIBILITY.md`](../REPRODUCIBILITY.md) — End-to-end data acquisition and model reproduction manual.
