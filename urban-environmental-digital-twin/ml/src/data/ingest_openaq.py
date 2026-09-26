"""
OpenAQ API v3 Ingestion Script for Pune Urban Environmental Digital Twin.

This script queries OpenAQ API v3 for Pune air quality monitoring stations,
retrieves sensor metadata, and downloads historical measurements without alteration.
All raw responses are saved under ml/data/raw/pollution/openaq/.

Usage:
    python ingest_openaq.py --help
    python ingest_openaq.py --scope core
    python ingest_openaq.py --scope all --pollutants pm25
"""

import os
import sys
import json
import time
import logging
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
import requests
from dotenv import load_dotenv

# Ensure stdout handles UTF-8 on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# Configure logging (Never log API keys or secrets!)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("OpenAQ_Ingest")

# Constants
BASE_URL = "https://api.openaq.org/v3"
DEFAULT_BBOX = "73.65,18.35,74.15,18.80"  # Pune metropolitan urban area
DEFAULT_PAGE_LIMIT = 500

# Recommended Representative Urban Stations for Pune MVP
CORE_STATIONS = {
    11613: "Revenue Colony-Shivajinagar (Central Pune - IITM SAFAR Benchmark)",
    60658: "Hadapsar (Eastern Corridor - IITM SAFAR)",
    3409526: "Panchawati Pashan (Western / Institutional - IITM SAFAR)",
    3409438: "Katraj Dairy (Southern Highway Corridor - MPCB)",
    3409331: "Bhosari (Northern Industrial Corridor - IITM SAFAR / PCMC)",
    11609: "Mhada Colony Lohagaon (North-Eastern Residential / Airport Corridor - IITM SAFAR)"
}


class OpenAQClient:
    """HTTP Client for OpenAQ API v3 with rate limiting and retry handling."""

    def __init__(self, api_key: str, request_delay: float = 1.05):
        self.api_key = api_key
        self.request_delay = request_delay
        self.headers = {
            "X-API-Key": self.api_key,
            "Accept": "application/json"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def _wait_for_rate_limit(self, response: requests.Response) -> None:
        """Inspect rate limit headers and wait if nearing exhaustion."""
        try:
            rem_str = response.headers.get("X-Ratelimit-Remaining")
            reset_str = response.headers.get("X-Ratelimit-Reset")
            if rem_str is not None and reset_str is not None:
                remaining = int(rem_str)
                reset_sec = int(reset_str)
                if remaining <= 2:
                    wait_time = max(reset_sec + 1, 2)
                    logger.warning(
                        "OpenAQ rate limit nearly reached (%d remaining). Pausing for %d seconds...",
                        remaining, wait_time
                    )
                    time.sleep(wait_time)
        except Exception as e:
            logger.debug("Failed to parse rate limit headers: %s", e)

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None, max_retries: int = 5) -> requests.Response:
        """Execute a GET request with automatic retry on 408, 429, and 5xx."""
        url = f"{BASE_URL}/{endpoint.lstrip('/')}"
        params = params or {}

        for attempt in range(1, max_retries + 1):
            try:
                time.sleep(self.request_delay)
                response = self.session.get(url, params=params, timeout=45)

                # Check rate limit status
                self._wait_for_rate_limit(response)

                if response.status_code == 200:
                    return response

                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    wait_sec = int(retry_after) if retry_after else 15 * attempt
                    logger.warning(
                        "HTTP 429 (Rate Limited) on %s. Retrying in %d seconds (attempt %d/%d)...",
                        url, wait_sec, attempt, max_retries
                    )
                    time.sleep(wait_sec)
                    continue

                if response.status_code in [408, 502, 503, 504] or response.status_code >= 500:
                    wait_sec = 3 * attempt
                    logger.warning(
                        "HTTP %d (Server/Gateway Timeout) on %s. Retrying in %d seconds (attempt %d/%d)...",
                        response.status_code, url, wait_sec, attempt, max_retries
                    )
                    time.sleep(wait_sec)
                    continue

                response.raise_for_status()

            except (requests.ConnectionError, requests.Timeout) as e:
                wait_sec = 4 * attempt
                logger.warning(
                    "Network error (%s) on %s. Retrying in %d seconds (attempt %d/%d)...",
                    type(e).__name__, url, wait_sec, attempt, max_retries
                )
                time.sleep(wait_sec)

        raise RuntimeError(f"OpenAQ API request failed after {max_retries} attempts: {url}")



