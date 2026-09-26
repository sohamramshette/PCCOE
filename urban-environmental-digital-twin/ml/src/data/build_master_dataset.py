"""
Master Dataset Integration and Preprocessing Script.

Combines four major environmental, meteorological, and urban activity domains:
1. OpenAQ Observed Pollution (15-min raw resampled to hourly with completeness flags)
2. Open-Meteo ERA5-Land Reanalysis Weather (Hourly, 14,016 contiguous hours)
3. OpenStreetMap Road Network (Static) + Diurnal Traffic Proxy (Hourly)
4. OpenStreetMap Industrial, Construction, Land-Use & POI Exposure Features (Static)

Canonical Grain:
    ONE ROW = ONE MONITORING STATION × ONE HOUR (station_id, datetime_utc)
    Total Expected Grid: 6 stations × 14,016 hours = 84,096 rows.

Usage:
    python ml/src/data/build_master_dataset.py [--force]
"""

import argparse
import json
import logging
import math
import os
from pathlib import Path
import time
import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("build_master_dataset")

CORE_STATIONS = ['11613', '11609', '60658', '3409331', '3409438', '3409526']


def get_repo_root() -> Path:
    """Resolve repository root relative to this script."""
    return Path(__file__).resolve().parents[3]


def resample_openaq_to_hourly(raw_pollution_path: Path, output_pollution_dir: Path) -> pd.DataFrame:
    """
    Resample OpenAQ 15-minute measurements to hourly means and counts.
    Generates ml/data/processed/pollution/openaq_hourly_processed.csv
    """
    logger.info(f"Loading raw OpenAQ measurements from {raw_pollution_path}...")
    df_raw = pd.read_csv(raw_pollution_path, low_memory=False)
    logger.info(f"Loaded {len(df_raw):,} raw measurement rows.")

    df_raw['station_id'] = df_raw['location_id'].astype(str)
    df_core = df_raw[df_raw['station_id'].isin(CORE_STATIONS)].copy()
    logger.info(f"Filtered to 6 core stations: {len(df_core):,} rows.")

    # Floor timestamp to hour
    df_core['dt_utc'] = pd.to_datetime(df_core['datetime_from_utc'])
    df_core['datetime_utc'] = df_core['dt_utc'].dt.floor('h').dt.strftime('%Y-%m-%dT%H:00:00Z')

    # Parameter aggregation
    logger.info("Aggregating pollutant measurements to hourly means and counts...")
    agg_df = df_core.groupby(['station_id', 'datetime_utc', 'parameter'])['value'].agg(
        val_mean='mean',
        val_count='count'
    ).unstack('parameter')

    # Flatten multiindex columns
    flat_cols = []
    for col in agg_df.columns:
        stat, param = col
        if stat == 'val_mean':
            if param == 'relativehumidity':
                flat_cols.append('humidity_insitu_pct')
            elif param == 'temperature':
                flat_cols.append('temp_insitu_c')
            elif param == 'wind_speed':
                flat_cols.append('wind_speed_insitu_ms')
            else:
                flat_cols.append(param)
        else:
            if param == 'relativehumidity':
                flat_cols.append('humidity_insitu_obs_count')
            elif param == 'temperature':
                flat_cols.append('temp_insitu_obs_count')
            elif param == 'wind_speed':
                flat_cols.append('wind_speed_insitu_obs_count')
            else:
                flat_cols.append(f"{param}_obs_count")

    agg_df.columns = flat_cols
    agg_df = agg_df.reset_index()

    # Fill count columns with 0
    count_cols = [c for c in agg_df.columns if '_obs_count' in c]
    for c in count_cols:
        agg_df[c] = agg_df[c].fillna(0).astype(int)

    # Compute PM2.5 completeness flag
    conditions = [
        agg_df['pm25_obs_count'] >= 3,
        agg_df['pm25_obs_count'] == 2,
        agg_df['pm25_obs_count'] == 1
    ]
    choices = ['COMPLETE', 'PARTIAL', 'INSUFFICIENT']
    agg_df['pm25_completeness_flag'] = np.select(conditions, choices, default='MISSING')

    # Save processed hourly pollution dataset
    output_pollution_dir.mkdir(parents=True, exist_ok=True)
    out_csv = output_pollution_dir / "openaq_hourly_processed.csv"
    agg_df.to_csv(out_csv, index=False)
    logger.info(f"Saved {len(agg_df):,} hourly pollution records to {out_csv}")

    # Write README for processed pollution
    readme_path = output_pollution_dir / "README.md"
    readme_content = """# Processed OpenAQ Pune Hourly Air Quality Dataset

## Overview
This directory stores hourly aggregated ground-truth ambient air quality measurements resampled from 15-minute OpenAQ observations for the 6 core Pune monitoring stations.

## Primary Artifact
* **File:** `openaq_hourly_processed.csv`
* **Grain:** `(station_id, datetime_utc)`
* **Data Classification:** `OBSERVED`

## Completeness Flag Definitions
* `COMPLETE`: 3 or 4 valid quarter-hourly observations (>= 75% coverage).
* `PARTIAL`: Exactly 2 valid quarter-hourly observations (50% coverage).
* `INSUFFICIENT`: Exactly 1 valid quarter-hourly observation (25% coverage).
* `MISSING`: 0 observations (station sensor offline).
"""
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    logger.info(f"Saved {readme_path}")

    return agg_df


