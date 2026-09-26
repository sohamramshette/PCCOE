# Master Analytical Dataset Integration & Quality Report

**Project:** Urban Environmental Digital Twin  
**Target Geography:** Pune Metropolitan Area (PMC & PCMC), Maharashtra, India  
**Target Period:** February 18, 2025 `00:00:00Z` to September 24, 2026 `23:00:00Z` (14,016 contiguous hours)  
**Primary Key:** `(station_id, datetime_utc)`  
**Report Date:** September 2026  
**Status:** **AUDITED, VALIDATED & APPROVED**  

---

## 1. Executive Summary

This report provides the formal quality audit and integration verification for the **Master Hourly Analytical Dataset** (`master_hourly_dataset.csv`). The dataset establishes the foundational cross-domain feature store for the Urban Environmental Digital Twin by fusing:
1. **Observed Pollution:** Ground-truth continuous CAAQMS observations from OpenAQ (419,781 raw 15-minute measurements resampled to hourly).
2. **Reanalysis Weather:** 14,016 contiguous hours of ECMWF ERA5-Land atmospheric model data from Open-Meteo across 6 station coordinates.
3. **Traffic Exposure:** High-resolution OpenStreetMap vector road network topology and calibrated diurnal hourly traffic intensity curves.
4. **Urban Activity & Built Environment:** OpenStreetMap industrial facility footprints, active civil construction sites, land-use zoning classes, and POI spatial densities.

### High-Level Integration Metrics

| Metric | Target / Specification | Actual Audited Value | Status |
|---|---|---|:---:|
| **Master Analytical Grain** | `ONE ROW = 1 STATION × 1 HOUR` | `(station_id, datetime_utc)` | **PASSED** |
| **Total Master Rows** | $6\text{ stations} \times 14,016\text{ hours}$ | **84,096** | **PASSED** |
| **Total Features / Columns** | Multi-domain feature set | **70 columns** | **PASSED** |
| **Primary Key Uniqueness** | 0 duplicate `(station_id, datetime_utc)` keys | **0 duplicates (100% unique)** | **PASSED** |
| **Station Count** | 6 Core Pune Monitoring Stations | **6 stations** | **PASSED** |
| **Time Period** | Feb 18, 2025 to Sep 24, 2026 | **14,016 contiguous hours per station** | **PASSED** |
| **Weather Null Count** | 0 missing values | **0 nulls (100% complete across 84,096 rows)** | **PASSED** |
| **Traffic Features Null Count** | 0 missing values | **0 nulls (100% complete across 84,096 rows)** | **PASSED** |
| **Activity Features Null Count** | 0 missing values | **0 nulls (100% complete across 84,096 rows)** | **PASSED** |
| **Observed PM2.5 Coverage** | Regulatory capture | **63,019 valid hours (74.9% across network)** | **AUDITED** |

---

## 2. Upstream Dataset Inputs & Processing Results

| Domain | Raw Source File | Raw Rows | Processed Artifact | Processed Rows | Integration Method |
|---|---|---:|---|---:|---|
| **Pollution** | `ml/data/raw/pollution/openaq/measurements/raw_measurements.csv` | 419,781 | `ml/data/processed/pollution/openaq_hourly_processed.csv` | 63,068 | Resampled from 15-minute to hourly means; joined left on `(station_id, datetime_utc)` |
| **Weather** | `ml/data/raw/weather/openmeteo/raw_weather_hourly.csv` | 98,112 | `ml/data/processed/weather/weather_hourly_processed.csv` | 98,112 | Filtered to 6 core stations (84,096 rows); forms master base grid on `(station_id, datetime_utc)` |
| **Traffic Road** | `ml/data/raw/traffic/osm/raw_osm_ways.csv` | 4,332 | `ml/data/processed/traffic/station_road_features.csv` | 6 | Joined on `station_id` (1-to-many broadcast across 14,016 hours) |
| **Traffic Proxy** | `ml/data/raw/traffic/proxy/pune_diurnal_traffic_profile.csv` | 24 | `ml/data/processed/traffic/traffic_hourly_proxy.csv` | 24 | Joined on `(hour_ist, is_weekend)` |
| **Activity** | `ml/data/raw/activity/` (industrial, construction, landuse, POI) | 896 | `ml/data/processed/activity/station_activity_features.csv` | 6 | Joined on `station_id` (1-to-many broadcast across 14,016 hours) |
| **Master Dataset**| — | — | `ml/data/processed/integration/master_hourly_dataset.csv` | **84,096** | Full outer cross-product of canonical station-hours |

