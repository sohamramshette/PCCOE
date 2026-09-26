# Phase 11 — React + Vite Frontend Development Report

> **System Component:** Interactive Web Client Application Layer  
> **Status:** COMPLETE, TESTED & PRODUCTION BUILT  
> **Date:** September 2026  
> **Frontend Build Status:** Successful (`tsc && vite build` built in 31.92s with 0 errors)  
> **Backend Integration Tests:** 50/50 Passed (100%)

---

## 1. Phase Objective

The objective of Phase 11 was to construct a responsive, scientific web frontend for the **Urban Environmental Digital Twin** (Pune & PCMC), directly consuming the verified FastAPI backend service (`/api/v1/`). The interface is designed to support environmental researchers, municipal urban planners, and policy analysts with transparent data provenance, live model forecasting, and interactive counterfactual policy simulation without fabricating missing sensor readings.

---

## 2. Frontend Architecture

The client application is built as a single-page application (SPA) adhering to strict separation between API consumption, domain models, presentation components, and view routing:

```text
frontend/src/
├── api/             # Centralized typed fetch client (URL parameter serialization, error contracts)
│   ├── client.ts    # Base request handler with 15s timeout and structured ApiError
│   ├── health.ts    # System health probes (GET /health)
│   ├── stations.ts  # Station registry and geospatial exposure buffers
│   ├── observations.ts # In-situ pollutant observations (NULL-preserved)
│   ├── weather.ts   # ECMWF ERA5-Land atmospheric reanalysis
│   ├── predictions.ts  # Historical model predictions and validation metrics
│   ├── models.ts    # MLOps model registry governance
│   ├── forecast.ts  # Real-time next-hour (t+1) PM2.5 forecasting
│   └── scenarios.ts # What-If scenario creation, execution, and audits
│
├── components/      # Modular, reusable presentation components
│   ├── layout/      # Sidebar (with live backend health indicator), Navbar, Master Layout
│   ├── common/      # ProvenanceBadge, AqiPill (NAQI categories), LoadingSpinner, ErrorDisplay
│   ├── charts/      # Recharts wrappers (Pm25TimeSeriesChart, WeatherContextChart, ScenarioComparisonChart)
│   └── scenarios/   # FeatureAuditTable (granular mathematical transformation logs)
│
├── pages/           # Routed top-level view pages
│   ├── Dashboard.tsx      # Multi-source environmental overview, key stats, recent trends
│   ├── Stations.tsx       # Interactive registry of 6 continuous CAAQMS stations
│   ├── StationDetails.tsx # In-depth station diagnostics, road & activity buffers, raw logs
│   ├── Forecast.tsx       # Live next-hour inference display with input feature audits
│   └── Scenarios.tsx      # What-If policy intervention simulator and delta comparison
│
├── types/           # Strict TypeScript interfaces matching backend Pydantic schemas
│   ├── common.ts, station.ts, observation.ts, weather.ts, prediction.ts, model.ts, forecast.ts, scenario.ts
│
├── utils/           # Formatting helpers and epistemological provenance taxonomies
│   ├── formatters.ts (Date/Time UTC & IST, Number formatting, Indian NAQI bands)
│   └── provenance.ts (Badge styling, classification metadata, scientific definitions)
│
├── App.tsx          # React Router v6 tree with fallback redirects
├── main.tsx         # React 18 DOM root mount
└── index.css        # Vanilla CSS design system with HSL dark-slate palette & responsive grids
```

---

## 3. Technology Stack

