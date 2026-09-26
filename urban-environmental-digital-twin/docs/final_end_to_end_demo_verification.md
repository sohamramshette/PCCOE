# Urban Environmental Digital Twin: Final End-to-End Demo Verification Report

**Project**: Urban Environmental Digital Twin  
**Verification Date**: September 27, 2026  
**Analytical Synchronization Window**: 2025-02-18 00:00:00 UTC → 2026-09-24 23:00:00 UTC  
**Evaluation Scope**: Full-Stack Architecture (FastAPI Backend, SQLite/PostgreSQL Persistence Layer, Scikit-Learn Model Serving Engine, React/Vite Frontend, Multi-Intervention Scenario Engine)

---

## 1. Services Verified

Both frontend and backend services were started, validated concurrently, and monitored under live daemon processes:

- **Backend Service**:
  - Command: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000`
  - Protocol & Port: `http://localhost:8000`
  - Health Endpoint: `GET /health` and `GET /api/v1/health`
  - Health Response:
    ```json
    {
      "status": "ok",
      "database": "connected",
      "service": "urban-environmental-digital-twin",
      "timestamp": "2026-09-26T22:24:47.341778Z",
      "active_stations": 6,
      "registered_models": 4
    }
    ```
- **Frontend Service**:
  - Command: `npm run dev` (Vite v5.4.21 dev server)
  - Protocol & Port: `http://localhost:5173`
  - UI Backend Connectivity: Confirmed via UI Sidebar indicator displaying `Connected` with an active green pulse and zero CORS errors.

---

## 2. Dashboard Verification

The primary dashboard was verified across visual aesthetics, data binding, and temporal integrity:

- **Station Scope**: All 6 active network stations are accessible via the header dropdown selector (`11613`, `11609`, `60658`, `3409331`, `3409438`, `3409526`).
- **Analytical Period Banner**: Explicitly rendered in the navbar as:
  `Synchronized Analytical Period: Feb 18, 2025 → Sep 24, 2026`.
- **Temporal Bound Adherence**:
  - No timestamp prior to `2025-02-18 00:00 UTC` is displayed.
  - No timestamp after `2026-09-24 23:00 UTC` is displayed.
  - Previous local timezone offset artifacts (displaying `17 Feb 2025, 18:30 UTC` in IST UTC+05:30) were completely resolved via UTC-normalized parsing.
- **Provenance Badging**:
  - Observed PM2.5 values are labeled with high-contrast **`OBSERVED`** badges.
  - Model forecasts are labeled with **`PREDICTED`** badges.
  - Reanalysis weather parameters (temperature, relative humidity, wind speed, surface pressure) display **`REANALYSIS`** (ERA5-Land).
  - Traffic and activity metrics display **`PROXY`** and **`OSM BUFFER`** provenance badges.
  - Missing sensor records display **`NO DATA`** without artificial synthetic replacement.
- **Chronological Ordering**: Chart time-series axes are ordered chronologically ascending from oldest (`18 Feb, 00:00 UTC`) on the left to newest (`19 Feb, 23:00 UTC`) on the right.
- **Dynamic Station Switching**: Switching stations (tested between Station `11613` and Station `11609`) smoothly refreshed the station metadata card, geographic coordinates, exposure metrics, and observation time-series without layout jumps or unhandled promise rejections.

---

## 3. Station Network Verification

Navigating to `/stations`:

- **Active Network Count**: 6 out of 6 official monitoring stations are registered:
  1. `11613` - Sector 25, Pradhikaran, PCMC (MPCB / CPCB)
  2. `11609` - Bhosari MIDC Industrial Zone (MPCB / CPCB)
  3. `60658` - Pimpri Chinchwad Municipal Complex (IITM / SAFAR)
  4. `3409331` - Akurdi Railway Station Corridor (PCMC Smart City)
  5. `3409438` - Hinjawadi Phase 1 IT Park / Wakad Border (PCMC Smart City)
  6. `3409526` - Chakan Industrial Area / Talawade IT Corridor (PCMC Smart City)
- **Station Cards Display**:
  - Station name, operational authority, and numerical station ID.
  - High-precision geographic latitude and longitude.
  - Active operational status badge (`ACTIVE`).
  - Strict provenance badges (`GROUND OBSERVATION STATION`).
- **Interactive Navigation**: Every station card features an active link into `/stations/{station_id}`.

---

## 4. Station Diagnostics & Detail Verification

Navigating to `/stations/11613` (and verified across multiple stations):

- **Station Metadata**: Detailed station coordinates (`18.6601° N, 73.7997° E`), urban zoning classification, and elevation.
- **Road Exposure Buffers**: Renders 1.5 km spatial buffer metrics:
  - Primary trunk road length (km)
  - Motorway proximity
  - Secondary / tertiary access density
