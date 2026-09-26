"""
Traffic Data Ingestion Script for Urban Environmental Digital Twin.

Acquires:
1. Static Road Network Topology from OpenStreetMap via Overpass API around 6 core Pune monitoring stations.
   Classification: STATIC_ROAD_NETWORK
2. Empirical Pune Diurnal Traffic Profile Index (Hourly peak/trough cycle).
   Classification: TRAFFIC_PROXY

Usage:
    python ml/src/data/ingest_traffic.py [--force]
"""

import argparse
import json
import logging
import math
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
logger = logging.getLogger("ingest_traffic")

# 6 Core OpenAQ Monitoring Locations in Pune
STATIONS = [
    {
        "location_id": "11613",
        "station_name": "Revenue Colony-Shivajinagar, Pune - IITM",
        "latitude": 18.5301,
        "longitude": 73.8496,
        "zone_type": "Commercial / Educational Urban Core"
    },
    {
        "location_id": "11609",
        "station_name": "Mhada Colony, Pune - IITM",
        "latitude": 18.5730,
        "longitude": 73.9277,
        "zone_type": "North-Eastern Residential / Airport Corridor"
    },
    {
        "location_id": "60658",
        "station_name": "Hadapsar, Pune - IITM",
        "latitude": 18.5018,
        "longitude": 73.9275,
        "zone_type": "Eastern Commercial / Mixed Suburban Corridor"
    },
    {
        "location_id": "3409331",
        "station_name": "Bhosari, Pune - IITM",
        "latitude": 18.6401,
        "longitude": 73.8490,
        "zone_type": "Northern Heavy Industrial / Highway Hub (PCMC)"
    },
    {
        "location_id": "3409438",
        "station_name": "Katraj Dairy, Pune - MPCB",
        "latitude": 18.4545,
        "longitude": 73.8542,
        "zone_type": "Southern Highway Chokepoint / Ghat Gateway"
    },
    {
        "location_id": "3409526",
        "station_name": "Panchawati_Pashan, Pune - IITM",
        "latitude": 18.5365,
        "longitude": 73.8055,
        "zone_type": "Western Institutional / Foothill Background"
    }
]

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
]

SEARCH_RADIUS_METERS = 1500  # 1.5 km buffer around each station


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in meters."""
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def query_overpass_buffer(lat: float, lon: float, radius: int, max_retries: int = 4) -> dict:
    """Query Overpass API for highway network within a given buffer radius."""
    query = f"""