- **Core Framework:** React 18 (`react`, `react-dom` `^18.3.1`)
- **Language:** TypeScript 5 (`typescript` `^5.5.3`) with `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- **Build Tool & Bundler:** Vite 5 (`vite` `^5.4.2`, `@vitejs/plugin-react` `^4.3.1`)
- **Client Routing:** React Router DOM v6 (`react-router-dom` `^6.26.2`)
- **Data Visualization:** Recharts (`recharts` `^2.12.7`) with customized SVG tooltips and gap-preserving lines
- **Iconography:** Lucide React (`lucide-react` `^0.441.0`)
- **Styling:** Custom Vanilla CSS Design System (Zero Tailwind / Zero CSS-in-JS overhead)
- **Typography:** Google Fonts (`Outfit` for quantitative display headings; `Inter` for interface and tabular data)

---

## 4. Pages Implemented

### 4.1 Dashboard (`/`)
- High-level metropolitan overview for Pune & PCMC.
- Live statistical tiles: Active Network Stations (6), Latest Observed PM2.5 with National AQI classification, Next-Hour Forecast concentration, and Active Baseline Serving Model (`gradient_boosting_baseline`, Test MAE: 4.10 µg/m³).
- Focus station selector dynamically updating recent 48-hour PM2.5 trends and contemporaneous ECMWF ERA5-Land weather parameters (temperature, humidity, wind speed, surface pressure, planetary boundary layer height).
- Machine learning baseline comparison table summarizing all 4 registered models.

### 4.2 Stations Registry (`/stations`)
- Grid of all 6 continuous ambient air quality monitoring stations (Shivajinagar, Mhada Colony, Hadapsar, Bhosari, Katraj Dairy, Pashan).
- Displays operational authority (IITM SAFAR / MPCB), geographic coordinates (WGS84), urban morphology zone classification, and operating status.
- Direct navigation links to detailed station diagnostics (`/stations/:stationId`).

### 4.3 Station Profile & Diagnostics (`/stations/:stationId`)
- Complete geospatial exposure buffer audit:
  - **Road Network Exposure (1.5 km buffer):** Total road length (km), major road length (km), major road density (km/km²), distance to nearest major highway corridor (m).
  - **Urban Activity Exposure (1.5 km & 2.0 km buffers):** Dominant land-use zoning, industrial unit counts within 2 km, active civil construction sites within 1.5 km, and commercial/transit POI density.
- Co-located ground truth observations vs. historical model predictions chart. Missing sensor measurements are preserved as gaps (`connectNulls={false}`).
- Reanalysis atmospheric meteorology multi-axis trend chart (Temperature, Humidity, Wind Speed).
- Raw chronological hourly observations table with regulatory completeness flags (`FULL`, `PARTIAL`, `INSUFFICIENT`, `MISSING`).

### 4.4 Real-Time Next-Hour Forecasting (`/forecast`)
- Interactive station selector and inference model selector.
- Live model-serving card displaying forecasted PM2.5 concentration, initialization timestamp ($t$), target timestamp ($t+1$), and input data verification status (`HISTORICAL_INPUTS_VERIFIED`).
- Contemporaneous input features audit panel displaying observed baseline PM2.5, ambient temperature, wind speed, ventilation index ($\text{Wind} \times \text{PBLH}$), and diurnal traffic intensity index ($0.0$ to $1.0$).
- Epistemological notice reinforcing the distinction between observed sensor measurements and statistical model forecasts.

### 4.5 What-If Counterfactual Policy Simulator (`/scenarios`)
- Policy intervention configuration panel supporting the three verified backend intervention types:
  1. `TRAFFIC_REDUCTION`: Adjustable vehicular traffic intensity reduction slider ($0\%$ to $100\%$).
  2. `INDUSTRIAL_ACTIVITY_REDUCTION`: Adjustable industrial activity curtailment slider ($0\%$ to $100\%$).
  3. `COMBINED_INTERVENTION`: Simultaneous multi-lever traffic and industrial restrictions.
- One-click simulation execution against backend `POST /api/v1/scenarios/{id}/run`.
- Impact visualization comparing baseline predicted PM2.5 against simulated counterfactual PM2.5, calculating absolute reduction ($\Delta$) and relative percentage change.
- Granular modified core features audit trail (`FeatureAuditTable`) recording exact baseline values, transformed counterfactual values, and applied mathematical formulas.
- Mandatory scientific interpretation and uncertainty disclaimers (`MODEL_COUNTERFACTUAL_ESTIMATE`).

---

## 5. Components Implemented

| Component | Path | Purpose |
| :--- | :--- | :--- |
| `Layout` | `src/components/layout/Layout.tsx` | Master application frame integrating sidebar, top navigation, and router outlet |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | Navigation sidebar with live backend health probe and station counters |
| `Navbar` | `src/components/layout/Navbar.tsx` | Contextual breadcrumbs, analytical period notices, and FastAPI Swagger link |
| `ProvenanceBadge` | `src/components/common/ProvenanceBadge.tsx` | Visual pill component rendering data classification with explanatory tooltips |
| `AqiPill` | `src/components/common/AqiPill.tsx` | Dynamic NAQI indicator coloring PM2.5 values into Good, Satisfactory, Moderate, Poor, Very Poor, Severe |
| `LoadingSpinner` | `src/components/common/LoadingSpinner.tsx` | Standardized asynchronous loading indicator |
| `ErrorDisplay` | `src/components/common/ErrorDisplay.tsx` | Error banner with sanitized error messages and retry trigger |
| `Pm25TimeSeriesChart` | `src/components/charts/Pm25TimeSeriesChart.tsx` | Recharts line chart plotting observed vs predicted PM2.5 with null preservation |
| `WeatherContextChart` | `src/components/charts/WeatherContextChart.tsx` | Dual-axis line chart rendering temperature, relative humidity, and wind speed |
| `ScenarioComparisonChart` | `src/components/charts/ScenarioComparisonChart.tsx` | Bar chart illustrating baseline vs simulated counterfactual PM2.5 |
| `FeatureAuditTable` | `src/components/scenarios/FeatureAuditTable.tsx` | Data table detailing feature deltas and transformation provenance |

---

## 6. API Integration & Backend Synchronization

All frontend API calls communicate with FastAPI using typed endpoints:

| Endpoint | Method | TypeScript Function | Schema Handled |
| :--- | :---: | :--- | :--- |
| `/health` | `GET` | `getHealth()` | `HealthResponse` |
| `/api/v1/stations` | `GET` | `getStations()` | `Station[]` |
| `/api/v1/stations/{id}` | `GET` | `getStation(id)` | `StationDetail` |
| `/api/v1/stations/{id}/observations` | `GET` | `getObservations(id, params)` | `PaginatedObservations` |
| `/api/v1/stations/{id}/weather` | `GET` | `getWeather(id, params)` | `PaginatedWeather` |
| `/api/v1/stations/{id}/predictions` | `GET` | `getPredictions(id, params)` | `PaginatedPredictions` |
| `/api/v1/models` | `GET` | `getModels()` | `ModelSummary[]` |
| `/api/v1/models/{id}` | `GET` | `getModel(id)` | `ModelDetail` |
| `/api/v1/stations/{id}/forecast` | `GET` | `getForecast(id, params)` | `ForecastResponse` |
| `/api/v1/scenarios` | `POST` | `createScenario(payload)` | `ScenarioResponse` |
| `/api/v1/scenarios` | `GET` | `getScenarios(params)` | `ScenarioListResponse` |
| `/api/v1/scenarios/{id}` | `GET` | `getScenario(id)` | `ScenarioResponse` |
| `/api/v1/scenarios/{id}/run` | `POST` | `runScenario(id)` | `ScenarioRunResponse` |
| `/api/v1/scenarios/{id}/results` | `GET` | `getScenarioResults(id, params)`| `ScenarioResultsListResponse` |

---

## 7. Data Provenance Handling in UI

To uphold epistemological integrity, every data point presented to users is labeled with its origin:

- **CAAQMS PM2.5 Telemetry:** Tagged as `OBSERVED`. Missing sensor readings are explicitly displayed as gaps or `No data available` rather than filled with synthetic numbers.
- **ECMWF Weather Data:** Tagged as `REANALYSIS` (ECMWF ERA5-Land via Open-Meteo), clarifying that values are numerical model assimilation rather than local physical thermistors.
- **Road Network Metrics:** Tagged as `STATIC_ROAD_NETWORK`.
- **Diurnal Traffic Curves:** Tagged as `TRAFFIC_PROXY`.
- **Industrial Proximity Metrics:** Tagged as `INDUSTRIAL_PROXY` (or `STATIC_INDUSTRIAL`).
- **Active Civil Works:** Tagged as `CONSTRUCTION_PROXY`.
- **Model Forecasts:** Tagged as `PREDICTED` (statistical next-hour estimate).
- **What-If Simulations:** Tagged as `SCENARIO / SIMULATED` (`MODEL_COUNTERFACTUAL_ESTIMATE`), paired with calibrated uncertainty disclaimers.

---

## 8. Backend Compatibility & CORS Verification

- The existing backend CORS configuration in `backend/app/config/settings.py` already includes `http://localhost:5173` and `http://127.0.0.1:5173`.
- No modifications were required to the backend CORS middleware, database schemas, or API business logic.
- Automated backend test suite execution confirmed **50/50 test cases passed**.