---

## 3. Station-by-Station Target Variable (PM2.5) Audit

The ground-truth PM2.5 target variable was aggregated from 15-minute raw sensor observations into hourly arithmetic means. Each station-hour is classified into one of four regulatory completeness tiers:
* `COMPLETE`: $\ge 3$ valid 15-minute observations ($\ge 75\%$ capture rate).
* `PARTIAL`: Exactly 2 valid 15-minute observations ($50\%$ capture rate).
* `INSUFFICIENT`: Exactly 1 valid 15-minute observation ($25\%$ capture rate).
* `MISSING`: 0 observations (sensor offline, transmission blackout, or scheduled maintenance).

### Station PM2.5 Statistics Table

| Station ID | Station Name | Total Hours | Valid PM2.5 Hours | Valid % | COMPLETE ($\ge 3$) | PARTIAL (2) | INSUFFICIENT (1) | MISSING (0) | Mean ($\mu\text{g/m}^3$) | Median ($\mu\text{g/m}^3$) | Min | Max |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **11609** | Mhada Colony | 14,016 | 11,847 | 84.5% | 11,317 | 271 | 259 | 2,169 | 43.37 | 29.37 | 0.0 | 682.17 |
| **11613** | Revenue Colony-Shivajinagar | 14,016 | 11,074 | 79.0% | 10,258 | 539 | 277 | 2,942 | 57.92 | 36.26 | 0.0 | 718.54 |
| **60658** | Hadapsar | 14,016 | 7,661 | 54.7% | 7,256 | 210 | 195 | 6,355 | 55.71 | 37.92 | 0.0 | 689.69 |
| **3409331** | Bhosari (PCMC) | 14,016 | 9,457 | 67.5% | 8,960 | 228 | 269 | 4,559 | 26.16 | 19.60 | 0.0 | 877.65 |
| **3409438** | Katraj Dairy | 14,016 | 10,819 | 77.2% | 9,481 | 578 | 760 | 3,197 | 26.26 | 20.18 | 0.0 | 526.04 |
| **3409526** | Panchawati Pashan | 14,016 | 12,161 | 86.8% | 11,636 | 285 | 240 | 1,855 | 30.04 | 22.57 | 0.0 | 267.92 |
| **Total / Network** | **All 6 Stations** | **84,096** | **63,019** | **74.9%** | **58,908** | **2,111** | **2,000** | **21,077** | **40.66** | **27.67** | **0.0** | **877.65** |

### Environmental Observations
1. **Shivajinagar (11613):** Highest long-term mean concentration ($57.92\ \mu\text{g/m}^3$), reflecting dense commercial activity, traffic congestion, and metro construction.
2. **Hadapsar (60658):** High median concentration ($37.92\ \mu\text{g/m}^3$), but suffered the longest cumulative telemetry hiatus (6,355 missing hours).
3. **Pashan (3409526):** Highest data capture (86.8%, 12,161 valid hours) and cleanest baseline profile ($30.04\ \mu\text{g/m}^3$ mean), confirming its role as the green foothill background station.
4. **Bhosari (3409331):** Exhibits episodic peak industrial spikes reaching $877.65\ \mu\text{g/m}^3$ during nocturnal ground-level temperature inversions.

---

## 4. Multi-Pollutant & In-Situ Meteorology Audit (Station 11613)

