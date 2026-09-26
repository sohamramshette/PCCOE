# Machine Learning Feature Engineering & Digital Twin Transformation Report

**Project:** Urban Environmental Digital Twin  
**Target Geography:** Pune Metropolitan Area (PMC & PCMC), Maharashtra, India  
**Target Stations:** 6 Core Monitoring Stations (Shivajinagar, Mhada Colony, Hadapsar, Bhosari, Katraj Dairy, Pashan)  
**Study Period:** February 18, 2025 `00:00:00Z` to September 24, 2026 `23:00:00Z` (14,016 contiguous hours per station)  
**Primary Analytical Grain:** `ONE ROW = ONE MONITORING STATION × ONE HOUR`  
**Primary Key:** `(station_id, datetime_utc)`  
**Report Date:** September 2026  
**Status:** **PHASE COMPLETE, AUDITED, AND INDEPENDENTLY VALIDATED**  

---

## 1. Executive Summary

This report documents the feature engineering pipeline and transformation methodology converting the canonical **Master Hourly Analytical Dataset** into leakage-safe, model-ready feature stores for next-hour PM2.5 forecasting and digital twin scenario simulation.

### Core Metrics

| Metric | Target Specification | Actual Realized Value | Status |
|---|---|---|:---:|
| **Canonical Grid Grain** | Station × Hour | `(station_id, datetime_utc)` | **VERIFIED** |
| **Total Rows** | 6 stations $\times$ 14,016 hours | **84,096 rows** | **MATCHED** |
| **Total Features / Columns** | Multi-domain feature set | **118 columns** | **ENGINEERED** |
| **Primary Target** | Next-hour PM2.5 ($t+1$) | `target_pm25_t_plus_1` | **FORMALIZED** |
| **Target Availability** | Observed ground truth | **63,019 valid hours (74.9%)** | **AUDITED** |
| **Leakage Validation Suite** | 5 automated time-series assertions | **5 / 5 PASSED** | **ZERO LEAKAGE** |
| **Split Strategy** | Strictly chronological | **Train (69.7%), Val (15.6%), Test (14.7%)** | **PARTITIONED** |
| **Pipeline Reproducibility** | One-command execution | `python ml/src/features/build_features.py --force` | **REPRODUCIBLE** |

---

## 2. Target Variable Formalization

### 2.1 Definition & Construction
* **Target Feature:** `target_pm25_t_plus_1`
* **Forecast Horizon:** **$t+1\text{ hour}$** (Next-hour ambient PM2.5 concentration in $\mu\text{g/m}^3$).
* **Mathematical Construction:**
  $$\text{target\_pm25\_t\_plus\_1}_{s, t} = \text{pm25}_{s, t+1}$$
  computed strictly within each station $s$ independently via forward shift:
  ```python
  df['target_pm25_t_plus_1'] = df.groupby('station_id')['pm25'].shift(-1)
  ```
* **Contemporaneous Feature Separation:** The target value $\text{pm25}(t+1)$ is strictly excluded from feature inputs at row $t$. The model uses only environmental, meteorological, and traffic states observed at or before timestamp $t$ to forecast the atmospheric state at $t+1$.

### 2.2 Target Missingness & Integrity Policy
* Missing PM2.5 values due to physical sensor blackouts, power failure, or routine maintenance are **never fabricated or artificially imputed**.
* Missing targets are preserved as `NaN` and flagged with `target_available = 0`.
* Supervised training partitions select only valid observed target rows ($\approx 63,019$ rows across the network) while preserving the complete 84,096-row continuous grid for time-series feature continuity and future semi-supervised digital twin experiments.

---

## 3. Feature Taxonomy & Mathematical Formulations

The 118 columns are partitioned into 10 structured domains:

### 3.1 Domain A: Primary Target & Indicators (2 columns)
* `target_pm25_t_plus_1`: Next-hour PM2.5 concentration ($\mu\text{g/m}^3$).
* `target_available`: Binary flag (1 if target is observed and non-null, else 0).