- **Urban Activity Exposure**: Renders 2.0 km radius spatial buffers:
  - Commercial / industrial activity score
  - Construction zone flags
  - POI density indices
- **Atmospheric Weather Trends**: Chronological multi-parameter ERA5-Land weather charts (Temperature °C, Wind Speed m/s, Surface Pressure hPa, Relative Humidity %).
- **Ground Truth vs. Forecast Comparison**: Synchronized line-chart depicting observed ground sensor readings alongside model baseline predictions.
- **Observation History Registry**: Paginated chronological table showing hourly observation records with QC flags, raw values, and calibrated flags. Missing sensor periods remain unpolluted and strictly null (`-` or `NO DATA`). No target imputation is presented as observed data.

---

## 5. Next-Hour Forecast Verification

Navigating to `/forecast`:

- **Header Demarcation**: Page title is explicitly framed as **`Next-Hour PM2.5 Forecast (t + 1)`**. It strictly avoids claiming "Real-Time" or "Live Telemetry", truthfully representing model serving against the canonical analytical historical dataset.
- **Interactive Selectors**:
  - Station selector dynamically switches between all 6 stations.
  - Model selector dynamically toggles between all 4 registered baseline models:
    - `gradient_boosting_baseline` (Default, LightGBM/GBoost)
    - `random_forest_baseline`
    - `ridge_baseline`
    - `persistence_baseline` (t → t+1 naive benchmark)
- **Forecast Output Card**:
  - Prominent **`PREDICTED`** badge.
  - Predicted PM2.5 concentration in $\mu\text{g/m}^3$.
  - Model Identifier clearly reported (`gradient_boosting_baseline`).
  - Base Initialization Timestamp: `2025-02-18T00:00:00 UTC`.
  - Target Forecast Timestamp: `2025-02-18T01:00:00 UTC` ($t + 1\text{ hour}$).
- **Contemporaneous Input Features Snapshot**:
  - Displays lag-1 PM2.5, temperature, wind components ($u_{10}, v_{10}$), boundary layer ventilation index, and traffic proxy.
  - Epistemological Honesty: When historical baseline PM2.5 is null at $t_0$, the UI displays `Baseline PM2.5 (t)` as **`Missing`** with the clear label `(Input fallback: model pipeline median)` rather than concealing sensor downtime.

---

## 6. What-If Scenario Creation Verification

Navigating to `/scenarios`:

- **Test Scenario Creation**:
  - **Scenario Name**: `30% Traffic Reduction at Peak`
  - **Station**: `11613` (Sector 25, Pradhikaran)
  - **Model**: `gradient_boosting_baseline`
  - **Baseline Timestamp**: `2025-02-18T12:00:00 UTC`
  - **Intervention Type**: `TRAFFIC_REDUCTION`
  - **Traffic Reduction Percentage**: `30.0%`
- **Pre-Execution Payload & State**:
  - Successfully created via `POST /api/v1/scenarios`.
  - Assigned scenario ID: `scen_2fcdb411bcf2` (and live UI instance `scen_036f528124fd`).
  - Persistence state: `simulation_status: "DRAFT"`.
  - Database stored value: `traffic_reduction_pct = 30.0`.
  - Semantic Accuracy: The UI and API explicitly display `Traffic Reduction: 30%` (or `Traffic: -30%`). It does NOT display an inverted 70% reduction.

---

## 7. Scenario Execution & Counterfactual Audit Verification

Executing the created scenario via `POST /api/v1/scenarios/{scenario_id}/run`:

- **State Transition**: Successfully transitioned from `DRAFT` to `COMPLETED`.
- **Simulation Results**:
  - Baseline Prediction: `42.46 µg/m³` (at 12:00 UTC) / `43.69 µg/m³` (at 00:00 UTC).
  - Counterfactual Prediction: `42.46 µg/m³` / `43.51 µg/m³`.
  - Absolute Change: `0.00 µg/m³` (bounded by gradient boosting tree splits at this hour) / `-0.18 µg/m³` (-0.41%).
  - Percentage Change: Valid float output.
- **Affected Features Audit Trail**:
  Every counterfactual feature perturbation is explicitly logged and mathematically verified against a 30% reduction ($\text{multiplier} = 0.7000$):
  - `traffic_proxy_index`: $0.9100 \rightarrow 0.6370$ ($\Delta = -0.2730, \times 0.7000$)
  - `traffic_stagnation_ratio`: $0.5230 \rightarrow 0.3661$ ($\Delta = -0.1569, \times 0.7000$)
  - `traffic_ventilation_ratio`: $0.2268 \rightarrow 0.1588$ ($\Delta = -0.0681, \times 0.7000$)
  - `poi_traffic_interaction`: $25.1069 \rightarrow 17.5748$ ($\Delta = -7.5321, \times 0.7000$)
  - Industrial features: Unmodified ($\times 1.0000, \Delta = 0.00$).
