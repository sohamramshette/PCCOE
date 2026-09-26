"""
Prototype test script for master hourly dataset generation.
Validates the complete join, aggregation logic, and checks for any discrepancies.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import time

def test_integration():
    t0 = time.time()
    root = Path(r"c:\Users\lenovo\OneDrive\Desktop\PCCOE\PCCOE\urban-environmental-digital-twin")

    # 1. Load Processed Weather (14,016 hours x 7 locations)
    w_path = root / "ml/data/processed/weather/weather_hourly_processed.csv"
    print("Loading processed weather...")
    df_w = pd.read_csv(w_path, low_memory=False)
    # Filter to the 6 core stations
    df_w['station_id'] = df_w['location_id'].astype(str)
    core_stations = ['11613', '11609', '60658', '3409331', '3409438', '3409526']
    df_w = df_w[df_w['station_id'].isin(core_stations)].copy()
    print(f"Weather for 6 stations: {len(df_w):,} rows (expected 84,096)")

    # 2. Load Traffic Road Features
    tr_path = root / "ml/data/processed/traffic/station_road_features.csv"
    df_tf = pd.read_csv(tr_path)
    df_tf['station_id'] = df_tf['location_id'].astype(str)
    print(f"Traffic road features: {len(df_tf)} stations")

    # 3. Load Traffic Hourly Proxy
    tp_path = root / "ml/data/processed/traffic/traffic_hourly_proxy.csv"
    df_tp = pd.read_csv(tp_path)
    print(f"Traffic diurnal proxy: {len(df_tp)} hours")

    # 4. Load Station Activity Features
    act_path = root / "ml/data/processed/activity/station_activity_features.csv"
    df_af = pd.read_csv(act_path)
    df_af['station_id'] = df_af['station_id'].astype(str)
    print(f"Station activity features: {len(df_af)} stations")

    # 5. Load and Aggregate OpenAQ Raw Measurements
    pol_path = root / "ml/data/raw/pollution/openaq/measurements/raw_measurements.csv"
    print("Loading raw OpenAQ measurements (419,781 rows)...")
    df_p = pd.read_csv(pol_path, low_memory=False)
    df_p['station_id'] = df_p['location_id'].astype(str)
    df_p = df_p[df_p['station_id'].isin(core_stations)].copy()

    # Time floor to hour
    df_p['dt_utc'] = pd.to_datetime(df_p['datetime_from_utc'])
    df_p['datetime_utc'] = df_p['dt_utc'].dt.floor('h').dt.strftime('%Y-%m-%dT%H:00:00Z')

    print("Aggregating OpenAQ by station_id, datetime_utc, parameter...")
    # Group by station_id, datetime_utc, parameter
    p_agg = df_p.groupby(['station_id', 'datetime_utc', 'parameter'])['value'].agg(
        val_mean='mean',
        val_count='count'
    ).unstack('parameter')

    # Flatten multiindex columns
    flat_cols = []
    for col in p_agg.columns:
        stat, param = col
        if stat == 'val_mean':
            flat_cols.append(param)
        else:
            flat_cols.append(f"{param}_obs_count")
    p_agg.columns = flat_cols
    p_agg = p_agg.reset_index()
    print(f"Aggregated pollution station-hours: {len(p_agg):,} rows")

    # Add completeness flag for PM2.5
    if 'pm25_obs_count' in p_agg.columns:
        conditions = [
            p_agg['pm25_obs_count'] >= 3,
            p_agg['pm25_obs_count'] == 2,
            p_agg['pm25_obs_count'] == 1
        ]
        choices = ['COMPLETE', 'PARTIAL', 'INSUFFICIENT']
        p_agg['pm25_completeness_flag'] = np.select(conditions, choices, default='MISSING')

    # 6. Master Join on (station_id, datetime_utc)
    print("Building master grid from weather (84,096 station-hours)...")
    # Base is df_w
    master = df_w[[
        'station_id', 'station_name', 'requested_latitude', 'requested_longitude',
        'grid_latitude', 'grid_longitude', 'elevation', 'datetime_utc', 'datetime_local_ist',
        'temp_c', 'humidity_pct', 'dew_point_c', 'precip_mm', 'rain_mm',
        'pressure_hpa', 'wind_speed_ms', 'wind_dir_deg', 'solar_rad_wm2',
        'cloud_cover_pct', 'pbl_height_m'
    ]].copy()

    # Rename coordinate columns for clarity
    master.rename(columns={
        'requested_latitude': 'latitude',
        'requested_longitude': 'longitude',
        'grid_latitude': 'weather_grid_latitude',
        'grid_longitude': 'weather_grid_longitude',
        'elevation': 'elevation_m'
    }, inplace=True)

    # Add temporal helper columns
    dt_local = pd.to_datetime(master['datetime_local_ist'])
    dt_utc = pd.to_datetime(master['datetime_utc'])
    master['year'] = dt_utc.dt.year
    master['month'] = dt_utc.dt.month
    master['day'] = dt_utc.dt.day
    master['hour_utc'] = dt_utc.dt.hour
    master['hour_ist'] = dt_local.dt.hour
    master['day_of_week'] = dt_local.dt.dayofweek
    master['is_weekend'] = (master['day_of_week'] >= 5).astype(int)

    # 7. Join OpenAQ Pollution
    print("Joining OpenAQ pollution...")
    master = master.merge(p_agg, on=['station_id', 'datetime_utc'], how='left')
    # If no pm25 record, fill observation count with 0 and flag as MISSING
    if 'pm25_obs_count' in master.columns:
        master['pm25_obs_count'] = master['pm25_obs_count'].fillna(0).astype(int)
        master['pm25_completeness_flag'] = master['pm25_completeness_flag'].fillna('MISSING')

    # 8. Join Traffic Road Features
    print("Joining traffic road features...")
    tf_cols = [
        'station_id', 'zone_type', 'total_road_length_km', 'major_road_length_km',
        'local_road_length_km', 'major_road_density_km_per_km2',
        'total_road_density_km_per_km2', 'distance_to_nearest_major_road_m'
    ]
    master = master.merge(df_tf[tf_cols], on='station_id', how='left')

    # 9. Join Traffic Diurnal Proxy
    print("Joining traffic diurnal proxy...")
    # Map traffic index based on hour_ist and is_weekend
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

    # 10. Join Activity Features
    print("Joining station activity features...")
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

    # Add provenance classification columns
    master['pollution_data_type'] = 'OBSERVED'
    master['weather_data_type'] = 'REANALYSIS'
    master['traffic_road_data_type'] = 'STATIC_ROAD_NETWORK'
    master['traffic_proxy_data_type'] = 'TRAFFIC_PROXY'
    master['activity_data_type'] = 'STATIC_LAND_USE / PROXY'

    # Check primary key uniqueness
    dup_keys = master.duplicated(subset=['station_id', 'datetime_utc']).sum()
    print(f"\nDuplicate (station_id, datetime_utc) keys: {dup_keys}")
    print(f"Master shape: {master.shape} (Rows: {len(master):,}, Cols: {len(master.columns)})")
    print(f"Elapsed time: {time.time() - t0:.2f} seconds")

    print("\n--- Master Columns ---")
    print(list(master.columns))

    print("\n--- Station Counts in Master ---")
    print(master['station_id'].value_counts())

    print("\n--- PM2.5 Completeness Distribution ---")
    print(master['pm25_completeness_flag'].value_counts())

    print("\n--- Null Counts Summary (Top Nulls) ---")
    nulls = master.isnull().sum()
    print(nulls[nulls > 0])

if __name__ == "__main__":
    test_integration()