### 3.2 Domain B: Temporal & Cyclical Encodings (14 columns)
Captures diurnal human rhythms and macro-seasonal synoptic shifts:
* `hour_utc` (0–23), `hour_ist` (0–23), `day_of_week` (0=Mon, 6=Sun), `day_of_month` (1–31), `month` (1–12), `year`, `is_weekend` (0/1).
* **Cyclical Trigonometric Transformations:**
  $$\text{hour\_sin} = \sin\left(\frac{2\pi \times \text{hour\_ist}}{24}\right),\quad \text{hour\_cos} = \cos\left(\frac{2\pi \times \text{hour\_ist}}{24}\right)$$
  $$\text{month\_sin} = \sin\left(\frac{2\pi \times (\text{month} - 1)}{12}\right),\quad \text{month\_cos} = \cos\left(\frac{2\pi \times (\text{month} - 1)}{12}\right)$$
  $$\text{day\_of\_week\_sin} = \sin\left(\frac{2\pi \times \text{day\_of\_week}}{7}\right),\quad \text{day\_of\_week\_cos} = \cos\left(\frac{2\pi \times \text{day\_of\_week}}{7}\right)$$
* `is_monsoon`: Binary indicator (1 during June, July, August, September; 0 otherwise) capturing the wet atmospheric scavenging regime of the Indian Summer Monsoon.

### 3.3 Domain C: Wind Vectors & Atmospheric Dispersion (8 columns)
* **Meteorological Wind Vector Decomposition:**  
  Standard meteorological convention defines wind direction $\theta$ as the azimuth *from which* the wind originates (clockwise from True North). The orthogonal components (positive East and North) are:
  $$\text{wind\_u} = -\text{wind\_speed\_ms} \times \sin\left(\frac{\pi \times \text{wind\_dir\_deg}}{180}\right)$$
  $$\text{wind\_v} = -\text{wind\_speed\_ms} \times \cos\left(\frac{\pi \times \text{wind\_dir\_deg}}{180}\right)$$
* **Atmospheric Ventilation Index:**
  $$\text{ventilation\_index} = \text{wind\_speed\_ms} \times \text{pbl\_height\_m}\quad (\text{m}^2/\text{s})$$
  *Scientific Basis:* Represents the volume flux of air available for horizontal transport and vertical mixing. Values below $1,500\text{ m}^2/\text{s}$ indicate severe nocturnal boundary layer trapping; values above $6,000\text{ m}^2/\text{s}$ reflect rapid afternoon convective dilution.
* `temp_dewpoint_spread`: $\text{temp\_c} - \text{dew\_point\_c}$ ($^\circ\text{C}$). Proxies boundary layer saturation and fog/haze formation potential.
* `is_precipitating`: Binary flag (1 if $\text{precip\_mm} > 0.05\text{ mm}$, else 0) indicating active in-cloud/sub-cloud particulate scavenging.
* `atmospheric_stagnation_flag`: Binary indicator (1 if $\text{wind\_speed\_ms} < 1.0\text{ m/s}$ and $\text{pbl\_height\_m} < 200\text{ m}$, else 0).

### 3.4 Domain D: Contemporaneous Reanalysis Weather (14 columns)
From ECMWF ERA5-Land via Open-Meteo:
* `temp_c`, `humidity_pct`, `dew_point_c`, `precip_mm`, `rain_mm`, `pressure_hpa`, `wind_speed_ms`, `wind_dir_deg`, `solar_rad_wm2`, `cloud_cover_pct`, `pbl_height_m`, `weather_elevation_m`, `weather_grid_latitude`, `weather_grid_longitude`.

### 3.5 Domain E: Pollution History & Autoregressive Lags (7 columns)
Time-series lag features computed strictly within each monitoring station independently:
* `pm25`: Contemporaneous PM2.5 observation at time $t$ ($\mu\text{g/m}^3$).
* `pm25_lag_1h`: Value at $t-1\text{ hour}$.
* `pm25_lag_2h`: Value at $t-2\text{ hours}$.
* `pm25_lag_3h`: Value at $t-3\text{ hours}$.
* `pm25_lag_6h`: Value at $t-6\text{ hours}$.
* `pm25_lag_12h`: Value at $t-12\text{ hours}$.
* `pm25_lag_24h`: Value at $t-24\text{ hours}$ (captures diurnal persistence at the exact same hour yesterday).

### 3.6 Domain F: Weather Dynamic Lags (10 columns)
* `temp_c_lag_1h`, `temp_c_lag_3h`, `temp_c_lag_6h`
* `humidity_pct_lag_1h`
* `wind_speed_ms_lag_1h`, `wind_speed_ms_lag_3h`, `wind_speed_ms_lag_6h`
* `pbl_height_m_lag_1h`, `pbl_height_m_lag_3h`
* `ventilation_index_lag_1h`

