# FastAPI Backend & Model Serving API Architecture

> **System Component:** Application Serving & Inference Layer (Phase 9)  
> **Status:** Production-Ready & 100% Tested (29/29 Passed)  
> **Framework:** FastAPI 0.110+ / Pydantic v2 / Uvicorn  
> **Persistence Layer:** PostgreSQL 15+ / SQLAlchemy 2.0 (with local verification mode)  
> **Model Serving:** In-Memory Cached Estimators (`joblib`) / Scikit-Learn Pipeline  

---

## 1. System Architecture & Component Separation

The FastAPI backend serves as the bridge between the normalized relational database, offline-trained MLOps artifacts, and future interactive clients (React frontend, Digital Twin scenario engine):

```
+-------------------------------------------------------------------------------------------------+
|                                         FastAPI Service                                         |
|                                                                                                 |
|   +-----------------------+     +-----------------------+     +-----------------------------+   |
|   |   CORS Middleware     |     |  Structured Handlers  |     |   OpenAPI Docs Generator    |   |
|   | (Safe Origin Control) |     |  (400, 404, 422, 500) |     |      (/docs, /redoc)        |   |
|   +-----------+-----------+     +-----------+-----------+     +--------------+--------------+   |
|               |                             |                                |                  |
|               +-----------------------------+--------------------------------+                  |
|                                             |                                                   |
|                                             v                                                   |
|                                 +-----------------------+                                       |
|                                 |    api/router.py      |                                       |
|                                 +-----------+-----------+                                       |
|                                             |                                                   |
|          +--------------------+-------------+--------------+--------------------+               |
|          |                    |                            |                    |               |
|          v                    v                            v                    v               |
|  +---------------+    +---------------+            +---------------+    +---------------+       |
|  |  health.py    |    |  stations.py  |            | observations.py|   |   weather.py  |       |
|  +---------------+    +---------------+            +---------------+    +---------------+       |
|          |                    |                            |                    |               |
|          +--------------------+-------------+--------------+--------------------+               |
|                                             |                                                   |
|          +--------------------+-------------+--------------+--------------------+               |
|          |                    |                            |                    |               |
|          v                    v                            v                    v               |
|  +---------------+    +---------------+            +---------------+    +---------------+       |
|  |predictions.py |    |   models.py   |            |  forecast.py  |    |     Root      |       |
|  +---------------+    +---------------+            +---------------+    +---------------+       |
|          |                    |                            |                                    |
|          v                    v                            v                                    |
|  +------------------------------------+            +---------------------------------+          |
|  |           Services Layer           |            |      ModelServingManager        |          |
|  | (Station, Observation, Prediction) |            |   - preprocessor.joblib         |          |
|  +-----------------+------------------+            |   - gradient_boosting.joblib    |          |
|                    |                               |   - random_forest.joblib        |          |
|                    |                               |   - persistence_heuristic      |          |
|                    v                               +----------------+----------------+          |
|  +------------------------------------+                             |                           |
|  |          PostgreSQL 15+            | <---------------------------+                           |
|  |  (Stations, Obs, Weather, Preds)   |                                                         |
|  +------------------------------------+                                                         |
+-------------------------------------------------------------------------------------------------+
```

### Architectural Principles:
1. **Decoupled Business Logic:** Route handlers act strictly as request parsers and HTTP presenters. All database querying, validation, and multi-domain feature construction reside in [`backend/app/services/`](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/backend/app/services/).
2. **One-Time Startup Ingestion:** Model weights and preprocessors are loaded **once** into memory at application startup inside the `lifespan` context manager. No disk reads occur during live inference requests.
3. **Strict Epistemological Boundaries:** Reanalysis weather variables are labeled `REANALYSIS`. Observed missing sensor values remain strictly `null`. Future predictions for timestamps without real observations are rejected with informative `422 Unprocessable Content` responses rather than fabricating fake inputs.
4. **Safety Against Data Leaks:** Error handlers catch internal exceptions and return structured JSON error contracts without exposing database credentials, raw SQL, or server stack traces.

---

## 2. API Endpoints Reference

### 2.1 System & Health Probes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Root health probe. Executes a live `SELECT 1` ping against the database and returns connectivity status and entity counts. |
| `GET` | `/api/v1/health` | Versioned alias of the health check. |
| `GET` | `/` | Root service descriptor returning version metadata and links to `/docs`. |

