# Open-Meteo Pune Historical Weather Dataset (Raw)

## Data Provenance
- **Provider:** Open-Meteo GmbH (`https://open-meteo.com`)
- **Underlying Source:** European Centre for Medium-Range Weather Forecasts (ECMWF) ERA5-Land (0.1° / ~10 km) and ERA5 (0.25° / ~28 km) Reanalysis.
- **Classification:** `REANALYSIS` (Atmospheric Numerical Model Assimilation)
- **Target Geography:** Pune Metropolitan Area, Maharashtra, India
- **Target Period:** February 18, 2025 – September 24, 2026 (583 continuous days / 14,016 hours)
- **Temporal Resolution:** Exactly 1 Hour (UTC timestamps on the hour)

## Directory Structure
- `observations/`: Unmodified raw JSON responses from the Open-Meteo Historical Weather API.
  - `weather_central_pune.json`: Pune central urban reference grid point.
  - `weather_station_<id>.json`: Weather grid cells corresponding to each OpenAQ monitoring station.
- `metadata/`: Query parameters, grid metadata, and ingestion manifest.
- `raw_weather_hourly.csv`: Consolidated unmodified tabular dataset preserving exact response columns and timestamps.

## Licensing & Attribution
- Creative Commons Attribution 4.0 International (CC BY 4.0).
- Open Database License (ODbL).
- Attribution required: "Open-Meteo.com" and "Copernicus Climate Change Service / ECMWF".