---

## 9. Testing & Build Verification

1. **TypeScript Typecheck & Production Build:**
   ```text
   > npm run build
   > tsc && vite build
   ✓ 2393 modules transformed.
   dist/index.html                   1.03 kB │ gzip:   0.56 kB
   dist/assets/index-p4JLdPME.css    7.92 kB │ gzip:   2.28 kB
   dist/assets/index-aA0chflU.js   632.07 kB │ gzip: 178.23 kB
   ✓ built in 31.92s
   ```
2. **Backend Regression Testing:**
   ```text
   > python -m pytest backend/tests -v
   ====================== 50 passed, 1581 warnings in 5.59s ======================
   ```
3. **Security Audit:**
   - `.env` remains strictly ignored.
   - `frontend/.env.example` contains only `VITE_API_BASE_URL=http://localhost:8000`.
   - Zero hardcoded credentials or database secrets in the frontend repository.

---

## 10. Remaining Known Limitations

1. **Historical Horizon Boundary:** Live forecast and observation views operate on the canonical 14,016-hour analytical dataset ending at `2026-09-24T23:00:00Z`. Timestamps requested beyond this historical boundary return informative 422 unprocessable responses.
2. **Co-Pollutant Gaps:** Detailed chemical co-pollutants (PM10, NO2, SO2, CO, O3) are only continuously monitored at Central Benchmark Station 11613 (Shivajinagar); other stations display PM2.5 and meteorology.
3. **Future Planned Modules:** SHAP feature attributions and LLM narrative summaries remain documented future roadmap targets (Phases 12 & 13) and are not rendered in the frontend.