#### Example Health Response (`GET /health`):
```json
{
  "status": "ok",
  "database": "connected",
  "service": "urban-environmental-digital-twin",
  "timestamp": "2026-09-26T14:30:00Z",
  "active_stations": 6,
  "registered_models": 4
}
```

---

### 2.2 Stations API

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/stations` | `active_only: bool = true` | Lists all 6 continuous ambient air quality stations in Pune & PCMC. |
| `GET` | `/api/v1/stations/{station_id}` | *None* | Retrieves full station metadata, including static road network (`traffic_exposure`) and urban activity (`activity_exposure`) buffer metrics. |

#### Example Station Detail (`GET /api/v1/stations/11613`):
```json
{
  "station_id": 11613,
  "station_name": "Revenue Colony-Shivajinagar, Pune - IITM",
  "zone_type": "Commercial / Educational Urban Core",
  "latitude": 18.5312,
  "longitude": 73.8446,
  "elevation_m": 560.0,
  "city": "Pune",
  "monitoring_authority": "IITM SAFAR",
  "is_active": true,
  "data_provenance": "OpenAQ API v3 / CPCB CAAQMN",
  "traffic_exposure": {
    "total_road_length_km": 118.42,
    "major_road_length_km": 14.85,
    "major_road_density_km_per_km2": 2.10,
    "distance_to_nearest_major_road_m": 45.2
  },
  "activity_exposure": {
    "industrial_elements_2km": 2,
    "has_industrial_within_1km": false,
    "poi_total_count_1_5km": 142,
    "poi_density_per_km2": 20.09,
    "dominant_landuse": "commercial"
  }
}
```

---

### 2.3 Environmental Observations API

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/stations/{station_id}/observations` | `start: datetime (UTC)`<br>`end: datetime (UTC)`<br>`limit: int (1..1000, default 50)`<br>`offset: int (default 0)` | Paginated hourly historical observed pollution measurements. Missing values remain strictly `null`. |

#### Example Observation Item:
```json
{
  "station_id": 11613,
  "total": 14016,
  "page": 1,
  "limit": 1,
  "offset": 0,
  "pages": 14016,
  "items": [
    {
      "id": 1,
      "station_id": 11613,
      "datetime_utc": "2025-02-18T00:00:00Z",
      "datetime_local_ist": "2025-02-18T05:30:00",
      "pm25": 42.15,
      "pm25_obs_count": 4,
      "pm25_completeness_flag": "FULL",
      "pm10": 88.40,
      "no2": 24.10,
      "so2": 11.20,
      "co": 0.85,
      "o3": 19.40,
      "temp_insitu_c": 19.8,
      "humidity_insitu_pct": 54.0,
      "data_provenance": "OBSERVED"
    }
  ]
}
```

---

### 2.4 Weather Reanalysis API

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/stations/{station_id}/weather` | `start: datetime (UTC)`<br>`end: datetime (UTC)`<br>`limit: int (1..1000, default 50)`<br>`offset: int (default 0)` | Paginated ECMWF ERA5-Land reanalysis. Explicitly labeled as REANALYSIS. |

#### Example Weather Response:
```json
{
  "station_id": 11613,
  "total": 14016,
  "page": 1,
  "limit": 1,
  "offset": 0,
  "pages": 14016,
  "data_classification": "REANALYSIS (ECMWF ERA5-Land via Open-Meteo)",
  "items": [
    {
      "id": 1,
      "station_id": 11613,
      "datetime_utc": "2025-02-18T00:00:00Z",
      "datetime_local_ist": "2025-02-18T05:30:00",
      "temp_c": 18.2,
      "humidity_pct": 62.0,
      "dew_point_c": 10.7,
      "precip_mm": 0.0,
      "rain_mm": 0.0,
      "pressure_hpa": 952.1,
      "wind_speed_ms": 1.45,
      "wind_dir_deg": 110.0,
      "solar_rad_wm2": 0.0,
      "cloud_cover_pct": 5.0,
      "pbl_height_m": 120.0,
      "data_provenance": "REANALYSIS (ECMWF ERA5-Land via Open-Meteo)"
    }
  ]
}
```

---

### 2.5 Historical Model Predictions API

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/stations/{station_id}/predictions` | `model_id: str`<br>`start: datetime`<br>`end: datetime`<br>`limit: int`<br>`offset: int` | Historical model predictions across validation and test splits with dynamically computed `absolute_error`. |