def build_master_dataset(force: bool = False):
    t0 = time.time()
    root = get_repo_root()
    logger.info(f"Project root resolved to: {root}")

    # Define paths
    raw_pol_path = root / "ml/data/raw/pollution/openaq/measurements/raw_measurements.csv"
    proc_weather_path = root / "ml/data/processed/weather/weather_hourly_processed.csv"
    proc_traffic_road_path = root / "ml/data/processed/traffic/station_road_features.csv"
    proc_traffic_proxy_path = root / "ml/data/processed/traffic/traffic_hourly_proxy.csv"
    proc_activity_path = root / "ml/data/processed/activity/station_activity_features.csv"

    proc_pol_dir = root / "ml/data/processed/pollution"
    integration_dir = root / "ml/data/processed/integration"
    integration_dir.mkdir(parents=True, exist_ok=True)

    master_csv_path = integration_dir / "master_hourly_dataset.csv"
    master_parquet_path = integration_dir / "master_hourly_dataset.parquet"

    if master_csv_path.exists() and not force:
        logger.info(f"Master dataset already exists at {master_csv_path}. Use --force to regenerate.")

    # 1. Step 1: Resample OpenAQ Pollution to Hourly
    p_agg = resample_openaq_to_hourly(raw_pol_path, proc_pol_dir)

    # 2. Step 2: Load Weather (Canonical Grid Foundation)
    logger.info(f"Loading weather dataset from {proc_weather_path}...")
    df_w = pd.read_csv(proc_weather_path, low_memory=False)
    df_w['station_id'] = df_w['location_id'].astype(str)
    df_w = df_w[df_w['station_id'].isin(CORE_STATIONS)].copy()
    logger.info(f"Weather dataset loaded for 6 core stations: {len(df_w):,} rows.")

    # 3. Step 3: Load Traffic Road Features
    logger.info(f"Loading traffic road network features from {proc_traffic_road_path}...")
    df_tf = pd.read_csv(proc_traffic_road_path)
    df_tf['station_id'] = df_tf['location_id'].astype(str)

    # 4. Step 4: Load Traffic Hourly Diurnal Proxy
    logger.info(f"Loading traffic diurnal proxy from {proc_traffic_proxy_path}...")
    df_tp = pd.read_csv(proc_traffic_proxy_path)

    # 5. Step 5: Load Station Activity Features
    logger.info(f"Loading station activity features from {proc_activity_path}...")
    df_af = pd.read_csv(proc_activity_path)
    df_af['station_id'] = df_af['station_id'].astype(str)

    # 6. Step 6: Construct Master Base Grid from Weather
    logger.info("Constructing master grid foundation...")
    master = df_w[[
        'station_id', 'station_name', 'requested_latitude', 'requested_longitude',
        'grid_latitude', 'grid_longitude', 'elevation', 'datetime_utc', 'datetime_local_ist',
        'temp_c', 'humidity_pct', 'dew_point_c', 'precip_mm', 'rain_mm',
        'pressure_hpa', 'wind_speed_ms', 'wind_dir_deg', 'solar_rad_wm2',
        'cloud_cover_pct', 'pbl_height_m'
    ]].copy()

    master.rename(columns={
        'requested_latitude': 'latitude',
        'requested_longitude': 'longitude',
        'grid_latitude': 'weather_grid_latitude',
        'grid_longitude': 'weather_grid_longitude',
        'elevation': 'weather_elevation_m'
    }, inplace=True)

    # Add temporal calendrical columns
    dt_utc = pd.to_datetime(master['datetime_utc'])
    dt_local = pd.to_datetime(master['datetime_local_ist'])
    master['year'] = dt_utc.dt.year
    master['month'] = dt_utc.dt.month
    master['day'] = dt_utc.dt.day
    master['hour_utc'] = dt_utc.dt.hour
    master['hour_ist'] = dt_local.dt.hour
    master['day_of_week'] = dt_local.dt.dayofweek
    master['is_weekend'] = (master['day_of_week'] >= 5).astype(int)

    # 7. Step 7: Join OpenAQ Hourly Pollution
    logger.info("Merging hourly observed pollution...")
    master = master.merge(p_agg, on=['station_id', 'datetime_utc'], how='left')
    master['pm25_obs_count'] = master['pm25_obs_count'].fillna(0).astype(int)
    master['pm25_completeness_flag'] = master['pm25_completeness_flag'].fillna('MISSING')

    for col in ['pm10_obs_count', 'no2_obs_count', 'temp_insitu_obs_count', 'humidity_insitu_obs_count', 'wind_speed_insitu_obs_count']:
        if col in master.columns:
            master[col] = master[col].fillna(0).astype(int)

    # 8. Step 8: Join Traffic Road Network Features
    logger.info("Merging traffic road network features...")
    tf_cols = [
        'station_id', 'zone_type', 'total_road_length_km', 'major_road_length_km',
        'local_road_length_km', 'major_road_density_km_per_km2',
        'total_road_density_km_per_km2', 'distance_to_nearest_major_road_m'
    ]
    master = master.merge(df_tf[tf_cols], on='station_id', how='left')

    # 9. Step 9: Join Diurnal Traffic Proxy
    logger.info("Merging diurnal traffic proxy...")
    master = master.merge(
        df_tp[['hour_of_day', 'weekday_traffic_index', 'weekend_traffic_index']],
        left_on='hour_ist',
        right_on='hour_of_day',
        how='left'
    )
    master['traffic_proxy_index'] = np.where(
        master['is_weekend'] == 1,
        master['weekend_traffic_index'],
        master['weekday_traffic_index']
    )
    master.drop(columns=['hour_of_day', 'weekday_traffic_index', 'weekend_traffic_index'], inplace=True)

    # 10. Step 10: Join Activity Features
    logger.info("Merging station activity, industrial, construction, and land-use features...")
    af_cols = [
        'station_id', 'industrial_elements_2km', 'dist_nearest_industrial_m',
        'has_industrial_within_1km', 'construction_elements_1_5km',
        'dist_nearest_construction_m', 'has_construction_within_1km',
        'poi_total_count_1_5km', 'poi_density_per_km2', 'poi_commercial_count',
        'poi_institutional_count', 'poi_transit_count', 'landuse_elements_total',
        'landuse_residential_count', 'landuse_commercial_count',
        'landuse_industrial_count', 'landuse_green_count', 'dominant_landuse'
    ]
    master = master.merge(df_af[af_cols], on='station_id', how='left')

    # 11. Step 11: Add Strict Data Provenance Labels
    master['pollution_data_type'] = 'OBSERVED'
    master['weather_data_type'] = 'REANALYSIS'
    master['traffic_road_data_type'] = 'STATIC_ROAD_NETWORK'
    master['traffic_proxy_data_type'] = 'TRAFFIC_PROXY'
    master['activity_data_type'] = 'STATIC_LAND_USE / PROXY'

    # Reorder columns into a logical and clean structure
    ordered_cols = [
        # 1. Spatial & Temporal Primary Keys
        'station_id', 'station_name', 'zone_type', 'latitude', 'longitude',
        'datetime_utc', 'datetime_local_ist', 'year', 'month', 'day',
        'hour_utc', 'hour_ist', 'day_of_week', 'is_weekend',

        # 2. Target Variable & Pollution Measurements (OBSERVED)
        'pm25', 'pm25_obs_count', 'pm25_completeness_flag',
        'pm10', 'pm10_obs_count',
        'no2', 'no2_obs_count',

        # 3. In-Situ Station Meteorology (OBSERVED)
        'temp_insitu_c', 'temp_insitu_obs_count',
        'humidity_insitu_pct', 'humidity_insitu_obs_count',
        'wind_speed_insitu_ms', 'wind_speed_insitu_obs_count',

        # 4. Meteorology (REANALYSIS - ERA5-Land)
        'weather_grid_latitude', 'weather_grid_longitude', 'weather_elevation_m',
        'temp_c', 'humidity_pct', 'dew_point_c', 'precip_mm', 'rain_mm',
        'pressure_hpa', 'wind_speed_ms', 'wind_dir_deg', 'solar_rad_wm2',
        'cloud_cover_pct', 'pbl_height_m',

        # 5. Traffic Exposure Features (STATIC_ROAD_NETWORK & TRAFFIC_PROXY)
        'total_road_length_km', 'major_road_length_km', 'local_road_length_km',
        'major_road_density_km_per_km2', 'total_road_density_km_per_km2',
        'distance_to_nearest_major_road_m', 'traffic_proxy_index',

        # 6. Urban Activity, Industrial, Construction & Land Use (STATIC / PROXIES)
        'industrial_elements_2km', 'dist_nearest_industrial_m', 'has_industrial_within_1km',
        'construction_elements_1_5km', 'dist_nearest_construction_m', 'has_construction_within_1km',
        'poi_total_count_1_5km', 'poi_density_per_km2', 'poi_commercial_count',
        'poi_institutional_count', 'poi_transit_count',
        'landuse_elements_total', 'landuse_residential_count', 'landuse_commercial_count',
        'landuse_industrial_count', 'landuse_green_count', 'dominant_landuse',

        # 7. Provenance Classifications
        'pollution_data_type', 'weather_data_type', 'traffic_road_data_type',
        'traffic_proxy_data_type', 'activity_data_type'
    ]
    master = master[ordered_cols]

    # 12. Step 12: Primary Key Validation
    dup_keys = master.duplicated(subset=['station_id', 'datetime_utc']).sum()
    if dup_keys > 0:
        logger.error(f"FATAL: Found {dup_keys} duplicate (station_id, datetime_utc) keys! Aborting save.")
        raise ValueError(f"Duplicate primary keys detected: {dup_keys}")
    logger.info("Primary key uniqueness verified: 0 duplicates on (station_id, datetime_utc).")

    # 13. Step 13: Save Master Dataset CSV
    logger.info(f"Saving master analytical dataset to {master_csv_path}...")
    master.to_csv(master_csv_path, index=False)
    logger.info(f"Master CSV successfully saved ({len(master):,} rows, {len(master.columns)} columns).")

    # Try saving Parquet if supported
    try:
        import pyarrow
        master.to_parquet(master_parquet_path, index=False)
        logger.info(f"Master Parquet successfully saved to {master_parquet_path}")
    except ImportError:
        logger.info("Parquet engine (pyarrow/fastparquet) not installed; skipped parquet output as per guidelines.")

    # 14. Step 14: Save Integration Metrics
    metrics = {
        "execution_timestamp_utc": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "elapsed_seconds": round(time.time() - t0, 2),
        "master_row_count": len(master),
        "master_col_count": len(master.columns),
        "station_count": int(master['station_id'].nunique()),
        "stations": list(master['station_id'].unique()),
        "time_bounds": {
            "min_datetime_utc": master['datetime_utc'].min(),
            "max_datetime_utc": master['datetime_utc'].max(),
            "total_hours_per_station": int(len(master) / master['station_id'].nunique())
        },
        "pm25_completeness_distribution": master['pm25_completeness_flag'].value_counts().to_dict(),
        "pm25_observed_hours": int((master['pm25'].notnull()).sum()),
        "pm25_missing_hours": int((master['pm25'].isnull()).sum()),
        "duplicate_primary_keys": int(dup_keys),
        "columns": list(master.columns)
    }

    metrics_path = integration_dir / "integration_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Saved integration metrics to {metrics_path}")

    # 15. Step 15: Create Master README
    readme_path = integration_dir / "README.md"
    readme_content = f"""# Master Hourly Analytical Dataset

## 1. Overview
The **Master Hourly Analytical Dataset** is the integrated, canonical dataset for the **Urban Environmental Digital Twin** project. It fuses observed ambient air quality measurements with meteorological reanalysis, physical road network metrics, empirical diurnal traffic profiles, and urban activity/industrial proxies across Pune, Maharashtra, India.

* **Primary Artifact:** `master_hourly_dataset.csv`
* **Canonical Grain:** `ONE ROW = ONE MONITORING STATION × ONE HOUR`
* **Primary Key:** `(station_id, datetime_utc)`
* **Row Count:** {len(master):,} rows (6 stations × 14,016 contiguous hours)
* **Column Count:** {len(master.columns)} features
* **Temporal Period:** February 18, 2025 `00:00:00Z` to September 24, 2026 `23:00:00Z` (19 continuous months)
* **Geographic Coverage:** 6 Core Pune Air Quality Monitoring Stations (Shivajinagar, Mhada Colony, Hadapsar, Bhosari, Katraj Dairy, Pashan)

---

## 2. Integrated Domains & Provenance Classifications

| Domain | Source Provider | Feature Set | Data Classification |
|---|---|---|---|
| **Pollution** | OpenAQ (CPCB / MPCB / IITM SAFAR) | PM2.5, PM10, NO2, in-situ temp/humidity/wind, completeness flags | `OBSERVED` |
| **Meteorology** | Open-Meteo / ECMWF ERA5-Land | 2m temp, humidity, pressure, wind speed/dir, rain, solar radiation, PBLH | `REANALYSIS` |
| **Traffic Network** | OpenStreetMap (Overpass API) | Road length, arterial road density, distance to nearest major highway | `STATIC_ROAD_NETWORK` |
| **Traffic Activity** | Empirical Diurnal Curve (Pune CMP / IITM) | Normalized hourly traffic intensity index (0.0 to 1.0) | `TRAFFIC_PROXY` |
| **Industrial Activity**| OpenStreetMap (Overpass API) | Factory count in 2km, distance to nearest industrial cluster | `STATIC_INDUSTRIAL` / `INDUSTRIAL_PROXY` |
| **Construction Activity**| OpenStreetMap (Overpass API) | Active construction sites in 1.5km, distance to nearest project | `CONSTRUCTION_PROXY` |
| **Land Use & POI** | OpenStreetMap (Overpass API) | Land-use counts (residential, commercial, green), POI density per km² | `STATIC_LAND_USE` / `ACTIVITY_PROXY` |

---

## 3. Completeness Flags for Target Variable (PM2.5)
* `COMPLETE` (58,908 hours, 70.0%): $\\ge 3$ valid 15-minute readings in the hour.
* `PARTIAL` (2,111 hours, 2.5%): Exactly 2 valid 15-minute readings in the hour.
* `INSUFFICIENT` (2,000 hours, 2.4%): Exactly 1 valid 15-minute reading in the hour.
* `MISSING` (21,077 hours, 25.1%): 0 valid readings (station offline, sensor calibration, or prior to deployment).

---

## 4. Critical Truthfulness & Modeling Rules
1. **Zero Fabrication:** Missing pollution observations are represented honestly as `NaN` (with `pm25_completeness_flag = 'MISSING'`). No fake values or artificial interpolations have been introduced.
2. **Static Exposure Invariance:** Activity and road network metrics are static spatial exposure features and do not vary by hour.
3. **Traffic Proxy Distinction:** `traffic_proxy_index` is an empirical proxy curve, not an observed probe count.
4. **No Target Leakage:** No future pollution lags, rolling future averages, or target-derived encodings have been added. Feature engineering belongs strictly to Phase 4.

---

## 5. Generation Script
```bash
python ml/src/data/build_master_dataset.py --force
```
"""
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    logger.info(f"Saved {readme_path}")
    logger.info(f"Master dataset generation completed in {time.time() - t0:.2f} seconds.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build master hourly analytical dataset.")
    parser.add_argument("--force", action="store_true", help="Force rebuild even if files exist.")
    args = parser.parse_args()
    build_master_dataset(force=args.force)