---

## 11. Phase 11 Data Consistency Audit & Corrections

Following the initial frontend implementation, a focused data/UI correctness audit was performed and verified against actual backend contracts and database state:

### 11.1 Canonical Date Range & UTC Normalization
- **Issue:** UI timestamps displayed records such as `17 Feb 2025, 18:30 UTC`, which appeared outside the project's canonical analytical period (`2025-02-18 00:00:00 UTC` through `2026-09-24 23:00:00 UTC`).
- **Root Cause:** Backend SQLite/SQLAlchemy returns naive ISO strings (e.g. `2025-02-18T00:00:00`). When passed to JavaScript's `new Date()`, strings lacking a timezone offset are parsed in the client browser's local time zone (Indian Standard Time, UTC+05:30). Formatting with `timeZone: 'UTC'` then subtracted 5 hours 30 minutes, shifting `2025-02-18 00:00:00` into `17 Feb 2025, 18:30:00 UTC`.
- **Fix:** Implemented `parseUtcDate(isoString)` in `frontend/src/utils/formatters.ts` which guarantees any ISO timestamp without a timezone offset has `'Z'` appended before date parsing. Defined `CANONICAL_START_UTC = '2025-02-18T00:00:00Z'` and `CANONICAL_END_UTC = '2026-09-24T23:00:00Z'` with `isWithinCanonicalPeriod()` filtering across `Dashboard.tsx` and `StationDetails.tsx`. Database rows are strictly preserved and verified within the canonical period.

### 11.2 Scenario Percentage Consistency
- **Issue:** A registered scenario named "30% Traffic Reduction at Peak" previously displayed `Traffic: -70%` and `Traffic Cut: 70%` while the creation slider showed `30%`.
- **Root Cause & Domain Semantics:** The backend domain model in `ScenarioService` defines `traffic_reduction_pct` as the **percentage reduction from baseline** ($m_{\text{traffic}} = 1.0 - \text{pct} / 100.0$). A 30% reduction reduces traffic features by 30% ($m_{\text{traffic}} = 0.70$). The conflict arose because an earlier test run had created a scenario with 70.0 while having the static default name string "30% Traffic Reduction at Peak".
- **Fix:** 
  1. Updated `Scenarios.tsx` with dynamic auto-synchronization between slider values and scenario names (`handleTrafficChange`), preventing mismatched naming.
  2. Updated details card label from `Traffic Cut` to `Traffic Reduction: ${selectedScenario.traffic_reduction_pct}%`.
  3. Seeded and verified canonical reference scenario `30% Traffic Reduction at Peak` with `traffic_reduction_pct: 30.0` and `intervention: { type: 'TRAFFIC_REDUCTION', traffic_reduction_percent: 30.0 }`.
  4. Added automated regression test `test_thirty_percent_traffic_reduction_semantic_consistency` in `backend/tests/test_scenarios.py` verifying end-to-end 30% reduction representation, feature scaling ($0.70 \times \text{baseline}$), and simulation execution.

