# Processed Pune Traffic & Road Network Dataset

## Overview
This directory contains the derived spatial road network features and hourly traffic proxy profiles for the 6 core air quality monitoring stations in Pune.

## Files
1. `station_road_features.csv`:
   - **Classification:** `STATIC_ROAD_NETWORK`
   - **Rows:** 6 stations
   - **Features:** `total_road_length_km`, `major_road_length_km`, `local_road_length_km`, `major_road_density_km_per_km2`, `total_road_density_km_per_km2`, `distance_to_nearest_major_road_m`, `nearest_major_road_name`.
   - **Join Key:** `location_id`.
2. `traffic_hourly_proxy.csv`:
   - **Classification:** `TRAFFIC_PROXY`
   - **Rows:** 24 hours
   - **Features:** `hour_of_day`, `weekday_traffic_index`, `weekend_traffic_index`.
   - **Join Key:** `hour_of_day` + weekday/weekend boolean.

## Note on Scientific Provenance
These datasets represent static road network topology from OpenStreetMap and empirical diurnal proxy curves from published Pune transport studies. They are NOT observed vehicle counts.
