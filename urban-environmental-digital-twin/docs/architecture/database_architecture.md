# PostgreSQL Database Architecture

## Purpose
PostgreSQL is the application/serving persistence layer. The ML feature store remains under `ml/data/processed/features/`; the wide 118-column feature representation is not duplicated into one giant SQL table.

## Tables
- `stations`: monitoring/station metadata.
- `environmental_observations`: hourly measured pollution observations; PM2.5 is ground truth and missing values remain NULL.
- `weather_reanalysis`: ERA5-Land/Open-Meteo-style reanalysis variables, explicitly labelled REANALYSIS.
- `road_traffic_exposure`: static road/traffic exposure features.
- `industrial_features`: static industrial features.
- `construction_features`: static construction features.
- `land_use_features`: static land-use features.
- `activity_poi_features`: static activity/POI features.
- `traffic_proxy`: hourly traffic proxy, explicitly labelled PROXY.
- `model_registry`: model metadata, versions and metrics.
- `model_predictions`: predictions for multiple models and horizons.
- `scenarios`: future what-if definitions, explicitly MODELLED_SCENARIO.
- `scenario_results`: future scenario outputs; no causal certainty is implied.

## Relationships
Stations parent environmental observations, weather, static station-level features and predictions. Predictions reference model_registry. Scenarios can reference stations and models; scenario_results reference scenarios.

## Constraints and indexes
Environmental observations and weather enforce unique (station_id, datetime_utc). Predictions are indexed by station/target, model, prediction time and target time. Scenario access is indexed by station/model. Foreign keys prevent orphan application records.

## Provenance
- Measured ground observations: environmental_observations.
- Reanalysis: provenance = REANALYSIS.
- Traffic proxy: provenance = PROXY.
- What-if outputs: provenance = MODELLED_SCENARIO.

## Security
RLS is enabled on all public tables. Application policies are intentionally deferred because authentication/API access is out of Phase 8.

## Loading and migrations
Loaders must read processed project datasets only, preserve NULLs, avoid duplicates, be idempotent where practical and never modify raw/master datasets. Schema changes must be recorded through migration history.