#### Example Prediction Item:
```json
{
  "prediction_id": 1024,
  "model_id": "gradient_boosting_baseline",
  "station_id": 11613,
  "prediction_time_utc": "2026-07-15T12:00:00Z",
  "target_time_utc": "2026-07-15T13:00:00Z",
  "horizon_hours": 1,
  "predicted_pm25": 14.82,
  "actual_pm25": 16.10,
  "absolute_error": 1.28,
  "split": "TEST"
}
```

---

### 2.6 Model Registry API

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/models` | Lists registered baseline models with algorithm types, validation MAE, and test MAE metrics. |
| `GET` | `/api/v1/models/{model_id}` | Full MLOps specification, chronological split windows, and complete evaluation metrics (MAE, RMSE, $R^2$, MedAE). Filesystem paths are omitted. |

#### Registered Models Summary:
```json
[
  {
    "model_id": "gradient_boosting_baseline",
    "model_name": "Histogram Gradient Boosting Regressor (Phase 7)",
    "model_type": "GRADIENT_BOOSTING",
    "version": "1.0.0",
    "validation_mae": 4.6686,
    "test_mae": 4.1034,
    "is_active": true
  },
  {
    "model_id": "random_forest_baseline",
    "model_name": "Random Forest Regressor (100 Trees)",
    "model_type": "RANDOM_FOREST",
    "version": "1.0.0",
    "validation_mae": 4.7360,
    "test_mae": 4.0475,
    "is_active": true
  },
  {
    "model_id": "ridge_baseline",
    "model_name": "Standardized Ridge Regression",
    "model_type": "LINEAR_RIDGE",
    "version": "1.0.0",
    "validation_mae": 5.7222,
    "test_mae": 4.6819,
    "is_active": true
  },
  {
    "model_id": "persistence_baseline",
    "model_name": "Operational Persistence Heuristic",
    "model_type": "PERSISTENCE_HEURISTIC",
    "version": "1.0.0",
    "validation_mae": 4.9410,
    "test_mae": 4.1837,
    "is_active": true
  }
]
```

---

### 2.7 Next-Hour Real-Time Forecast API

| Method | Endpoint | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/stations/{station_id}/forecast` | `timestamp: datetime (UTC, optional)`<br>`model_id: str (optional)` | Serves real-time inference for next-hour PM2.5 ($t+1$). Defaults to active baseline `gradient_boosting_baseline`. Rejects future timestamps without real inputs. |

#### Example Forecast Response:
```json
{
  "station_id": 11613,
  "station_name": "Revenue Colony-Shivajinagar, Pune - IITM",
  "prediction_time_utc": "2026-09-24T23:00:00Z",
  "target_time_utc": "2026-09-25T00:00:00Z",
  "horizon_hours": 1,
  "model_id": "gradient_boosting_baseline",
  "model_type": "GRADIENT_BOOSTING",
  "predicted_pm25": 35.62,
  "unit": "ug/m3",
  "data_availability_status": "HISTORICAL_INPUTS_VERIFIED",
  "input_features_summary": {
    "pm25_t": null,
    "temp_c": 21.8,
    "wind_speed_ms": 2.94,
    "ventilation_index": 823.2,
    "traffic_proxy_index": 0.08
  }
}
```

#### Unavailable Future Input Response (`422 Unprocessable Content`):
```json
{
  "detail": {
    "status": "UNAVAILABLE",
    "station_id": 11613,
    "detail": "Current forecast inputs unavailable: No complete observation/weather record found for station 11613 at 2030-01-01T12:00:00Z. Historical data ends at 2026-09-24T23:00:00Z.",
    "latest_available_data_utc": "2026-09-24T23:00:00Z"
  },
  "code": "HTTP_422",
  "timestamp": "2026-09-26T14:30:00Z"
}
```

---

## 3. Forecast Feature Construction & Pipeline Alignment

