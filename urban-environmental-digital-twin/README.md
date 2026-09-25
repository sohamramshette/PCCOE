# Urban Environmental Digital Twin

An AI/ML-powered urban environmental digital twin that combines air-quality,
weather, traffic, and industrial/activity data to forecast pollution, estimate
model-based source/feature contributions, run what-if intervention
simulations, and provide AI-generated explanations of model results, all
surfaced through an interactive map/dashboard.

> **Status:** Early scaffolding phase. This repository currently contains only
> the project skeleton. Application logic, APIs, ML models, database logic, UI,
> and AI functionality are **not yet implemented**.

---

## Problem Statement

Urban environments generate large volumes of heterogeneous environmental data
(air quality, weather, traffic, industrial activity), but this data is rarely
combined into a single, queryable, forward-looking model. The goal of this
project is to build a digital twin of the urban environment that can forecast
pollution, attribute it to contributing factors, and let stakeholders simulate
the effect of interventions before acting on them.

---

## Planned Objectives

1. **Forecast pollution** — initial target: **PM2.5**.
2. **Estimate model-based source/feature contributions** — identify which
   inputs drive predicted pollution levels.
3. **Run what-if intervention simulations** — model the impact of hypothetical
   changes (e.g., reduced traffic, industrial adjustments).
4. **Provide AI-generated explanations** — translate model outputs into
   human-readable insight.
5. **Visualize everything** — interactive map/dashboard for exploration.

*All objectives above are **planned**; none are implemented yet.*

---

## Planned AI/ML Components

*To be implemented.*

- **Forecasting models:** Scikit-learn / XGBoost regression models for PM2.5.
- **Feature/source attribution:** SHAP-based contribution analysis.
- **Scenario engine:** what-if intervention simulation layer.
- **AI explanation layer:** LLM-based natural-language explanation of results
  (integration details to be defined in a later phase).

---

## Planned Architecture

*To be implemented. See [`docs/architecture/README.md`](docs/architecture/README.md)
for the high-level planned flow.*

```
Data Sources
  → Data Processing
  → ML Prediction
  → Source/Feature Attribution
  → Digital Twin Scenario Engine
  → FastAPI
  → PostgreSQL
  → React/Vite
  → AI Explanation Layer
```

---

## Technology Stack

| Layer            | Technology                                             |
| ---------------- | ------------------------------------------------------ |
| Frontend         | React + Vite *(not yet initialized)*                   |
| Backend          | Python + FastAPI                                       |
| ML               | Python, Pandas, NumPy, Scikit-learn, XGBoost, SHAP     |
| Database         | PostgreSQL                                             |
| ORM              | SQLAlchemy                                             |
| Validation/config| Pydantic + pydantic-settings                           |
| AI/LLM           | To be added later                                      |
| API testing      | Postman                                                |
| Version control  | Git / GitHub                                           |
| Python version   | 3.11 or 3.12                                           |

---

## Repository Structure

```
urban-environmental-digital-twin/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config/          # App configuration (planned)
│   │   ├── database/        # DB session/engine wiring (planned)
│   │   ├── models/          # SQLAlchemy models (planned)
│   │   ├── schemas/         # Pydantic schemas (planned)
│   │   ├── routes/          # FastAPI routes (planned)
│   │   └── services/        # Business/service logic (planned)
│   └── tests/               # Backend tests (planned)
├── ml/
│   ├── data/
│   │   ├── raw/             # Raw input datasets
│   │   ├── processed/       # Processed datasets
│   │   └── external/        # External/third-party datasets
│   ├── notebooks/           # Exploration notebooks
│   ├── src/                 # ML source code (planned)
│   └── models/              # Trained model artifacts (git-ignored)
├── database/
│   ├── migrations/          # DB migrations (planned)
│   └── seed/                # Seed data (planned)
├── ai/
│   ├── prompts/             # LLM prompt templates (planned)
│   └── services/            # AI integration services (planned)
├── frontend/                # React + Vite app (not yet initialized)
├── docs/
│   ├── architecture/        # Architecture documentation
│   └── dataset/             # Dataset documentation
├── .gitignore
├── .env.example
├── README.md
└── docker-compose.yml       # Dev-only PostgreSQL placeholder
```

---

## Development Phases

1. **Phase 0 — Scaffolding (current):** Repository structure, configuration
   placeholders, and documentation.
2. **Phase 1 — Data & environment setup:** Dependency definitions, dataset
   ingestion, database schema and migrations.
3. **Phase 2 — ML pipeline:** Preprocessing, PM2.5 forecasting models, and
   SHAP-based attribution.
4. **Phase 3 — Backend API:** FastAPI services, SQLAlchemy models, and
   Pydantic schemas.
5. **Phase 4 — Scenario engine:** What-if intervention simulation.
6. **Phase 5 — AI explanation layer:** LLM integration for result explanations.
7. **Phase 6 — Frontend:** React + Vite interactive map/dashboard.

*Phases 1 through 6 are **planned** and not yet started.*

---

## Getting Started (Local Development)

> Detailed setup instructions will be added as components are implemented.

1. Copy the environment template and fill in local values:
   ```bash
   cp .env.example .env
   ```
2. (Optional) Start a local PostgreSQL instance for development:
   ```bash
   docker compose up -d postgres
   ```

---

## Security Note

- **Never commit real secrets.** The `.env` file is git-ignored; only
  `.env.example` (with empty placeholders) is tracked.
- Store credentials, API keys, and connection strings in your local `.env`
  file or a dedicated secrets manager.
- The `LLM_API_KEY` and database credentials must be provided at runtime via
  environment variables and never hard-coded into source files.
