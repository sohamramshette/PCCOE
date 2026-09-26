"""
Weather Data Ingestion Script for Urban Environmental Digital Twin.

Retrieves historical hourly meteorological reanalysis data from Open-Meteo
Historical Weather API (ECMWF ERA5 / ERA5-Land reanalysis).

Classification: REANALYSIS
Target Geography: Pune Metropolitan Area, Maharashtra, India
Target Period: 2025-02-18 to 2026-09-24 (matching OpenAQ observation window)
Temporal Resolution: Hourly (14,016 continuous hours)

Usage:
    python ml/src/data/ingest_weather.py [--force]
"""

import argparse
import json
import logging
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("ingest_weather")

BASE_API_URL = "https://archive-api.open-meteo.com/v1/archive"
START_DATE = "2025-02-18"
END_DATE = "2026-09-24"

# 6 Core OpenAQ Monitoring Locations + Central Pune Anchor
STATIONS = [
    {
        "location_id": "central_pune",
        "station_name": "Pune Urban Center (PMC Anchor)",
        "latitude": 18.5204,
        "longitude": 73.8567
    },
    {
        "location_id": "11613",
        "station_name": "Revenue Colony-Shivajinagar, Pune - IITM",
        "latitude": 18.5301,
        "longitude": 73.8496
    },
    {
        "location_id": "11609",
        "station_name": "Mhada Colony, Pune - IITM",
        "latitude": 18.5730,
        "longitude": 73.9277
    },
    {
        "location_id": "60658",
        "station_name": "Hadapsar, Pune - IITM",
        "latitude": 18.5018,
        "longitude": 73.9275
    },
    {
        "location_id": "3409331",
        "station_name": "Bhosari, Pune - IITM",
        "latitude": 18.6401,
        "longitude": 73.8490
    },
    {
        "location_id": "3409438",
        "station_name": "Katraj Dairy, Pune - MPCB",
        "latitude": 18.4545,
        "longitude": 73.8542
    },
    {
        "location_id": "3409526",
        "station_name": "Panchawati_Pashan, Pune - IITM",
        "latitude": 18.5365,
        "longitude": 73.8055
    }
]

# Required & Optional Variables
VARIABLES = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "precipitation",
    "rain",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "shortwave_radiation_instant",
    "cloud_cover",
    "boundary_layer_height"
]


def fetch_open_meteo(lat: float, lon: float, max_retries: int = 5) -> dict:
    """Fetch hourly weather data from Open-Meteo with retry logic."""
    params = {
        "latitude": f"{lat:.4f}",
        "longitude": f"{lon:.4f}",
        "start_date": START_DATE,
        "end_date": END_DATE,
        "hourly": ",".join(VARIABLES),
        "wind_speed_unit": "ms",
        "timezone": "UTC"
    }
    url = f"{BASE_API_URL}?{urllib.parse.urlencode(params)}"
    
    headers = {
        "User-Agent": "PCCOE-UrbanDigitalTwin-Research/1.0 (academic open data acquisition)"
    }
    
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            logger.warning(f"Attempt {attempt}/{max_retries} failed for ({lat}, {lon}): {e}")
            if attempt == max_retries:
                raise
            time.sleep(2 * attempt)


def main():
    parser = argparse.ArgumentParser(description="Ingest historical weather data from Open-Meteo.")
    parser.add_argument("--force", action="store_true", help="Force re-download even if files exist.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[3]
    raw_dir = project_root / "ml/data/raw/weather/openmeteo"
    obs_dir = raw_dir / "observations"
    meta_dir = raw_dir / "metadata"

    for d in [raw_dir, obs_dir, meta_dir]:
        d.mkdir(parents=True, exist_ok=True)

    readme_path = raw_dir / "README.md"
    if not readme_path.exists() or args.force:
        readme_content = """# Open-Meteo Pune Historical Weather Dataset (Raw)

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
"""
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(readme_content)
        logger.info(f"Created {readme_path}")

    all_records = []
    manifest_entries = []

    logger.info(f"Starting weather data acquisition for {len(STATIONS)} Pune locations...")
    logger.info(f"Date range: {START_DATE} to {END_DATE} (UTC)")

    for idx, station in enumerate(STATIONS, 1):
        loc_id = station["location_id"]
        station_name = station["station_name"]
        lat = station["latitude"]
        lon = station["longitude"]

        raw_json_file = obs_dir / f"weather_location_{loc_id}.json"

        if raw_json_file.exists() and not args.force:
            logger.info(f"[{idx}/{len(STATIONS)}] Loading cached raw data for {station_name} ({loc_id})...")
            with open(raw_json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            logger.info(f"[{idx}/{len(STATIONS)}] Querying Open-Meteo for {station_name} ({lat}, {lon})...")
            data = fetch_open_meteo(lat, lon)
            with open(raw_json_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved raw JSON: {raw_json_file.name}")
            time.sleep(1.0)  # Friendly rate-limit pause

        # Extract grid metadata
        grid_lat = data.get("latitude")
        grid_lon = data.get("longitude")
        grid_elev = data.get("elevation")
        units = data.get("hourly_units", {})
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])

        manifest_entries.append({
            "location_id": loc_id,
            "station_name": station_name,
            "requested_lat": lat,
            "requested_lon": lon,
            "resolved_grid_lat": grid_lat,
            "resolved_grid_lon": grid_lon,
            "elevation_m": grid_elev,
            "record_count": len(times),
            "raw_file": str(raw_json_file.relative_to(project_root)).replace("\\", "/")
        })

        # Build tabular records
        n_times = len(times)
        for i in range(n_times):
            row = {
                "location_id": loc_id,
                "station_name": station_name,
                "requested_latitude": lat,
                "requested_longitude": lon,
                "grid_latitude": grid_lat,
                "grid_longitude": grid_lon,
                "elevation": grid_elev,
                "datetime_utc": f"{times[i]}:00Z" if len(times[i]) == 16 else times[i],
                "data_type": "REANALYSIS"
            }
            for var in VARIABLES:
                val = hourly.get(var, [None] * n_times)[i]
                row[var] = val
            all_records.append(row)

    # Save manifest
    manifest_path = meta_dir / "weather_manifest.json"
    manifest_data = {
        "dataset_name": "Open-Meteo Pune Historical Weather Dataset",
        "provider": "Open-Meteo GmbH / ECMWF ERA5-Land",
        "classification": "REANALYSIS",
        "api_endpoint": BASE_API_URL,
        "date_range": {
            "start_date": START_DATE,
            "end_date": END_DATE
        },
        "variables_requested": VARIABLES,
        "units": units,
        "locations": manifest_entries,
        "ingestion_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "total_rows": len(all_records)
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    logger.info(f"Recorded weather metadata manifest to {manifest_path}")

    # Save consolidated raw CSV
    csv_path = raw_dir / "raw_weather_hourly.csv"
    df_raw = pd.DataFrame(all_records)
    df_raw.to_csv(csv_path, index=False)
    logger.info(f"Saved {len(df_raw):,} consolidated raw weather observations to {csv_path}")


if __name__ == "__main__":
    main()