- **Provenance & Classification**:
  - Data Classification: `MODEL_COUNTERFACTUAL_ESTIMATE`.
  - Disclaimers: `Point estimate only; the current baseline model does not provide calibrated uncertainty.` and `Counterfactual model estimate; not a causal measurement.`
  - The simulated output is explicitly distinguished from observed sensor data.

---

## 8. Multi-Intervention Scenario Types Verification

All three supported policy intervention types were created, executed, and verified live:

| Intervention Type | Policy Inputs | Assigned Scenario ID | Execution Status | Key Perturbed Features | Multiplier Verified |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`TRAFFIC_REDUCTION`** | Traffic: -30% | `scen_2fcdb411bcf2` | `COMPLETED` | `traffic_proxy_index`, `traffic_stagnation_ratio`, `traffic_ventilation_ratio`, `poi_traffic_interaction` | $\times 0.7000$ (30% reduction) |
| **`INDUSTRIAL_ACTIVITY_REDUCTION`** | Industrial: -25% | `scen_ee3809ed9663` | `COMPLETED` | `has_industrial_within_1km` ($1.0 \rightarrow 0.75$), `industrial_dispersion_ratio` ($0.5747 \rightarrow 0.4310$) | $\times 0.7500$ (25% reduction) |
| **`COMBINED_INTERVENTION`** | Traffic: -20%<br>Industrial: -15% | `scen_65fc309f58b7` | `COMPLETED` | Both traffic suite ($\times 0.8000$) AND industrial suite ($\times 0.8500$) simultaneously transformed | $\times 0.8000$ and $\times 0.8500$ |

- **Construction Intervention Exclusion**: Confirmed that construction intervention was NOT added, respecting established phase boundaries.
- **Persistence Verification**: Result retrieval verified via `GET /api/v1/scenarios/{id}/results`. All records are stored in the relational `scenario_results` table without mutating source observations.

---

## 9. Error Handling Verification

The system was evaluated against edge-case inputs and simulated failures:

- **Invalid Station ID (`/stations/999999`)**:
  - Frontend gracefully catches the 404 response.
  - Renders an `ErrorDisplay` card: `"Monitoring station 999999 not found."`
  - Includes a functional `"Back to Stations"` recovery button.
  - Zero application crashes; zero raw stack traces exposed.
- **Unavailable Future Observation Range**:
  - Requesting timestamps beyond `2026-09-24 23:00 UTC` triggers a clean 422 HTTP validation with `FORECAST_UNAVAILABLE_PAST_DATA_ONLY` and a user-friendly frontend message.
- **Invalid Scenario Parameters**:
  - Providing `traffic_reduction_percent = 150.0` or `-10.0` triggers strict Pydantic v2 validation errors (HTTP 422) caught before database insertion.

---

## 10. Navigation & SPA Routing Verification

- **Client-Side Routing**: Navigating across all core tabs (Dashboard, Stations, Station Details, Forecast, What-If Scenarios) occurs instantly without unmounted state leaks.
- **Browser Reload / Direct URL Access**:
  - Tested hard browser refresh on `/stations`.
  - Tested hard browser refresh on `/stations/11609`.
  - Tested hard browser refresh on `/forecast`.
  - Tested hard browser refresh on `/scenarios`.
- **SPA Fallback**: Vite development server and production static hosting fallback configure `index.html` as the catch-all entrypoint, ensuring direct URL requests and refreshes succeed without 404 errors.

---

## 11. Data Integrity Verification

Direct programmatic SQL inspection was conducted on the backing database:

- **Temporal Boundary Integrity**:
  - `MIN(datetime_utc)`: `2025-02-18 00:00:00.000000`
  - `MAX(datetime_utc)`: `2026-09-24 23:00:00.000000`
- **Environmental Observation Volume**:
  - Exactly **84,096** rows.
  - Distribution across stations:
    - Station `11609`: 14,016 rows
    - Station `11613`: 14,016 rows
    - Station `60658`: 14,016 rows
    - Station `3409331`: 14,016 rows
    - Station `3409438`: 14,016 rows
    - Station `3409526`: 14,016 rows
    - Total: $6 \times 14,016 = 84,096$ rows ($584 \text{ days} \times 24 \text{ hours}$).
- **Atmospheric Weather Volume**: Exactly **84,096** ERA5-Land records.
- **Synthetic Data Audit**: Confirmed zero synthetic PM2.5 values were injected into the observations tables.
- **Isolation of Scenarios**: Scenario creation and counterfactual runs persist exclusively to the `scenarios` and `scenario_results` tables; canonical environmental data remains 100% immutable.

