# Urban Environmental Digital Twin — React Frontend

> **Application Layer:** Phase 11 Interactive Web Client  
> **Target Geography:** Pune & PCMC Metropolitan Area, Maharashtra, India  
> **Technology Stack:** React 18 / TypeScript 5 / Vite 5 / React Router 6 / Recharts 2 / Vanilla CSS  
> **Data Provenance:** Strict Epistemological Tagging (`OBSERVED`, `REANALYSIS`, `STATIC_ROAD_NETWORK`, `TRAFFIC_PROXY`, `ACTIVITY_PROXY`, `PREDICTED`, `SCENARIO / SIMULATED`)

---

## 1. Overview & Capabilities

The Urban Environmental Digital Twin frontend provides an interface for environmental researchers, urban municipal planners, and data scientists to interact with the multi-domain Pune digital twin system:

1. **Environmental Overview (Dashboard):** High-level network status across all 6 continuous CAAQMS stations, latest observed ambient PM2.5 concentrations, real-time weather reanalysis parameters, and active machine learning baseline metrics.
2. **Station Diagnostics (`/stations` & `/stations/:stationId`):** In-depth geospatial profiles displaying 1.5 km road density buffers, 2.0 km industrial cluster exposures, urban land-use zoning metrics, and raw hourly observation time-series. Missing sensor periods are strictly preserved without synthetic interpolation.
3. **Real-Time Next-Hour Forecasting (`/forecast`):** Live model inference serving next-hour PM2.5 predictions ($t+1$) with input feature snapshots and clear epistemological distinctions between observed sensors and statistical model forecasts.
4. **What-If Counterfactual Policy Simulator (`/scenarios`):** Interactive scenario creation and execution for hypothetical traffic curtailment, industrial restrictions, or combined policies, complete with delta impact quantification, visual bar comparisons, and a full feature audit log.

---

## 2. Local Development & Setup

### Prerequisites
- Node.js `v18+` (v20+ or v24+ recommended)
- Running FastAPI backend service on `http://localhost:8000`

### 1. Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env
```
Ensure `VITE_API_BASE_URL` points to your active FastAPI instance:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The Vite development server will start locally at:
`http://localhost:5173`

### 4. Build for Production
To typecheck and build production-ready optimized assets:
```bash
npm run build
```
Production output will be generated inside the `dist/` directory.

---

## 3. Directory Structure

```text
frontend/
├── src/
│   ├── api/                  # Centralized typed fetch API client
│   │   ├── client.ts         # Base fetch wrapper with timeout & error handling
│   │   ├── health.ts         # GET /health probe
│   │   ├── stations.ts       # GET /api/v1/stations & details
│   │   ├── observations.ts   # GET /api/v1/stations/{id}/observations
│   │   ├── weather.ts        # GET /api/v1/stations/{id}/weather
│   │   ├── predictions.ts    # GET /api/v1/stations/{id}/predictions
│   │   ├── models.ts         # GET /api/v1/models & details
│   │   ├── forecast.ts       # GET /api/v1/stations/{id}/forecast
│   │   └── scenarios.ts      # POST/GET /api/v1/scenarios & simulation runs
│   │
│   ├── components/           # Reusable UI components
│   │   ├── layout/           # Sidebar, Navbar, and Master Layout
│   │   ├── common/           # ProvenanceBadge, AqiPill, LoadingSpinner, ErrorDisplay
│   │   ├── charts/           # Pm25TimeSeriesChart, WeatherContextChart, ScenarioComparisonChart
│   │   └── scenarios/        # FeatureAuditTable
│   │
│   ├── pages/                # Top-level view routes
│   │   ├── Dashboard.tsx     # Overview dashboard
│   │   ├── Stations.tsx      # Monitoring station registry
│   │   ├── StationDetails.tsx# In-depth station diagnostics & historical charts
│   │   ├── Forecast.tsx      # Real-time next-hour inference view
│   │   └── Scenarios.tsx     # What-If policy counterfactual simulator
│   │
│   ├── types/                # Strict TypeScript interfaces matching Pydantic schemas
│   │   ├── common.ts
│   │   ├── station.ts
│   │   ├── observation.ts
│   │   ├── weather.ts
│   │   ├── prediction.ts
│   │   ├── model.ts
│   │   ├── forecast.ts
│   │   └── scenario.ts
│   │
│   ├── utils/                # Number/Date formatting and NAQI classification
│   │   ├── formatters.ts
│   │   └── provenance.ts
│   │
│   ├── App.tsx               # Master route configuration
│   ├── main.tsx              # React entrypoint
│   └── index.css             # Design tokens and responsive styles
│
├── .env.example              # Public environment template
├── index.html                # HTML5 root with Google Fonts (Outfit & Inter)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # Strict TypeScript compiler options
└── vite.config.ts            # Vite bundler configuration
```

---

## 4. API Endpoints Consumed

All requests are directed through `src/api/client.ts` against the FastAPI backend:

| Page / Feature | Method | API Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **System Health** | `GET` | `/health` | Live backend connectivity and registered entity counts |
| **Station List** | `GET` | `/api/v1/stations` | 6 continuous CAAQMS stations in Pune & PCMC |
| **Station Profile** | `GET` | `/api/v1/stations/{id}` | Road network and activity buffer exposure metrics |
| **Observations** | `GET` | `/api/v1/stations/{id}/observations` | Historical in-situ sensor measurements (null-preserved) |
| **Weather** | `GET` | `/api/v1/stations/{id}/weather` | ECMWF ERA5-Land numerical atmospheric reanalysis |
| **Predictions** | `GET` | `/api/v1/stations/{id}/predictions` | Baseline model validation & test holdout predictions |
| **Model Registry** | `GET` | `/api/v1/models` | List of 4 trained baseline models and test MAEs |
| **Real-Time Forecast** | `GET` | `/api/v1/stations/{id}/forecast` | Next-hour ($t+1$) PM2.5 inference with feature audits |
| **Create Scenario** | `POST` | `/api/v1/scenarios` | Create What-If policy intervention with validation |
| **List Scenarios** | `GET` | `/api/v1/scenarios` | Paginated listing of persisted policy scenarios |
| **Run Simulation** | `POST` | `/api/v1/scenarios/{id}/run` | Execute counterfactual inference & record deltas |
| **Scenario Results** | `GET` | `/api/v1/scenarios/{id}/results` | Stored counterfactual results & feature audits |

---

## 5. Epistemological Provenance Rules in the UI

To maintain scientific credibility:
1. **Never fabricate missing sensor data:** If a physical monitoring station went offline, the observation is rendered as `null` or a gap in the time series chart.
2. **Always badge data provenance:** Observed sensor telemetry is labeled <span style="color:#34d399">OBSERVED</span>, atmospheric models are labeled <span style="color:#60a5fa">REANALYSIS</span>, road densities are labeled <span style="color:#a78bfa">STATIC_ROAD</span>, traffic curves are labeled <span style="color:#fbbf24">TRAFFIC_PROXY</span>, and model outputs are labeled <span style="color:#818cf8">PREDICTED</span> or <span style="color:#f43f5e">SIMULATED</span>.
3. **Counterfactual Disclaimers:** What-If scenario simulations explicitly state that outputs are model-derived counterfactual estimates under hypothetical policy conditions, not direct causal measurements.