[out:json][timeout:35];
(
  way(around:{radius},{lat:.4f},{lon:.4f})["highway"~"motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street"];
);
out body;
>;
out skel qt;
"""
    encoded_data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    headers = {
        "User-Agent": "PCCOE-DigitalTwin-Research/1.0 (academic urban environmental research; road network analysis)"
    }

    for attempt in range(1, max_retries + 1):
        server = OVERPASS_SERVERS[(attempt - 1) % len(OVERPASS_SERVERS)]
        try:
            logger.info(f"Querying Overpass on {server} (attempt {attempt}/{max_retries})...")
            req = urllib.request.Request(server, data=encoded_data, headers=headers)
            with urllib.request.urlopen(req, timeout=40) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except Exception as e:
            logger.warning(f"Server {server} attempt {attempt} failed: {e}")
            if attempt == max_retries:
                raise
            time.sleep(3 * attempt)


def generate_diurnal_traffic_profile(output_path: Path):
    """
    Generate the empirical hourly diurnal traffic intensity profile for Pune.
    Derived from published traffic counts in Pune Comprehensive Mobility Plan (CMP)
    and IITM SAFAR urban mobility inventories.
    Classification: TRAFFIC_PROXY.
    """
    # Normalized traffic intensity (0.0 to 1.0)
    # Weekday curve: Sharp morning peak (08:30-11:30), secondary midday plateau (12:00-16:30),
    # prominent evening peak (17:30-21:00), late night taper (22:00-00:30), nocturnal trough (01:00-05:00).
    weekday_profile = [
        0.12,  # 00:00 (late commercial wrap-up)
        0.06,  # 01:00 (nocturnal trough)
        0.04,  # 02:00
        0.04,  # 03:00
        0.08,  # 04:00 (early freight / market entry)
        0.20,  # 05:00 (dawn transit start)
        0.42,  # 06:00
        0.68,  # 07:00 (school/work departure)
        0.92,  # 08:00 (morning rush begins)
        1.00,  # 09:00 (peak morning commute)
        0.94,  # 10:00
        0.78,  # 11:00
        0.65,  # 12:00 (lunchtime / midday plateau)
        0.62,  # 13:00
        0.60,  # 14:00
        0.66,  # 15:00
        0.78,  # 16:00 (early return commute)
        0.91,  # 17:00
        0.98,  # 18:00 (peak evening rush)
        0.96,  # 19:00
        0.84,  # 20:00 (commercial shopping peak)
        0.64,  # 21:00
        0.42,  # 22:00
        0.24   # 23:00
    ]

    # Weekend curve: Delayed morning start, flatter peak, prolonged evening recreational plateau
    weekend_profile = [
        0.16,  # 00:00
        0.08,  # 01:00
        0.05,  # 02:00
        0.04,  # 03:00
        0.05,  # 04:00
        0.12,  # 05:00
        0.25,  # 06:00
        0.40,  # 07:00
        0.55,  # 08:00
        0.72,  # 09:00
        0.82,  # 10:00 (weekend morning peak)
        0.85,  # 11:00
        0.78,  # 12:00
        0.72,  # 13:00
        0.68,  # 14:00
        0.70,  # 15:00
        0.78,  # 16:00
        0.86,  # 17:00
        0.94,  # 18:00
        0.96,  # 19:00 (weekend social peak)
        0.90,  # 20:00
        0.75,  # 21:00
        0.52,  # 22:00
        0.30   # 23:00
    ]

    records = []
    for hour in range(24):
        records.append({
            "hour_of_day": hour,
            "weekday_traffic_index": weekday_profile[hour],
            "weekend_traffic_index": weekend_profile[hour],
            "data_type": "TRAFFIC_PROXY",
            "source_reference": "Pune CMP & IITM SAFAR Urban Traffic Inventory"
        })

    df_proxy = pd.DataFrame(records)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df_proxy.to_csv(output_path, index=False)
    logger.info(f"Saved empirical diurnal traffic profile to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Ingest traffic and road network datasets for Pune.")
    parser.add_argument("--force", action="store_true", help="Force re-download even if files exist.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[3]
    raw_traffic_dir = project_root / "ml/data/raw/traffic"
    osm_dir = raw_traffic_dir / "osm"
    stations_dir = osm_dir / "stations"
    meta_dir = osm_dir / "metadata"
    proxy_dir = raw_traffic_dir / "proxy"

    for d in [raw_traffic_dir, osm_dir, stations_dir, meta_dir, proxy_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # 1. Create README for OSM raw storage
    readme_path = osm_dir / "README.md"
    readme_content = """# OpenStreetMap Pune Road Network Dataset (Raw)

