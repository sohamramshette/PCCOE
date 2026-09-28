# Pune Hourly Weather: Open-Meteo Historical Forecast

## Source and coverage

- **Provider:** Open-Meteo Historical Forecast API; no API key is required.
- **Endpoint:** `https://historical-forecast-api.open-meteo.com/v1/forecast`
- **Location:** Pune, Maharashtra, India; requested latitude `18.5196`, longitude `73.8554`.
- **Requested period:** January 1, 2025 through September 26, 2026, inclusive.
- **Time basis and frequency:** hourly UTC.
- **Requested variables:** `temperature_2m`, `dew_point_2m`, `relative_humidity_2m`, `apparent_temperature`, `surface_pressure`, `cloud_cover`, `precipitation`, `wind_speed_10m`, `evapotranspiration`, `wind_gusts_10m`, and `wind_direction_10m`.

Open-Meteo returns its resolved grid-point coordinates as well as the requested coordinates. Both are retained; the requested coordinates are stored in `latitude` and `longitude`, and the resolved values in `grid_latitude` and `grid_longitude`. Missing API values remain null; timestamps or values are never synthesized.

## Configuration and ingestion

Configure `OPEN_METEO_HISTORICAL_FORECAST_API_URL`, `WEATHER_LOCATION_NAME`, `WEATHER_LATITUDE`, `WEATHER_LONGITUDE`, `WEATHER_START_DATE`, and `WEATHER_END_DATE` in the project environment. The endpoint has a default in `backend/app/config/settings.py`. Open-Meteo requires no API key.

Apply the database migration, then run from the repository root:

```powershell
python -m alembic -c alembic.ini upgrade head
python ml/src/data/ingest_weather_historical_forecast.py
```

The fetch uses HTTP retries for network errors, HTTP 429 rate limits, and server errors. It validates response structure, variable arrays, timestamps, and coordinates; identical duplicate timestamps are deduplicated, while conflicting duplicates fail. Missing observations are counted and retained as nulls. Database writes use an upsert keyed by provider, location name, and UTC timestamp, so reruns update the existing natural keys rather than creating duplicate hours.

## Storage and reproducibility

- **Unmodified API response:** `ml/data/raw/weather/openmeteo/historical_forecast/pune_hourly_<run-id>.json`.
- **Per-run manifest:** `ml/data/raw/weather/openmeteo/historical_forecast/manifest_<run-id>.json` (request parameters, source hash, quality counts, and output paths).
- **Processed CSV:** `ml/data/processed/weather/historical_forecast/pune_hourly_<run-id>.csv`.
- **SQLAlchemy table:** `weather_hourly_observations`; see the Alembic migration `backend/alembic/versions/0003_open_meteo_weather.py`.

Each run writes new timestamped raw and processed files. The manifest includes the raw-response SHA-256 digest. The processed CSV and database preserve `datetime_utc`, `date_utc`, requested and resolved coordinates, `source`, `location_name`, and all eleven requested weather variables. The existing station-based `weather_reanalysis` table and its records are not modified by this ingestion.
