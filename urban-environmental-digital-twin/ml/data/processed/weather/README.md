# Processed Pune Hourly Weather Dataset

## Overview
This directory contains the cleaned, standardized, and normalized historical hourly weather dataset for Pune, prepared for downstream machine learning and digital twin simulation.

- **Source:** Open-Meteo Historical Weather API (ECMWF ERA5 / ERA5-Land Reanalysis)
- **Data Classification:** `REANALYSIS`
- **Rows:** 98,112 (14,016 hourly records across 7 spatial Pune locations)
- **Temporal Span:** 2025-02-18 00:00:00 UTC to 2026-09-24 23:00:00 UTC
- **Temporal Resolution:** Exactly 1 Hour

## Transformations Applied (from `ml/data/raw/weather/openmeteo/`)
1. **Timestamp Normalization:**
   - Retained ISO-8601 UTC timestamp (`datetime_utc`).
   - Derived Indian Standard Time (`datetime_local_ist` = UTC + 05:30) for local diurnal analysis.
2. **Standardized Column Naming:**
   - Standardized scientific variable names with explicit units (e.g. `temp_c`, `humidity_pct`, `wind_speed_ms`, `wind_dir_deg`, `precip_mm`, `pressure_hpa`, `solar_rad_wm2`, `pbl_height_m`).
3. **Data Provenance Preservation:**
   - Retained explicit `data_type = REANALYSIS` column in every row.
4. **Quality Verification:**
   - Confirmed 0 null values and 0 duplicate timestamps.
