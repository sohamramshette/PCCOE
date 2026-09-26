# OpenAQ Raw Air Quality Data (Pune, Maharashtra, India)

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