def setup_data_directories(base_dir: Path) -> Dict[str, Path]:
    """Create directory structure under ml/data/raw/pollution/openaq/."""
    locations_dir = base_dir / "locations"
    measurements_dir = base_dir / "measurements"
    metadata_dir = base_dir / "metadata"

    for d in [locations_dir, measurements_dir, metadata_dir]:
        d.mkdir(parents=True, exist_ok=True)

    return {
        "base": base_dir,
        "locations": locations_dir,
        "measurements": measurements_dir,
        "metadata": metadata_dir
    }


def write_readme(base_dir: Path) -> None:
    """Create README.md inside the raw openaq directory explaining contents."""
    readme_path = base_dir / "README.md"
    content = """# OpenAQ Raw Air Quality Data (Pune, Maharashtra, India)

## Overview
This directory stores pristine, uncleaned historical air quality and meteorological observations
retrieved directly from the **OpenAQ API v3** for Pune and Pimpri-Chinchwad municipal areas.

## Directory Structure
- `locations/`: Raw JSON responses for discovered Pune monitoring stations.
  - `pune_locations_all.json`: Discovery query results covering the Pune metropolitan bounding box.
  - `location_{id}.json`: Detailed station entity metadata.
- `metadata/`: Sensor catalogs, availability summaries, and ingestion manifests.
  - `sensors_all.json`: Full catalog of all 214 sensor entities across Pune stations.
  - `ingestion_manifest.json`: Manifest recording executed ingestion runs, dates, record counts, and status.
- `measurements/`: Downloaded measurement records.
  - `sensor_{sensor_id}_{parameter}_{location_id}.json`: Pristine raw measurements payload directly from OpenAQ API v3.
  - `raw_measurements.csv`: Consolidated flat tabular representation of all raw measurements without any imputation, transformations, or cleaning.

## Data Classification
- **Type:** `OBSERVED`
- **Source:** OpenAQ API v3 (Original upstream providers: Central Pollution Control Board [CPCB], Maharashtra Pollution Control Board [MPCB], Indian Institute of Tropical Meteorology [IITM SAFAR]).

## Reproducibility
All files here are generated via `ml/src/data/ingest_openaq.py`. Do NOT manually edit or clean files in this directory.
"""
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(content)
    logger.info("Created %s", readme_path)


def fetch_and_save_locations(client: OpenAQClient, dirs: Dict[str, Path], bbox: str = DEFAULT_BBOX) -> List[Dict[str, Any]]:
    """Query OpenAQ v3 for all monitoring locations within the Pune bounding box."""
    logger.info("Fetching Pune locations for bounding box: %s", bbox)
    locations: List[Dict[str, Any]] = []
    page = 1

    while True:
        resp = client.get("locations", params={"bbox": bbox, "limit": 100, "page": page})
        data = resp.json()
        results = data.get("results", [])
        if not results:
            break
        locations.extend(results)
        found = data.get("meta", {}).get("found", len(results))
        if page * 100 >= found if isinstance(found, int) else len(results) < 100:
            break
        page += 1

    logger.info("Discovered %d locations in Pune metropolitan region.", len(locations))

    # Save discovery list
    pune_all_path = dirs["locations"] / "pune_locations_all.json"
    with open(pune_all_path, "w", encoding="utf-8") as f:
        json.dump(locations, f, indent=2, ensure_ascii=False)

    # Fetch detailed record for each location
    detailed_locations = []
    for loc in locations:
        loc_id = loc["id"]
        loc_file = dirs["locations"] / f"location_{loc_id}.json"
        
        # Avoid refetching if already saved and recent
        if loc_file.exists():
            with open(loc_file, "r", encoding="utf-8") as f:
                detailed_loc = json.load(f)
        else:
            resp = client.get(f"locations/{loc_id}")
            res = resp.json().get("results", [])
            detailed_loc = res[0] if res else loc
            with open(loc_file, "w", encoding="utf-8") as f:
                json.dump(detailed_loc, f, indent=2, ensure_ascii=False)
            logger.info("Saved location %d: %s", loc_id, detailed_loc.get("name"))

        detailed_locations.append(detailed_loc)

    return detailed_locations