To guarantee that predictions in FastAPI match the offline evaluation pipeline exactly:
- `ForecastService.construct_features` extracts the exact 98 core features established in Phase 6 and 7:
  1. **Station Metadata & Buffers:** `zone_type`, `latitude`, `longitude`, road density, distance to motorway, industrial element counts, POI density.
  2. **Temporal & Diurnal:** `hour_sin`, `hour_cos`, `month_sin`, `month_cos`, `day_of_week_sin`, `day_of_week_cos`, `is_monsoon`.
  3. **Atmospheric Physics:** Wind vector decomposition (`wind_u`, `wind_v`), ventilation index ($\text{wind} \times \text{PBLH}$), dewpoint spread, precipitation indicator, atmospheric stagnation flag.
  4. **Autoregressive Lags:** Station-wise pollution lags ($t-1h, t-2h, t-3h, t-6h, t-12h, t-24h$) and weather lags ($t-1h, t-3h, t-6h$).
  5. **Past Rolling Windows:** Leakage-safe past rolling statistics (3h, 6h, 12h, 24h moving averages; 6h and 24h standard deviations).
  6. **Physical Interactions:** Traffic-stagnation ratio, traffic-ventilation ratio, industrial-dispersion ratio, POI-traffic interaction.
- The assembled feature row is transformed using `preprocessor.transform(X[core_features])`, which applies the fitted median imputer, standard scaler, and categorical one-hot encoder.

---

## 4. Error Handling & Security

- **400 Bad Request:** Triggered when query parameters fail logical validation (e.g. `start >= end`).
- **404 Not Found:** Triggered when `station_id` or `model_id` does not exist in the database.
- **422 Unprocessable Content:** Triggered when query parameters exceed physical bounds (`limit=0`, `limit=1001`), or when required environmental inputs are missing at prediction time.
- **500 Internal Server Error:** Handled by a global Starlette middleware exception handler. It logs the full traceback server-side and returns a generic, sanitized JSON response.

---

## 5. Automated Test Suite Results

A comprehensive test suite ([`backend/tests/`](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/backend/tests/)) containing **29 test cases** verified all API endpoints:

```text
============================= test session starts =============================
backend/tests/test_forecast.py::test_forecast_default_model PASSED       [  3%]
backend/tests/test_forecast.py::test_forecast_specific_timestamp PASSED  [  6%]
backend/tests/test_forecast.py::test_forecast_alternative_model PASSED   [ 10%]
backend/tests/test_forecast.py::test_forecast_persistence_model PASSED   [ 13%]
backend/tests/test_forecast.py::test_forecast_nonexistent_station PASSED [ 17%]
backend/tests/test_forecast.py::test_forecast_unavailable_future_data PASSED [ 20%]
backend/tests/test_health.py::test_health_success PASSED                 [ 24%]
backend/tests/test_health.py::test_api_v1_health_success PASSED          [ 27%]
backend/tests/test_health.py::test_health_database_failure PASSED        [ 31%]
backend/tests/test_models.py::test_list_models PASSED                    [ 34%]
backend/tests/test_models.py::test_get_model_detail PASSED               [ 37%]
backend/tests/test_models.py::test_get_nonexistent_model PASSED          [ 41%]
backend/tests/test_observations.py::test_get_observations_pagination PASSED [ 44%]
backend/tests/test_observations.py::test_null_value_preservation PASSED  [ 48%]
backend/tests/test_observations.py::test_temporal_filtering PASSED       [ 51%]
backend/tests/test_observations.py::test_invalid_temporal_parameters PASSED [ 55%]
backend/tests/test_observations.py::test_invalid_limit_bounds PASSED     [ 58%]
backend/tests/test_observations.py::test_observations_nonexistent_station PASSED [ 62%]
backend/tests/test_predictions.py::test_get_predictions_pagination PASSED [ 65%]
backend/tests/test_predictions.py::test_filter_predictions_by_model PASSED [ 68%]
backend/tests/test_predictions.py::test_absolute_error_computation PASSED [ 72%]
backend/tests/test_predictions.py::test_predictions_nonexistent_station PASSED [ 75%]
backend/tests/test_stations.py::test_list_stations PASSED                [ 79%]
backend/tests/test_stations.py::test_get_station_detail PASSED           [ 82%]
backend/tests/test_stations.py::test_get_nonexistent_station PASSED      [ 86%]
backend/tests/test_weather.py::test_get_weather_pagination_and_provenance PASSED [ 89%]
backend/tests/test_weather.py::test_weather_temporal_filtering PASSED    [ 93%]
backend/tests/test_weather.py::test_weather_invalid_time_range PASSED    [ 96%]
backend/tests/test_weather.py::test_weather_nonexistent_station PASSED   [100%]

============================== 29 passed in 10.15s ==============================
```

---

## 6. Execution & Deployment Guide

### 6.1 Server Startup Command
From the project root:
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
Interactive documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Live Health Probe: `http://localhost:8000/health`

### 6.2 Running the Test Suite
```bash
python -m pytest backend/tests -v
```