Station 11613 (Shivajinagar, central CAAQMS operated by IITM SAFAR) provides multi-pollutant co-variates and in-situ meteorological measurements:
* **PM10:** 10,993 valid hours (Mean: $109.11\ \mu\text{g/m}^3$, Max: $795.54\ \mu\text{g/m}^3$).
* **NO2:** 11,094 valid hours (Mean: $36.03\text{ ppb}$, Max: $266.37\text{ ppb}$).
* **In-situ Temperature (`temp_insitu_c`):** 10,080 valid hours (Mean: $27.02^\circ\text{C}$). Note: 68 readings in raw data had unphysical negative anomalies (e.g. $-12^\circ\text{C}$); users should utilize the verified reanalysis `temp_c` column for modeling.
* **In-situ Relative Humidity (`humidity_insitu_pct`):** 10,155 valid hours (Mean: $54.3\%$).
* **In-situ Wind Speed (`wind_speed_insitu_ms`):** 10,153 valid hours (Mean: $1.15\text{ m/s}$).

For stations without co-pollutant sensors (11609, 60658, 3409331, 3409438, 3409526), these columns are appropriately populated with `NaN`, and observation count columns are set to `0`.

---

## 5. Domain Alignment & Join Verification

### 5.1 Weather Alignment
* **Join Key:** `(station_id, datetime_utc)`
* **Grid Cell Assignment:** Each OpenAQ station coordinates were matched to the nearest ECMWF ERA5-Land 0.1° grid centroid. Grid coordinates are recorded in `weather_grid_latitude` and `weather_grid_longitude`.
* **Completeness:** **100% matched (0 nulls across 84,096 rows)**.
* **Physical Sanity:**
  * Temperature: $[10.3^\circ\text{C}, 41.8^\circ\text{C}]$
  * Relative Humidity: $[8\%, 100\%]$
  * Atmospheric Pressure: $[922.4\text{ hPa}, 965.8\text{ hPa}]$ (matches Pune's 560m–670m elevation)
  * Planetary Boundary Layer Height: $[10.0\text{ m}, 3,842.0\text{ m}]$ (captures nocturnal compaction vs afternoon convective mixing).

### 5.2 Traffic Alignment
* **Static Road Network:** Joined by `station_id`. Broadcasts total road length, major road density, and distance to nearest arterial highway to all 14,016 hours of each station. (100% matched, 0 nulls).
* **Diurnal Traffic Proxy:** Joined by `(hour_ist, is_weekend)`. Modulates the hourly traffic intensity coefficient `traffic_proxy_index` according to empirical Pune CMP diurnal curves (peak index 1.00 at 09:00 IST weekdays; peak 0.96 at 19:00 IST weekends). (100% matched, 0 nulls).

### 5.3 Activity & Land-Use Alignment
* **Join Key:** `station_id`
* **Features:** Industrial facility counts within 2km, distance to nearest industrial works, construction counts within 1.5km, distance to nearest construction site, POI density per km², and dominant land-use category.
* **Completeness:** **100% matched (0 nulls across 84,096 rows)**.

---

## 6. Data Leakage & Machine Learning Integrity Audit

In accordance with strict digital twin engineering standards:
1. **Zero Future Target Leakage:** The master dataset does not contain forward-looking rolling averages, future lag features ($y_{t+1}$), or target encodings.
2. **Zero Imputation of Missing Target Values:** Missing observed pollution hours are preserved as `NaN` with explicit `pm25_completeness_flag = 'MISSING'`. Downstream ML pipelines can train exclusively on valid observed rows (`pm25.notnull()`) or evaluate semi-supervised methods without bias.
3. **Temporal Ordering:** Timestamps are chronologically ordered per station (`datetime_utc`), enabling standard time-series split (e.g. Train on Feb 2025 – May 2026, Validate on Jun 2026 – Sep 2026).
4. **Classification Separation:** 5 explicit provenance columns (`pollution_data_type`, `weather_data_type`, `traffic_road_data_type`, `traffic_proxy_data_type`, `activity_data_type`) prevent accidental misinterpretation of proxy features as physical observations.

---

## 7. Known Limitations

1. **Station Outages:** Approximately 25.1% of total potential station-hours across the 19-month window experienced sensor downtime, power outages, or data transmission blackouts from upstream CAAQMS servers.
2. **Spatial Invariance of Road/Activity Features:** OpenStreetMap infrastructure metrics reflect the contemporary 2025–2026 urban configuration and are held static across time.
3. **Diurnal Proxy Nature:** `traffic_proxy_index` reflects typical empirical diurnal traffic congestion profiles rather than real-time vehicle counts from loop detectors or automated cameras.