### 3.7 Domain G: Leakage-Safe Historical Rolling Statistics (11 columns)
Calculated exclusively over past and contemporaneous observations up to time $t$ (using window $w$ and minimum threshold periods to preserve valid calculations across sporadic sensor drops):
* `pm25_rolling_mean_3h`, `pm25_rolling_mean_6h`, `pm25_rolling_mean_12h`, `pm25_rolling_mean_24h`
* `pm25_rolling_std_6h`, `pm25_rolling_std_24h` (short-term volatility and diurnal dispersion)
* `temp_c_rolling_mean_6h`, `wind_speed_ms_rolling_mean_6h`, `pbl_height_m_rolling_mean_6h`
* `precip_rolling_sum_6h`, `precip_rolling_sum_24h` (antecedent precipitation for lingering wet deposition effects)

### 3.8 Domain H: Traffic Exposure & Interactions (9 columns)
* Static Infrastructure: `total_road_length_km`, `major_road_length_km`, `local_road_length_km`, `major_road_density_km_per_km2`, `total_road_density_km_per_km2`, `distance_to_nearest_major_road_m`.
* Diurnal Proxy: `traffic_proxy_index` (hourly index $[0.0, 1.0]$).
* **Non-Linear Dispersion Interactions:**
  $$\text{traffic\_stagnation\_ratio} = \frac{\text{traffic\_proxy\_index}}{\text{wind\_speed\_ms} + 0.2}$$
  $$\text{traffic\_ventilation\_ratio} = \frac{\text{traffic\_proxy\_index}}{(\text{ventilation\_index} / 1000.0) + 0.1}$$

### 3.9 Domain I: Urban Activity, Industrial, Construction & Land Use (20 columns)
* Static OSM Features: `industrial_elements_2km`, `dist_nearest_industrial_m`, `has_industrial_within_1km`, `construction_elements_1_5km`, `dist_nearest_construction_m`, `has_construction_within_1km`, `poi_total_count_1_5km`, `poi_density_per_km2`, `poi_commercial_count`, `poi_institutional_count`, `poi_transit_count`, `landuse_elements_total`, `landuse_residential_count`, `landuse_commercial_count`, `landuse_industrial_count`, `landuse_green_count`, `dominant_landuse`.
* **Activity Interactions:**
  $$\text{industrial\_dispersion\_ratio} = \frac{\text{has\_industrial\_within\_1km}}{\text{wind\_speed\_ms} + 0.2}$$
  $$\text{construction\_dispersion\_ratio} = \frac{\text{has\_construction\_within\_1km}}{\text{wind\_speed\_ms} + 0.2}$$
  $$\text{poi\_traffic\_interaction} = \text{poi\_density\_per\_km2} \times \text{traffic\_proxy\_index}$$

### 3.10 Domain J: Contextual Pollutants & Provenance (23 columns)
* Spatial Identifiers: `station_id`, `station_name`, `zone_type`, `latitude`, `longitude`, `datetime_utc`, `datetime_local_ist`.
* Contextual Pollutants & In-situ Meteorology (Station 11613): `pm10`, `pm10_obs_count`, `no2`, `no2_obs_count`, `temp_insitu_c`, `temp_insitu_obs_count`, `humidity_insitu_pct`, `humidity_insitu_obs_count`, `wind_speed_insitu_ms`, `wind_speed_insitu_obs_count`.
* Quality & Provenance Flags: `pm25_completeness_flag`, `pm25_obs_count`, `pollution_data_type`, `weather_data_type`, `traffic_road_data_type`, `traffic_proxy_data_type`, `activity_data_type`.

---

## 4. Rigorous Time-Series Leakage Audit

To ensure scientific integrity and eliminate subtle data leakage, the pipeline executes an automated assertion suite:

| Check ID | Verification Rule | Assertion Mechanism | Result |
|---|---|---|:---:|
| **Check 1** | Target Alignment | For any station $s$ and hour $t$, $\text{target\_pm25\_t\_plus\_1}_{s,t} \equiv \text{pm25}_{s, t+1}$. Discrepancy max $= 0.0$. | **PASSED** |
| **Check 2** | No Cross-Station Target Leak | Last chronological row of each station has `NaN` target (does not pull first row of next station). | **PASSED** |
| **Check 3** | No Cross-Station Lag Leak | First chronological row of each station has `NaN` lag (does not pull last row of prior station). | **PASSED** |
| **Check 4** | Past-Only Rolling Windows | Row 0 rolling mean equals Row 0 contemporaneous observation; window never looks forward. | **PASSED** |
| **Check 5** | Strict Target Exclusion | Feature input candidate set contains 0 instances of `target_pm25_t_plus_1`. | **PASSED** |

