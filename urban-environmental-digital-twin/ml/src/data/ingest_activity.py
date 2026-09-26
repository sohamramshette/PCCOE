"""
Urban Activity, Industrial, and Construction Data Ingestion Script.

Acquires:
1. Industrial activity & land-use footprints (Classification: STATIC_INDUSTRIAL / INDUSTRIAL_PROXY)
2. Construction sites & infrastructure works (Classification: CONSTRUCTION_PROXY)
3. Land-use classifications & green spaces (Classification: STATIC_LAND_USE)
4. Commercial & institutional POI density (Classification: ACTIVITY_PROXY)

Source: OpenStreetMap via Overpass API around 6 core Pune monitoring stations.

Usage:
    python ml/src/data/ingest_activity.py [--force]
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
logger = logging.getLogger("ingest_activity")

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
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in meters."""
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def query_overpass(query: str, max_retries: int = 6) -> dict:
    """Execute Overpass QL query with server rotation and retries."""
    encoded_data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    headers = {
        "User-Agent": "PCCOE-DigitalTwin-Research/1.0 (academic urban environmental research)"
    }

    for attempt in range(1, max_retries + 1):
        server = OVERPASS_SERVERS[(attempt - 1) % len(OVERPASS_SERVERS)]
        try:
            logger.info(f"Querying Overpass on {server} (attempt {attempt}/{max_retries})...")
            req = urllib.request.Request(server, data=encoded_data, headers=headers)
            with urllib.request.urlopen(req, timeout=50) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except Exception as e:
            logger.warning(f"Server {server} attempt {attempt} failed: {e}")
            if attempt == max_retries:
                raise
            time.sleep(4 * attempt)



