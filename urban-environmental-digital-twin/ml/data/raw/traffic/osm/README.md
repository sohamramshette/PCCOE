# OpenStreetMap Pune Road Network Dataset (Raw)

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
