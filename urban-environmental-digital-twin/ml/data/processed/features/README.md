# Model-Ready Feature Store (`ml/data/processed/features/`)

## 1. Overview
This directory contains the machine-learning-ready feature datasets engineered from the canonical Master Hourly Analytical Dataset.

* **Primary Artifact:** `feature_dataset.csv`
* **Train Split:** `train.csv` (Feb 18, 2025 to Mar 31, 2026 — 58,608 rows, 69.7%)
* **Validation Split:** `validation.csv` (Apr 01, 2026 to Jun 30, 2026 — 13,104 rows, 15.6%)
* **Test Split:** `test.csv` (Jul 01, 2026 to Sep 24, 2026 — 12,384 rows, 14.7%)
* **Analytical Grain:** `ONE ROW = ONE MONITORING STATION × ONE HOUR`
* **Primary Key:** `(station_id, datetime_utc)`
* **Total Rows:** 84,096
* **Total Columns:** 118

---

## 2. Target Variable
* **Target Feature:** `target_pm25_t_plus_1`
* **Definition:** Ambient PM2.5 concentration at timestamp t+1 hour shifted station-wise.
* **Leakage Guarantee:** Contemporaneous observations at time t predict time t+1. No values from t+1 or beyond exist in any input feature column.
* **Observed Availability:** 63,019 valid observed target hours (74.9% network coverage). Missing target hours reflect physical sensor downtime and remain un-imputed.

---

## 3. Feature Taxonomy & Engineering
* **Temporal:** Cyclical `hour_sin/cos`, `month_sin/cos`, `day_of_week_sin/cos`, and `is_monsoon` indicator.
* **Atmospheric Dispersion:** Meteorological wind vector decomposition (`wind_u`, `wind_v`), atmospheric ventilation coefficient (`ventilation_index = wind_speed_ms * pbl_height_m`), temperature-dewpoint spread, and stagnation flag.
* **Pollution History:** Station-specific autoregressive lags (`pm25_lag_1h` to `24h`) and historical rolling averages/volatility (`pm25_rolling_mean_3h` to `24h`, `pm25_rolling_std_6h/24h`).
* **Traffic & Activity Interactions:** Non-linear dispersion interactions (`traffic_stagnation_ratio`, `traffic_ventilation_ratio`, `industrial_dispersion_ratio`, `poi_traffic_interaction`).

---

## 4. Leakage Validation
All 5 automated leakage tests passed:
1. Target alignment verified against shifted ground-truth.
2. Cross-station target contamination: 0.
3. Cross-station lag contamination: 0.
4. Forward-looking rolling window contamination: 0.
5. Target exclusion from feature inputs: 100%.

---

## 5. Pipeline Reproduction
```bash
python ml/src/features/build_features.py --force
```