def main():
    parser = argparse.ArgumentParser(description="Ingest urban activity, industrial, and construction datasets.")
    parser.add_argument("--force", action="store_true", help="Force re-download even if files exist.")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[3]
    raw_dir = project_root / "ml/data/raw/activity"
    ind_dir = raw_dir / "industrial"
    con_dir = raw_dir / "construction"
    lnd_dir = raw_dir / "landuse"
    poi_dir = raw_dir / "poi"
    meta_dir = raw_dir / "metadata"

    for d in [raw_dir, ind_dir, con_dir, lnd_dir, poi_dir, meta_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # 1. Create README for activity raw storage
    readme_path = raw_dir / "README.md"
    readme_content = """# Pune Urban Activity, Industrial, and Construction Datasets (Raw)

## Overview
This directory stores the raw activity, industrial, construction, and land-use datasets acquired from OpenStreetMap for the Pune Urban Environmental Digital Twin.

## Data Provenance & Classifications
1. `industrial/`:
   - Polygons and nodes tagged with `landuse=industrial`, `man_made=works`, `building=industrial`.
   - Classification: `STATIC_INDUSTRIAL` (facility locations) / `INDUSTRIAL_PROXY` (buffer densities).
2. `construction/`:
   - Polygons and ways tagged with `landuse=construction`, `highway=construction` (active civil engineering, metro, flyover sites).
   - Classification: `CONSTRUCTION_PROXY`.
3. `landuse/`:
   - Land-use zoning polygons: `residential`, `commercial`, `retail`, `industrial`, `institutional`, `park`, `forest`.
   - Classification: `STATIC_LAND_USE`.
4. `poi/`:
   - Commercial, institutional, and transit points of interest: restaurants, shops, offices, educational centers, hospitals.
   - Classification: `ACTIVITY_PROXY`.

## Licensing
- Open Database License (ODbL) — "© OpenStreetMap contributors".
"""
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    logger.info(f"Created {readme_path}")

    # Build Overpass query for all stations
    # 1. Industrial query (3,000m radius around each station to capture regional factory belts)
    # 2. Construction query (2,000m radius)
    # 3. Land use query (2,000m radius)
    # 4. POI query (1,500m radius)
    ind_records = []
    con_records = []
    lnd_records = []
    poi_records = []

    logger.info(f"Starting activity data acquisition across {len(STATIONS)} stations...")

    for idx, station in enumerate(STATIONS, 1):
        loc_id = station["location_id"]
        s_name = station["station_name"]
        s_lat = station["latitude"]
        s_lon = station["longitude"]
        zone = station["zone_type"]

        logger.info(f"[{idx}/{len(STATIONS)}] Querying activity data for {s_name} ({loc_id})...")

        station_cache_file = raw_dir / f"activity_station_{loc_id}.json"

        if station_cache_file.exists() and not args.force:
            logger.info(f"Loading cached activity data for station {loc_id}...")
            with open(station_cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        else:
            query = f"""
[out:json][timeout:35];
(
  // Industrial elements (2 km buffer)
  way(around:2000,{s_lat:.4f},{s_lon:.4f})["landuse"="industrial"];
  node(around:2000,{s_lat:.4f},{s_lon:.4f})["man_made"="works"];
  node(around:2000,{s_lat:.4f},{s_lon:.4f})["industrial"];
  way(around:2000,{s_lat:.4f},{s_lon:.4f})["building"="industrial"];

  // Construction elements (1.5 km buffer)
  way(around:1500,{s_lat:.4f},{s_lon:.4f})["landuse"="construction"];
  way(around:1500,{s_lat:.4f},{s_lon:.4f})["highway"="construction"];
  way(around:1500,{s_lat:.4f},{s_lon:.4f})["building"="construction"];

  // Land use polygons (1.5 km buffer)
  way(around:1500,{s_lat:.4f},{s_lon:.4f})["landuse"~"residential|commercial|retail|industrial|institutional|forest|meadow|grass"];
  way(around:1500,{s_lat:.4f},{s_lon:.4f})["leisure"~"park|garden"];

  // POI & Activity nodes (1.5 km buffer)
  node(around:1500,{s_lat:.4f},{s_lon:.4f})["amenity"~"restaurant|cafe|fast_food|bank|school|college|university|hospital|bus_station|fuel"];
  node(around:1500,{s_lat:.4f},{s_lon:.4f})["shop"];
  node(around:1500,{s_lat:.4f},{s_lon:.4f})["office"];
);
out tags center;
"""
            data = query_overpass(query)

            with open(station_cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved activity raw JSON: {station_cache_file.name}")
            time.sleep(2.0)  # Overpass rate limit friendliness

        elements = data.get("elements", [])
        logger.info(f"Station {loc_id} returned {len(elements):,} activity elements.")

        for elem in elements:
            tags = elem.get("tags", {})
            e_id = elem["id"]
            e_type = elem.get("type")

            # Extract coordinates (from center or direct node lat/lon)
            if e_type == "node":
                e_lat, e_lon = elem.get("lat"), elem.get("lon")
            else:
                center = elem.get("center", {})
                e_lat, e_lon = center.get("lat"), center.get("lon")

            dist_m = haversine_distance(s_lat, s_lon, e_lat, e_lon) if (e_lat and e_lon) else None

            # Categorize into the 4 buckets
            # A. Industrial
            if tags.get("landuse") == "industrial" or tags.get("building") == "industrial" or "industrial" in tags or tags.get("man_made") == "works":
                ind_records.append({
                    "station_id": loc_id,
                    "station_name": s_name,
                    "element_id": e_id,
                    "element_type": e_type,
                    "name": tags.get("name", "Unnamed Industrial"),
                    "operator": tags.get("operator", ""),
                    "industrial_type": tags.get("industrial", tags.get("man_made", "industrial_zone")),
                    "latitude": e_lat,
                    "longitude": e_lon,
                    "distance_to_station_m": round(dist_m, 1) if dist_m else None,
                    "data_type": "STATIC_INDUSTRIAL"
                })

            # B. Construction
            if tags.get("landuse") == "construction" or tags.get("highway") == "construction" or tags.get("building") == "construction":
                con_type = "building_construction"
                if tags.get("highway") == "construction":
                    con_type = "road_infrastructure_construction"
                elif tags.get("landuse") == "construction":
                    con_type = "site_development_construction"

                con_records.append({
                    "station_id": loc_id,
                    "station_name": s_name,
                    "element_id": e_id,
                    "element_type": e_type,
                    "name": tags.get("name", "Active Construction Project"),
                    "construction_type": con_type,
                    "latitude": e_lat,
                    "longitude": e_lon,
                    "distance_to_station_m": round(dist_m, 1) if dist_m else None,
                    "data_type": "CONSTRUCTION_PROXY"
                })

            # C. Land Use
            if "landuse" in tags or "leisure" in tags:
                lu_class = tags.get("landuse", tags.get("leisure", "other"))
                lnd_records.append({
                    "station_id": loc_id,
                    "station_name": s_name,
                    "element_id": e_id,
                    "element_type": e_type,
                    "landuse_class": lu_class,
                    "name": tags.get("name", ""),
                    "latitude": e_lat,
                    "longitude": e_lon,
                    "distance_to_station_m": round(dist_m, 1) if dist_m else None,
                    "data_type": "STATIC_LAND_USE"
                })

            # D. POI & Human Activity
            if "amenity" in tags or "shop" in tags or "office" in tags:
                poi_category = "commercial"
                poi_subcat = tags.get("shop", tags.get("office", tags.get("amenity", "commercial")))
                if tags.get("amenity") in ["school", "college", "university", "hospital"]:
                    poi_category = "institutional"
                elif tags.get("amenity") in ["bus_station", "fuel"]:
                    poi_category = "transportation"

                poi_records.append({
                    "station_id": loc_id,
                    "station_name": s_name,
                    "element_id": e_id,
                    "element_type": e_type,
                    "category": poi_category,
                    "subcategory": poi_subcat,
                    "name": tags.get("name", ""),
                    "latitude": e_lat,
                    "longitude": e_lon,
                    "distance_to_station_m": round(dist_m, 1) if dist_m else None,
                    "data_type": "ACTIVITY_PROXY"
                })

    # Save CSVs
    df_ind = pd.DataFrame(ind_records)
    df_ind.to_csv(ind_dir / "raw_industrial_elements.csv", index=False)
    logger.info(f"Saved {len(df_ind):,} industrial elements to {ind_dir / 'raw_industrial_elements.csv'}")

    df_con = pd.DataFrame(con_records)
    df_con.to_csv(con_dir / "raw_construction_elements.csv", index=False)
    logger.info(f"Saved {len(df_con):,} construction elements to {con_dir / 'raw_construction_elements.csv'}")

    df_lnd = pd.DataFrame(lnd_records)
    df_lnd.to_csv(lnd_dir / "raw_landuse_elements.csv", index=False)
    logger.info(f"Saved {len(df_lnd):,} landuse elements to {lnd_dir / 'raw_landuse_elements.csv'}")

    df_poi = pd.DataFrame(poi_records)
    df_poi.to_csv(poi_dir / "raw_poi_elements.csv", index=False)
    logger.info(f"Saved {len(df_poi):,} POI activity elements to {poi_dir / 'raw_poi_elements.csv'}")

    # Save manifest
    manifest_data = {
        "dataset_name": "OpenStreetMap Pune Activity, Industrial, and Construction Dataset",
        "provider": "OpenStreetMap Foundation (Overpass API)",
        "retrieval_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "counts": {
            "industrial_elements": len(df_ind),
            "construction_elements": len(df_con),
            "landuse_elements": len(df_lnd),
            "poi_activity_elements": len(df_poi)
        },
        "stations": [s["location_id"] for s in STATIONS]
    }
    with open(meta_dir / "activity_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    logger.info("Recorded activity metadata manifest.")


if __name__ == "__main__":
    main()