def fetch_and_save_sensors(client: OpenAQClient, dirs: Dict[str, Path], locations: List[Dict[str, Any]], force: bool = False) -> Dict[int, List[Dict[str, Any]]]:
    """Fetch all sensor entities with coverage metrics for each discovered location."""
    sensors_catalog_path = dirs["metadata"] / "sensors_all.json"
    if sensors_catalog_path.exists() and not force:
        try:
            with open(sensors_catalog_path, "r", encoding="utf-8") as f:
                raw_catalog = json.load(f)
                sensors_by_loc = {int(k): v for k, v in raw_catalog.items()}
                total_sensors = sum(len(s) for s in sensors_by_loc.values())
                logger.info("Loaded %d sensors from existing catalog: %s", total_sensors, sensors_catalog_path)
                return sensors_by_loc
        except Exception:
            logger.warning("Could not read existing sensors catalog. Refetching...")

    logger.info("Fetching sensor metadata for %d locations...", len(locations))
    sensors_by_loc: Dict[int, List[Dict[str, Any]]] = {}

    for loc in locations:
        loc_id = loc["id"]
        resp = client.get(f"locations/{loc_id}/sensors")
        sensors = resp.json().get("results", [])
        sensors_by_loc[loc_id] = sensors

    with open(sensors_catalog_path, "w", encoding="utf-8") as f:
        json.dump(sensors_by_loc, f, indent=2, ensure_ascii=False)

    total_sensors = sum(len(s) for s in sensors_by_loc.values())
    logger.info("Cataloged %d total sensors across %d locations in %s", total_sensors, len(locations), sensors_catalog_path)
    return sensors_by_loc



def select_target_sensors(
    sensors_by_loc: Dict[int, List[Dict[str, Any]]],
    locations_filter: Optional[List[int]],
    parameters_filter: Optional[List[str]],
    era: str = "active"
) -> List[Dict[str, Any]]:
    """Filter sensors based on location selection, parameters, and operational era."""
    selected = []

    for loc_id, sensors in sensors_by_loc.items():
        if locations_filter is not None and loc_id not in locations_filter:
            continue

        for s in sensors:
            p_name = s.get("parameter", {}).get("name")
            if parameters_filter is not None and p_name not in parameters_filter:
                continue

            dt_last = s.get("datetimeLast", {}).get("utc") if s.get("datetimeLast") else None
            is_active = dt_last and "2026" in dt_last

            if era == "active" and not is_active:
                continue
            elif era == "retired" and is_active:
                continue

            cov = s.get("coverage") or {}
            obs_count = cov.get("observedCount", 0)
            if obs_count == 0:
                continue

            selected.append({
                "location_id": loc_id,
                "sensor_id": s["id"],
                "sensor_name": s.get("name"),
                "parameter": p_name,
                "units": s.get("parameter", {}).get("units"),
                "datetime_first": s.get("datetimeFirst", {}).get("utc"),
                "datetime_last": dt_last,
                "observed_count": obs_count
            })

    return selected