---

## 12. Automated Backend Test Results

Ran the complete backend test suite:

```bash
python -m pytest backend/tests -v
```

**Results**:
- **51 Passed, 0 Failed, 0 Skipped** in 5.71 seconds.
- Test Coverage Summary:
  - `test_forecast.py`: 6 tests passed (default models, timestamps, alternative models, persistence benchmark, missing stations, future bounds).
  - `test_health.py`: 3 tests passed (health endpoints, DB connectivity).
  - `test_models.py`: 3 tests passed (registry listing, model metadata, non-existent models).
  - `test_observations.py`: 6 tests passed (pagination, null value preservation, temporal filtering, range bounds).
  - `test_predictions.py`: 4 tests passed (pagination, model filtering, absolute error, station isolation).
  - `test_scenarios.py`: 22 tests passed (creation, validation bounds, traffic/industrial/combined types, zero/100% safety, persistence, feature audits, source row immutability, 30% semantic consistency).
  - `test_stations.py`: 3 tests passed (station listing, detail views, 404 handling).
  - `test_weather.py`: 4 tests passed (ERA5-Land reanalysis provenance, pagination, temporal bounds).

---

## 13. Frontend Production Build Results

Executed production compilation and bundling:

```bash
cd frontend && npm run build
```

**Results**:
- TypeScript Check (`tsc`): 0 errors.
- Vite Production Bundler (`vite build`): Succeeded in 5.96 seconds.
  - `dist/index.html`: 1.03 kB
  - `dist/assets/index.css`: 7.92 kB
  - `dist/assets/index.js`: 634.53 kB
- 2,393 modules transformed and tree-shaken with zero syntax or bundle errors.

---

## 14. Git & Security Audit

Inspected git status and environment configurations:

- `git status` confirms:
  - No `.env` committed or tracked.
  - No API keys, secret credentials, or database passwords in working tree.
  - Generated ML model binaries (`.joblib`, `.pkl`) correctly excluded by `.gitignore`.
  - SQLite database files (`*.db`) correctly excluded.
  - Raw and processed bulk CSV files correctly ignored.

---

## 15. Bugs Found During Verification

1. **Local Timezone Parsing Offset**:
   - *Issue*: Browser environment running in IST (UTC+05:30) was displaying timestamps before `2025-02-18 00:00:00 UTC` as `17 Feb 2025, 18:30`.
   - *Fix*: Implemented `parseUtcDate` in [formatters.ts](file:///c:/Users/lenovo/OneDrive/Desktop/PCCOE/PCCOE/urban-environmental-digital-twin/frontend/src/utils/formatters.ts) to force UTC-normalized parsing across all date formatting helpers.
2. **Scenario Execution Route Discrepancy in Scratch Script**:
   - *Issue*: Scratch script initially attempted to call `POST /scenarios/{id}/execute` which returned 404.
   - *Fix*: Aligned script with backend route definition `POST /scenarios/{id}/run`, which matches the frontend service contract.

---

## 16. Bugs Fixed

- Fixed UTC parsing offset in frontend utilities (`formatters.ts`).
- Corrected input fallback labeling on the Next-Hour Forecast screen so missing sensor readings are explicitly badged as `Missing` with model pipeline fallback notes, rather than confusing users with implied sensor readings.
- Unified slider and label semantics on What-If interventions so a 30% reduction is consistently described as `30% reduction` ($\times 0.70$).

---

## 17. Known Limitations

1. **Temporal Horizon**: The synchronized analytical dataset covers exactly `2025-02-18 00:00:00 UTC` to `2026-09-24 23:00:00 UTC`. The application deliberately restricts forecasts and scenarios to this window and does not connect to live streaming telemetry.
2. **Point Estimate Uncertainty**: The current baseline ML models (Gradient Boosting, Random Forest, Ridge, Persistence) output point estimates; calibrated prediction intervals are documented as unavailable in the current baseline phase.
3. **Traffic Proxy**: Traffic intensity is derived from normalized diurnal-spatial mobility proxies rather than direct real-time camera counts.

---

## 18. Final Demo Readiness Status

```markdown
============================================================
END-TO-END STATUS: PASS
============================================================
```

### Rationale:
Every end-to-end verification requirement has been systematically tested and passed. Both backend and frontend services run seamlessly together; all 6 stations and 84,096 canonical observations are strictly preserved without synthetic mutation; all 4 baseline ML models serve predictions through the API; all 3 What-If intervention types execute with complete feature audit trails; 51/51 backend unit/integration tests pass; the frontend compiles cleanly with 0 TypeScript errors; error boundaries gracefully catch invalid routes; and no sensitive credentials or large binaries are tracked in Git. The Urban Environmental Digital Twin is verified, fully functional, and ready for end-to-end demonstration.