### 11.3 "Missing (Imputed)" Label vs Observed Sensor Integrity
- **Issue:** Forecast UI labeled missing input features as `Baseline PM2.5 (t): Missing (Imputed)` with an `OBSERVED` badge, implying observed sensor data was imputed.
- **Scientific Clarification:** Ground truth observed PM2.5 strictly preserves missing sensor readings without synthetic interpolation. The ML model inference pipeline uses preprocessor median imputation on missing historical inputs for model serving only.
- **Fix:** Replaced label with `Baseline PM2.5 (t): Missing` and added a distinct badge indicator `(Input fallback: model pipeline median)` along with an epistemological note clarifying that observed sensor missingness is preserved.

### 11.4 Chronological Chart Ordering (`datetime_utc ASC`)
- **Issue:** PM2.5 time-series charts showed timestamps descending from approximately 19 Feb → 17 Feb.
- **Root Cause:** Backend service `get_station_observations` already returns records ascending (`order_by(EnvironmentalObservation.datetime_utc.asc())`). The frontend components in `Dashboard.tsx` and `StationDetails.tsx` executed an unnecessary `[...observations].reverse()`, inverting chronological order.
- **Fix:** Removed `.reverse()` calls. Enforced strict ascending sorting: `.sort((a, b) => parseUtcDate(a.datetime_utc).getTime() - parseUtcDate(b.datetime_utc).getTime())` in `Dashboard.tsx`, `StationDetails.tsx`, and `WeatherContextChart.tsx`. Charts now render strictly chronological: oldest $\to$ newest (`datetime_utc ASC`).

### 11.5 "Real-Time" Terminology Correction
- **Issue:** UI headings claimed "Real-Time" forecasting, which was inaccurate given that data originates from the historical analytical period ending 2026-09-24.
- **Fix:** Renamed headings and navigation titles in `Navbar.tsx` and `Forecast.tsx` to `Next-Hour PM2.5 Forecast (t + 1)` and added explanatory subtitle: `Model inference using verified multi-domain inputs from the canonical analytical period (up to 2026-09-24)`.

### 11.6 Dashboard Observed vs Forecast Distinction
- **Issue:** The dashboard must clearly distinguish between missing observations and available model forecasts without fabricating readings.
- **Fix:** If the latest hourly sensor observation has missing PM2.5, the metric tile displays `NO DATA` (`Missing Sensor Reading`) with `ProvenanceBadge: OBSERVED`, while the neighboring tile displays the model estimate with `ProvenanceBadge: PREDICTED`. Zero fake values are injected.

---

## 12. Phase 11 Completion Status

Phase 11 is **COMPLETE and FULLY SIGNED OFF**.
- **Backend Tests:** 51/51 PASSED (100%)
- **Frontend TypeScript/Vite Build:** BUILT IN 6.08s (0 ERRORS)
- **Data Provenance:** Observed sensor readings, ECMWF reanalysis, traffic proxies, and model counterfactual estimates remain epistemologically clean and uncompromised.

---

## 13. Phase 11 Extension — Pune Digital Twin Map (`/digital-twin`)

### 13.1 Objective & Overview
The Phase 11 Extension adds a dedicated spatial digital twin interface at `/digital-twin`, providing an interactive geospatial visualization of Pune's environmental monitoring network, spatial exposure buffers, and observational data without fabricating geometries or connecting directly to raw databases.