def download_sensor_measurements(
    client: OpenAQClient,
    dirs: Dict[str, Path],
    sensor_info: Dict[str, Any],
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    force_refetch: bool = False
) -> List[Dict[str, Any]]:
    """Download historical measurements for a specific sensor entity with pagination."""
    s_id = sensor_info["sensor_id"]
    loc_id = sensor_info["location_id"]
    param = sensor_info["parameter"]
    out_file = dirs["measurements"] / f"sensor_{s_id}_{param}_{loc_id}.json"

    # Avoid duplicate downloads if file exists and has records
    if out_file.exists() and not force_refetch:
        try:
            with open(out_file, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
                if isinstance(cached_data, list) and len(cached_data) > 0:
                    logger.info("Using cached raw data for Sensor %d (%s at Loc %d): %d records", s_id, param, loc_id, len(cached_data))
                    return cached_data
        except Exception:
            logger.warning("Existing file for sensor %d invalid. Refetching...", s_id)

    logger.info(
        "Downloading Sensor %d [%s] (Location %d, Expected ~%d records)...",
        s_id, param, loc_id, sensor_info.get("observed_count", 0)
    )

    measurements: List[Dict[str, Any]] = []
    seen_datetimes = set()
    current_from = date_from
    batch_idx = 0

    while True:
        batch_idx += 1
        params: Dict[str, Any] = {
            "limit": 1000
        }
        if current_from:
            params["datetime_from"] = current_from
        if date_to:
            params["datetime_to"] = date_to

        resp = client.get(f"sensors/{s_id}/measurements", params=params)
        data = resp.json()
        results = data.get("results", [])

        if not results:
            break

        new_count = 0
        latest_dt = None
        for r in results:
            period = r.get("period") or {}
            dt_from = period.get("datetimeFrom", {}).get("utc") if isinstance(period.get("datetimeFrom"), dict) else None
            dt_to = period.get("datetimeTo", {}).get("utc") if isinstance(period.get("datetimeTo"), dict) else None
            
            if dt_from and dt_from not in seen_datetimes:
                seen_datetimes.add(dt_from)
                measurements.append(r)
                new_count += 1
            if dt_to:
                latest_dt = dt_to

        if new_count == 0 or not latest_dt:
            # Reached end or duplicate boundary with no forward progress
            break

        if batch_idx % 5 == 0 or len(results) < 1000:
            logger.info("  ... downloaded %d measurements (latest: %s)", len(measurements), latest_dt[:19] if latest_dt else "N/A")

        current_from = latest_dt

        if len(results) < 1000:
            break

    # Save pristine raw JSON
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(measurements, f, indent=2, ensure_ascii=False)

    logger.info("Completed Sensor %d [%s]: Saved %d measurements to %s", s_id, param, len(measurements), out_file.name)
    return measurements



def export_consolidated_raw_csv(
    dirs: Dict[str, Path],
    measurements_by_sensor: Dict[int, List[Dict[str, Any]]],
    sensors_meta: List[Dict[str, Any]],
    locations_dict: Dict[int, Dict[str, Any]]
) -> Path:
    """Export all downloaded raw measurements into a consolidated tabular CSV without data cleaning."""
    import pandas as pd

    flat_records = []
    sensor_map = {s["sensor_id"]: s for s in sensors_meta}

    for s_id, meas_list in measurements_by_sensor.items():
        s_meta = sensor_map.get(s_id, {})
        loc_id = s_meta.get("location_id")
        loc_obj = locations_dict.get(loc_id, {})
        loc_name = loc_obj.get("name")
        coords = loc_obj.get("coordinates", {})
        lat = coords.get("latitude")
        lon = coords.get("longitude")

        for m in meas_list:
            period = m.get("period") or {}
            dt_from = period.get("datetimeFrom") or {}
            dt_to = period.get("datetimeTo") or {}
            cov = m.get("coverage") or {}
            param_obj = m.get("parameter") or {}
            flag_info = m.get("flagInfo") or {}

            flat_records.append({
                "location_id": loc_id,
                "location_name": loc_name,
                "latitude": lat,
                "longitude": lon,
                "sensor_id": s_id,
                "parameter": param_obj.get("name", s_meta.get("parameter")),
                "unit": param_obj.get("units", s_meta.get("units")),
                "value": m.get("value"),
                "datetime_from_utc": dt_from.get("utc"),
                "datetime_from_local": dt_from.get("local"),
                "datetime_to_utc": dt_to.get("utc"),
                "datetime_to_local": dt_to.get("local"),
                "interval": period.get("interval"),
                "expected_interval": cov.get("expectedInterval"),
                "observed_count": cov.get("observedCount"),
                "percent_coverage": cov.get("percentCoverage"),
                "has_flags": flag_info.get("hasFlags", False),
                "data_type": "OBSERVED"
            })

    df = pd.DataFrame(flat_records)
    csv_path = dirs["measurements"] / "raw_measurements.csv"
    df.to_csv(csv_path, index=False)
    logger.info("Saved %d consolidated raw measurement rows to %s", len(df), csv_path)
    return csv_path


def main():
    parser = argparse.ArgumentParser(description="Ingest historical air quality data from OpenAQ API v3 for Pune.")
    parser.add_argument("--scope", choices=["core", "all", "benchmark", "custom"], default="core",
                        help="Data scope: 'core' (6 representative stations across all Pune quadrants), 'benchmark' (Shivajinagar 11613 only), 'all' (all 14 active stations), 'custom' (use --locations).")
    parser.add_argument("--locations", type=str, default=None,
                        help="Comma-separated OpenAQ location IDs for custom scope (e.g. 11613,60658).")
    parser.add_argument("--pollutants", type=str, default=None,
                        help="Comma-separated parameters to fetch (default: PM2.5 for all stations, + PM10/NO2/meteo for benchmark).")
    parser.add_argument("--date-from", type=str, default=None, help="Start UTC datetime (ISO format e.g. 2025-02-18T00:00:00Z).")
    parser.add_argument("--date-to", type=str, default=None, help="End UTC datetime (ISO format e.g. 2026-09-25T00:00:00Z).")
    parser.add_argument("--era", choices=["active", "retired", "both"], default="active", help="Operational era to query.")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory for raw data.")
    parser.add_argument("--force", action="store_true", help="Force refetching existing sensor measurement files.")

    args = parser.parse_args()

    # 1. Resolve project root and read OPENAQ_API_KEY
    script_dir = Path(__file__).resolve().parent
    # Expected structure: urban-environmental-digital-twin/ml/src/data/
    project_root = script_dir.parents[2]
    env_file = project_root / ".env"
    
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
    else:
        # Fallback to local directory
        load_dotenv()

    api_key = os.getenv("OPENAQ_API_KEY")
    if not api_key:
        logger.error("=" * 60)
        logger.error("MISSING ENVIRONMENT VARIABLE: OPENAQ_API_KEY")
        logger.error("Please add your OpenAQ API v3 key to: %s", env_file)
        logger.error("Format:")
        logger.error("  OPENAQ_API_KEY=<your_api_key_here>")
        logger.error("=" * 60)
        sys.exit(1)

    # 2. Setup output directories
    if args.output_dir:
        base_dir = Path(args.output_dir)
    else:
        base_dir = project_root / "ml" / "data" / "raw" / "pollution" / "openaq"

    dirs = setup_data_directories(base_dir)
    write_readme(dirs["base"])

    # 3. Initialize OpenAQ v3 Client
    client = OpenAQClient(api_key=api_key, request_delay=1.05)

    # 4. Fetch / Update Locations Metadata
    locations = fetch_and_save_locations(client, dirs)
    locations_dict = {loc["id"]: loc for loc in locations}

    # 5. Fetch / Update Sensors Metadata
    sensors_by_loc = fetch_and_save_sensors(client, dirs, locations)

    # 6. Determine Target Locations and Parameters
    if args.scope == "benchmark":
        target_locations = [11613]
        target_pollutants = args.pollutants.split(",") if args.pollutants else [
            "pm25", "pm10", "no2", "temperature", "relativehumidity", "wind_speed"
        ]
    elif args.scope == "core":
        target_locations = list(CORE_STATIONS.keys())
        target_pollutants = args.pollutants.split(",") if args.pollutants else None
    elif args.scope == "all":
        target_locations = None  # all locations
        target_pollutants = args.pollutants.split(",") if args.pollutants else ["pm25"]
    elif args.scope == "custom":
        if not args.locations:
            logger.error("--scope custom requires --locations <id1,id2>")
            sys.exit(1)
        target_locations = [int(x.strip()) for x in args.locations.split(",")]
        target_pollutants = args.pollutants.split(",") if args.pollutants else None

    # Filter target sensors
    selected_sensors = select_target_sensors(
        sensors_by_loc,
        locations_filter=target_locations,
        parameters_filter=target_pollutants,
        era=args.era
    )

    # For core scope, if pollutants was None, prioritize:
    # - PM2.5 across all core stations
    # - PM10, NO2, Temperature, Relative Humidity, Wind Speed for the central benchmark station (11613)
    if args.scope == "core" and args.pollutants is None:
        filtered = []
        for s in selected_sensors:
            loc_id = s["location_id"]
            param = s["parameter"]
            if param == "pm25":
                filtered.append(s)
            elif loc_id == 11613 and param in ["pm10", "no2", "temperature", "relativehumidity", "wind_speed"]:
                filtered.append(s)
        selected_sensors = filtered

    logger.info("Selected %d sensors for download under scope '%s':", len(selected_sensors), args.scope)
    for s in selected_sensors:
        logger.info(
            "  - Loc %d (%s) | Sensor %d | Param: %s (%s) | ~%d records",
            s["location_id"], locations_dict.get(s["location_id"], {}).get("name", "Unknown"),
            s["sensor_id"], s["parameter"], s["units"], s["observed_count"]
        )

    # 7. Download Measurements
    measurements_by_sensor: Dict[int, List[Dict[str, Any]]] = {}
    start_time = time.time()

    for idx, s_info in enumerate(selected_sensors, 1):
        logger.info("[%d/%d] Ingesting measurements for sensor %d...", idx, len(selected_sensors), s_info["sensor_id"])
        meas = download_sensor_measurements(
            client=client,
            dirs=dirs,
            sensor_info=s_info,
            date_from=args.date_from,
            date_to=args.date_to,
            force_refetch=args.force
        )
        measurements_by_sensor[s_info["sensor_id"]] = meas

    elapsed_sec = time.time() - start_time
    total_downloaded = sum(len(m) for m in measurements_by_sensor.values())
    logger.info("Ingestion completed in %.1f seconds. Total measurement records downloaded: %d", elapsed_sec, total_downloaded)

    # 8. Export Consolidated Raw CSV
    csv_path = export_consolidated_raw_csv(dirs, measurements_by_sensor, selected_sensors, locations_dict)

    # 9. Record Manifest Metadata
    manifest_path = dirs["metadata"] / "ingestion_manifest.json"
    manifest = {
        "ingestion_timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scope": args.scope,
        "era": args.era,
        "selected_locations": target_locations,
        "total_locations_discovered": len(locations),
        "total_sensors_cataloged": sum(len(s) for s in sensors_by_loc.values()),
        "downloaded_sensors_count": len(selected_sensors),
        "total_records_ingested": total_downloaded,
        "elapsed_seconds": round(elapsed_sec, 2),
        "output_csv": str(csv_path.relative_to(project_root)),
        "sensors_manifest": selected_sensors
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    logger.info("Recorded ingestion manifest to %s", manifest_path)


if __name__ == "__main__":
    main()
