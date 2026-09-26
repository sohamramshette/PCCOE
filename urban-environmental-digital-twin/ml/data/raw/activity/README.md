# Pune Urban Activity, Industrial, and Construction Datasets (Raw)

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