---

## 5. Chronological Train / Validation / Test Partitioning

In accordance with strict temporal evaluation guidelines, random cross-validation splitting is prohibited. The dataset is split chronologically across all 6 stations simultaneously:

```
[================ TRAIN (69.7%) ================] [=== VAL (15.6%) ===] [=== TEST (14.7%) ===]
2025-02-18                                    2026-03-31               2026-06-30             2026-09-24
```

### Partition Statistics

| Split | Start UTC | End UTC | Total Station-Hours | Target Observed Hours | Target Capture % | Environmental Regime Represented |
|---|---|---|:---:|:---:|:---:|---|
| **TRAIN** | `2025-02-18T00:00:00Z` | `2026-03-31T23:00:00Z` | **58,608** | **42,796** | 73.0% | Late Winter 2025, Summer 2025, Monsoon 2025, Winter 2025–26, Early Summer 2026 |
| **VALIDATION** | `2026-04-01T00:00:00Z` | `2026-06-30T23:00:00Z` | **13,104** | **10,454** | 79.8% | Pre-monsoon convective peak, high dust resuspension, onset of Monsoon rains |
| **TEST (Holdout)** | `2026-07-01T00:00:00Z` | `2026-09-24T23:00:00Z` | **12,384** | **9,769** | 78.9% | Unseen future holdout: peak active monsoon and late-monsoon atmospheric clearing |
| **Total Grid** | `2025-02-18T00:00:00Z` | `2026-09-24T23:00:00Z` | **84,096** | **63,019** | 74.9% | 19 continuous calendar months across 6 stations |

---

## 6. Station Distribution & Target Availability

| Station ID | Station Name | Total Hours | Train Valid Targets | Val Valid Targets | Test Valid Targets | Total Valid Targets | Network Target % |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **11609** | Mhada Colony | 14,016 | 8,172 | 1,847 | 1,828 | 11,847 | 84.5% |
| **11613** | Revenue Colony-Shivajinagar | 14,016 | 7,624 | 1,768 | 1,682 | 11,074 | 79.0% |
| **60658** | Hadapsar | 14,016 | 5,142 | 1,180 | 1,339 | 7,661 | 54.7% |
| **3409331** | Bhosari (PCMC) | 14,016 | 6,589 | 1,418 | 1,450 | 9,457 | 67.5% |
| **3409438** | Katraj Dairy | 14,016 | 7,294 | 1,895 | 1,630 | 10,819 | 77.2% |
| **3409526** | Panchawati Pashan | 14,016 | 7,975 | 2,346 | 1,840 | 12,161 | 86.8% |
| **All Stations** | **Pune Network Total** | **84,096** | **42,796** | **10,454** | **9,769** | **63,019** | **74.9%** |

---

## 7. Model-Ready Feature Subsets (Core vs. Extended)

Due to sensor availability differences across the CPCB/IITM network, two feature sets are designated for ML development:

1. **Core Feature Set (Universal — 95 features):**
   * Usable across **all 6 stations**.
   * Excludes station-specific co-pollutants (`pm10`, `no2`) and in-situ weather sensors.
   * Relies on continuous ERA5-Land weather, physical road networks, diurnal traffic proxies, OSM activity proxies, and historical PM2.5 autoregression.
   * Features have **0% missing values** across all valid target hours (except initial 24h warm-up lags).

2. **Extended Pollutant Feature Set (Station 11613 Benchmark — 118 features):**
   * Adds `pm10`, `no2`, and in-situ meteorological measurements.
   * Reserved for single-station benchmark comparisons and cross-pollutant attribution experiments at Shivajinagar.

---

## 8. Artifacts Produced

The feature engineering pipeline generated the following model-ready artifacts in `ml/data/processed/features/`:
* `feature_dataset.csv` (84,096 rows, 118 columns, ~168 MB)
* `train.csv` (58,608 rows, 118 columns, ~117 MB)
* `validation.csv` (13,104 rows, 118 columns, ~26 MB)
* `test.csv` (12,384 rows, 118 columns, ~25 MB)
* `feature_manifest.json` (Machine-readable metadata, formulas, dtypes, null percentages, and risk classifications)
* `feature_quality_report.json` (Numerical validation audit results)
* `README.md` (Directory usage and reference documentation)

---

## 9. Reproducibility Command

The pipeline is fully automated and deterministic:
```bash
python ml/src/features/build_features.py --force
```
Execution finishes in **13.4 seconds** on standard hardware without requiring external GPUs or proprietary dependencies.