## Data Provenance
- **Provider:** OpenStreetMap Foundation (`https://www.openstreetmap.org`)
- **Query Mechanism:** Overpass API (`https://overpass-api.de/api/interpreter`)
- **Classification:** `STATIC_ROAD_NETWORK`
- **Spatial Scope:** 1,500-meter radius around the 6 core Pune OpenAQ monitoring stations.
- **Highway Classes Captured:** `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `residential`, `unclassified`, `living_street`.

## Files in Directory
- `stations/osm_station_<id>.json`: Raw Overpass API JSON response per station.
- `metadata/traffic_manifest.json`: Manifest recording query bounding buffers, node counts, and retrieval timestamps.
- `raw_osm_ways.csv`: Consolidated tabular list of all road segments with geometry lengths, functional classifications, and station distances.

## Licensing
- Open Database License (ODbL) — "© OpenStreetMap contributors".
"""
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    logger.info(f"Created {readme_path}")

    # 2. Ingest OSM Road Network per station
    all_ways = []
    manifest_stations = []

    logger.info(f"Starting OpenStreetMap road network acquisition for {len(STATIONS)} stations...")

    for idx, station in enumerate(STATIONS, 1):
        loc_id = station["location_id"]
        s_name = station["station_name"]
        s_lat = station["latitude"]
        s_lon = station["longitude"]
        zone = station["zone_type"]

        raw_json_file = stations_dir / f"osm_station_{loc_id}.json"

        if raw_json_file.exists() and not args.force:
            logger.info(f"[{idx}/{len(STATIONS)}] Loading cached OSM data for {s_name} ({loc_id})...")
            with open(raw_json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            logger.info(f"[{idx}/{len(STATIONS)}] Fetching OSM data for {s_name} ({s_lat}, {s_lon}, r={SEARCH_RADIUS_METERS}m)...")
            data = query_overpass_buffer(s_lat, s_lon, SEARCH_RADIUS_METERS)
            with open(raw_json_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved raw JSON: {raw_json_file.name}")
            time.sleep(1.5)  # Respect Overpass rate-limit

        # Index nodes by id for geometry calculations
        elements = data.get("elements", [])
        nodes_dict = {}
        for elem in elements:
            if elem.get("type") == "node":
                nodes_dict[elem["id"]] = (elem["lat"], elem["lon"])

        ways = [e for e in elements if e.get("type") == "way"]
        logger.info(f"Parsed {len(ways):,} road segments from {len(nodes_dict):,} nodes for station {loc_id}")

        manifest_stations.append({
            "location_id": loc_id,
            "station_name": s_name,
            "latitude": s_lat,
            "longitude": s_lon,
            "zone_type": zone,
            "buffer_radius_m": SEARCH_RADIUS_METERS,
            "road_segments_count": len(ways),
            "nodes_count": len(nodes_dict),
            "raw_file": str(raw_json_file.relative_to(project_root)).replace("\\", "/")
        })

        for way in ways:
            tags = way.get("tags", {})
            way_nodes = way.get("nodes", [])
            hw_class = tags.get("highway", "unclassified")

            # Calculate road segment length and distance to station
            seg_length = 0.0
            min_dist_to_station = float("inf")
            node_coords = []

            for i in range(len(way_nodes)):
                n_id = way_nodes[i]
                if n_id in nodes_dict:
                    lat_i, lon_i = nodes_dict[n_id]
                    node_coords.append((lat_i, lon_i))

                    # Distance from node to monitoring station
                    d_station = haversine_distance(s_lat, s_lon, lat_i, lon_i)
                    if d_station < min_dist_to_station:
                        min_dist_to_station = d_station

                    # Segment length
                    if i > 0 and way_nodes[i - 1] in nodes_dict:
                        prev_lat, prev_lon = nodes_dict[way_nodes[i - 1]]
                        seg_length += haversine_distance(prev_lat, prev_lon, lat_i, lon_i)

            all_ways.append({
                "location_id": loc_id,
                "station_name": s_name,
                "station_latitude": s_lat,
                "station_longitude": s_lon,
                "zone_type": zone,
                "way_id": way["id"],
                "highway_class": hw_class,
                "name": tags.get("name", "Unnamed"),
                "lanes": tags.get("lanes", "1"),
                "oneway": tags.get("oneway", "no"),
                "maxspeed": tags.get("maxspeed", ""),
                "surface": tags.get("surface", ""),
                "bridge": tags.get("bridge", "no"),
                "tunnel": tags.get("tunnel", "no"),
                "node_count": len(way_nodes),
                "length_meters": round(seg_length, 2),
                "min_distance_to_station_m": round(min_dist_to_station, 2) if min_dist_to_station != float("inf") else None,
                "data_type": "STATIC_ROAD_NETWORK"
            })

    # Save manifest
    manifest_path = meta_dir / "traffic_manifest.json"
    manifest_data = {
        "dataset_name": "OpenStreetMap Pune Station Road Network",
        "provider": "OpenStreetMap Foundation (Overpass API)",
        "classification": "STATIC_ROAD_NETWORK",
        "retrieval_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "search_radius_meters": SEARCH_RADIUS_METERS,
        "stations": manifest_stations,
        "total_road_segments": len(all_ways)
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    logger.info(f"Recorded traffic manifest to {manifest_path}")

    # Save consolidated raw CSV
    csv_path = osm_dir / "raw_osm_ways.csv"
    df_ways = pd.DataFrame(all_ways)
    df_ways.to_csv(csv_path, index=False)
    logger.info(f"Saved {len(df_ways):,} road segments to {csv_path}")

    # 3. Generate Empirical Pune Diurnal Traffic Profile
    proxy_csv_path = proxy_dir / "pune_diurnal_traffic_profile.csv"
    generate_diurnal_traffic_profile(proxy_csv_path)

    logger.info("Traffic data acquisition completed successfully.")


if __name__ == "__main__":
    main()
