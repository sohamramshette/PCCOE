# Planned High-Level Architecture

> **Status:** Planned. None of the components described below are implemented
> yet. This document describes the intended high-level flow only.

The Urban Environmental Digital Twin is planned as a pipeline that moves from
raw multi-source data through prediction and attribution, into a scenario
engine, and finally out to an API, database, and interactive frontend, with an
AI layer providing natural-language explanations.

## Planned Data Flow

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

## Planned Components

- **Data Sources** *(planned)* — Air-quality, weather, traffic, and
  industrial/activity data feeds.
- **Data Processing** *(planned)* — Cleaning, normalization, feature
  engineering, and alignment of heterogeneous inputs.
- **ML Prediction** *(planned)* — Pollution forecasting models, initial target
  PM2.5 (Scikit-learn / XGBoost).
- **Source/Feature Attribution** *(planned)* — SHAP-based analysis of which
  features/sources contribute to predictions.
- **Digital Twin Scenario Engine** *(planned)* — What-if intervention
  simulation over the trained models.
- **FastAPI** *(planned)* — Backend API exposing forecasts, attributions, and
  scenario results.
- **PostgreSQL** *(planned)* — Persistent storage, accessed via SQLAlchemy.
- **React/Vite** *(planned)* — Interactive map/dashboard for visualization.
- **AI Explanation Layer** *(planned)* — LLM-based natural-language explanation
  of model outputs.

## Notes

- The ordering above represents the intended logical flow, not a finalized
  implementation contract.
- The architecture should not be changed without discussion and agreement.