### 13.2 Map Library & Basemap
- **Library:** React Leaflet v4 (`react-leaflet` `^4.2.1`, `leaflet` `^1.9.4`, `@types/leaflet` `^1.9.12`).
- **Basemap Tiles:** Standard OpenStreetMap tile service (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with strict attribution (`&copy; OpenStreetMap contributors`) and responsive contrast-enhanced CSS filters for dark mode aesthetics.
- **Marker Design:** Custom HTML `L.divIcon` markers with glowing pulse animations, station ID badges, and active state rings that highlight the selected station without relying on bundled static PNG assets.

### 13.3 Data Sources & API Endpoints
- **Station Registry:** Consumes existing FastAPI endpoint `GET /api/v1/stations` (fields `station_id`, `station_name`, `latitude`, `longitude`, `monitoring_authority`, `zone_type`, `city`, `elevation_m`, `is_active`, `data_provenance`). Zero hardcoded coordinates in the frontend.
- **Latest Observations:** Consumes `GET /api/v1/stations/{id}/observations?limit=1` asynchronously in parallel across all 6 stations. If PM2.5 is null or unavailable, it explicitly displays `NO DATA` (not zero).
- **Security:** Frontend communicates exclusively through the FastAPI backend; zero direct Supabase, PostgreSQL, or OpenAQ secrets are exposed in client code.

### 13.4 Layers Implemented
1. **Monitoring Stations (Active):**
   - Clickable interactive markers for all 6 continuous air quality monitoring stations in Pune/PCMC (`11613`, `11609`, `60658`, `3409331`, `3409438`, `3409526`).
   - Popups show station name, station ID, latitude/longitude, operating authority, zoning classification, latest observed PM2.5 (or `NO DATA`), `OBSERVED` provenance badge, and a `"View Station Details"` button linking to `/stations/{station_id}`.
2. **1.5 km Road Exposure Buffers (Toggleable):**
   - Optional spatial buffer circle rendered at actual station coordinates with a 1,500-meter radius, reflecting the static road network GIS exposure buffer (`buffer_radius_m = 1500.0`).
3. **2.0 km Activity Exposure Buffers (Toggleable):**
   - Optional spatial buffer circle rendered at actual station coordinates with a 2,000-meter radius, reflecting the industrial/POI activity exposure boundary (`2000.0 m`).

### 13.5 Layers Deferred (Documented Future Roadmap)
- **Vector Road Network Geometry:** Deferred. The existing backend calculates aggregate buffer metrics (`total_road_length_km`, `major_road_density_km_per_km2`) but does not expose raw GeoJSON linestrings. In adherence to core rules, fake road geometries were NOT fabricated.
- **Industrial Infrastructure Footprints:** Deferred. Requires a dedicated spatial polygon GeoJSON endpoint. Labeled as `Planned` in the map legend.
- **Activity & Construction POI Points:** Deferred pending point-geometry API support. Labeled as `Planned`.

### 13.6 UI & Interactive Components Created
- `frontend/src/components/map/PuneTwinMap.tsx`: Interactive Leaflet map container with auto-centering camera controller (`MapController`), responsive height, and station markers.
- `frontend/src/components/map/StationMarker.tsx`: Marker component with custom div-icon, optional buffer circles, and popup integration.
- `frontend/src/components/map/StationPopup.tsx`: Station diagnostic popup with coordinates, authority, latest PM2.5, and navigation link.
- `frontend/src/components/map/MapLegend.tsx`: Glassmorphic layer control and provenance legend with toggle checkboxes and planned layer badges.
- `frontend/src/pages/DigitalTwinMap.tsx`: Master spatial twin page containing the page header, 3 metadata info cards, responsive split layout (interactive map + beside-map station selector), and selected station details card.

### 13.7 Navigation Integration
- Added `/digital-twin` route to `App.tsx`.
- Updated `Sidebar.tsx` navigation items:
  1. Dashboard (`/`)
  2. Stations (`/stations`)
  3. Pune Digital Twin (`/digital-twin`)
  4. Next-Hour Forecast (`/forecast`)
  5. What-If Scenarios (`/scenarios`)

### 13.8 Verification Results
- **Automated Backend Tests:** `python -m pytest backend/tests -v` $\rightarrow$ **51 passed, 0 failed** in 5.51s.
- **Frontend Production Build:** `tsc && vite build` $\rightarrow$ **Succeeded with 0 errors** in 11.77s.
- **End-to-End Browser Subagent Verification:** Live session verified loading `/digital-twin`, rendering all 6 stations on OpenStreetMap, station selection and camera re-centering, buffer toggling, popup display with `NO DATA` / observed values, and smooth navigation to `/stations/11613`.

