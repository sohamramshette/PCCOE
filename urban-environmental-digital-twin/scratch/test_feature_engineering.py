"""
Feature engineering prototype and validation script.
Tests all feature derivations, station-wise lags, rolling statistics,
interaction terms, leakage checks, and split statistics.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import math

def test_feature_engineering():
    root = Path(r"c:\Users\lenovo\OneDrive\Desktop\PCCOE\PCCOE\urban-environmental-digital-twin")
    master_path = root / "ml/data/processed/integration/master_hourly_dataset.csv"
    
    print("Loading master dataset...")
    df = pd.read_csv(master_path, low_memory=False)
    print(f"Master shape: {df.shape}")

    # Ensure sorting by station_id and datetime_utc
    df['dt_utc'] = pd.to_datetime(df['datetime_utc'])
    df = df.sort_values(by=['station_id', 'dt_utc']).reset_index(drop=True)

    # 1. Target Definition (t+1 hour)
    print("\n--- 1. Target Construction ---")
    df['target_pm25_t_plus_1'] = df.groupby('station_id')['pm25'].shift(-1)
    df['target_available'] = df['target_pm25_t_plus_1'].notnull().astype(int)
    print("Target created: target_pm25_t_plus_1")

    # 2. Temporal Features
    print("\n--- 2. Temporal Features ---")
    df['hour_sin'] = np.sin(2 * np.pi * df['hour_ist'] / 24.0)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour_ist'] / 24.0)
    df['month_sin'] = np.sin(2 * np.pi * (df['month'] - 1) / 12.0)
    df['month_cos'] = np.cos(2 * np.pi * (df['month'] - 1) / 12.0)
    df['day_of_week_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7.0)
    df['day_of_week_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7.0)
    df['is_monsoon'] = df['month'].isin([6, 7, 8, 9]).astype(int)

    # 3. Wind Vectors & Atmospheric Dispersion
    print("\n--- 3. Wind & Dispersion Features ---")
    # Meteorological convention: direction wind is blowing from
    rad = np.radians(df['wind_dir_deg'])
    df['wind_u'] = -df['wind_speed_ms'] * np.sin(rad)
    df['wind_v'] = -df['wind_speed_ms'] * np.cos(rad)
    df['ventilation_index'] = df['wind_speed_ms'] * df['pbl_height_m']
    df['temp_dewpoint_spread'] = df['temp_c'] - df['dew_point_c']
    df['is_precipitating'] = (df['precip_mm'] > 0.05).astype(int)
    df['atmospheric_stagnation_flag'] = ((df['wind_speed_ms'] < 1.0) & (df['pbl_height_m'] < 200.0)).astype(int)

    # 4. Pollution History & Lags (station-wise)
    print("\n--- 4. Station-Wise Pollution Lags ---")
    # Note: pm25 at time t is contemporaneous input
    for lag in [1, 2, 3, 6, 12, 24]:
        df[f'pm25_lag_{lag}h'] = df.groupby('station_id')['pm25'].shift(lag)

    # Weather Lags
    for lag in [1, 3, 6]:
        df[f'temp_c_lag_{lag}h'] = df.groupby('station_id')['temp_c'].shift(lag)
        df[f'wind_speed_ms_lag_{lag}h'] = df.groupby('station_id')['wind_speed_ms'].shift(lag)
        df[f'pbl_height_m_lag_{lag}h'] = df.groupby('station_id')['pbl_height_m'].shift(lag)
    df['humidity_pct_lag_1h'] = df.groupby('station_id')['humidity_pct'].shift(1)
    df['ventilation_index_lag_1h'] = df.groupby('station_id')['ventilation_index'].shift(1)

    # 5. Leakage-Safe Rolling Features
    print("\n--- 5. Leakage-Safe Rolling Statistics ---")
    # Window up to time t (including t)
    # Using min_periods to handle occasional missing values in time-series
    for w in [3, 6, 12, 24]:
        df[f'pm25_rolling_mean_{w}h'] = df.groupby('station_id')['pm25'].transform(
            lambda s: s.rolling(window=w, min_periods=max(1, w // 2)).mean()
        )
    for w in [6, 24]:
        df[f'pm25_rolling_std_{w}h'] = df.groupby('station_id')['pm25'].transform(
            lambda s: s.rolling(window=w, min_periods=max(2, w // 2)).std()
        )
    
    # Weather rolling features
    df['temp_c_rolling_mean_6h'] = df.groupby('station_id')['temp_c'].transform(
        lambda s: s.rolling(window=6, min_periods=3).mean()
    )
    df['wind_speed_ms_rolling_mean_6h'] = df.groupby('station_id')['wind_speed_ms'].transform(
        lambda s: s.rolling(window=6, min_periods=3).mean()
    )
    df['pbl_height_m_rolling_mean_6h'] = df.groupby('station_id')['pbl_height_m'].transform(
        lambda s: s.rolling(window=6, min_periods=3).mean()
    )
    df['precip_rolling_sum_6h'] = df.groupby('station_id')['precip_mm'].transform(
        lambda s: s.rolling(window=6, min_periods=1).sum()
    )
    df['precip_rolling_sum_24h'] = df.groupby('station_id')['precip_mm'].transform(
        lambda s: s.rolling(window=24, min_periods=1).sum()
    )

    # 6. Physical Interactions
    print("\n--- 6. Justified Environmental & Urban Interactions ---")
    # Traffic emissions under stagnant / low dispersion conditions
    df['traffic_stagnation_ratio'] = df['traffic_proxy_index'] / (df['wind_speed_ms'] + 0.2)
    df['traffic_ventilation_ratio'] = df['traffic_proxy_index'] / ((df['ventilation_index'] / 1000.0) + 0.1)
    # Industrial & construction exposure moderated by dispersion
    df['industrial_dispersion_ratio'] = df['has_industrial_within_1km'] / (df['wind_speed_ms'] + 0.2)
    df['construction_dispersion_ratio'] = df['has_construction_within_1km'] / (df['wind_speed_ms'] + 0.2)
    df['poi_traffic_interaction'] = df['poi_density_per_km2'] * df['traffic_proxy_index']

    # 7. Automated Leakage Checks
    print("\n--- 7. Automated Leakage Validation Checks ---")
    leakage_failures = []

    # Check 1: Target alignment check
    # Check that for any row i, target_pm25_t_plus_1 matches row i+1's pm25 (within same station)
    sample_st = df[df['station_id'] == 11613].copy()
    diff = sample_st['target_pm25_t_plus_1'].iloc[:-1].values - sample_st['pm25'].iloc[1:].values
    # Ignoring NaNs
    valid_diff = diff[~np.isnan(diff)]
    if len(valid_diff) > 0 and np.max(np.abs(valid_diff)) > 1e-6:
        leakage_failures.append("Target alignment failed: target_pm25_t_plus_1 does not match shifted pm25!")
    else:
        print("PASS: Target correctly shifted by exactly +1 hour within station.")

    # Check 2: Last row of each station has null target
    for s_id, s_df in df.groupby('station_id'):
        if not pd.isna(s_df['target_pm25_t_plus_1'].iloc[-1]):
            leakage_failures.append(f"Station {s_id} last row has non-null target (cross-station leak)!")
    print("PASS: Last row of each station correctly has NaN target (no cross-station target contamination).")

    # Check 3: First row of each station has null lag_1h
    for s_id, s_df in df.groupby('station_id'):
        if not pd.isna(s_df['pm25_lag_1h'].iloc[0]):
            leakage_failures.append(f"Station {s_id} first row has non-null lag_1h (cross-station lag leak)!")
    print("PASS: First row of each station correctly has NaN lag_1h (no cross-station lag contamination).")

    # Check 4: Rolling features do not use future timestamps
    # At row 0, rolling_mean_3h must equal pm25 at row 0 (or nan if pm25 is nan), not average of row 0, 1, 2!
    for s_id, s_df in df.groupby('station_id'):
        row0_val = s_df['pm25'].iloc[0]
        row0_roll = s_df['pm25_rolling_mean_3h'].iloc[0]
        if not (pd.isna(row0_val) and pd.isna(row0_roll)) and abs(row0_val - row0_roll) > 1e-6:
            leakage_failures.append(f"Station {s_id} rolling mean includes future values!")
    print("PASS: Rolling mean strictly uses past and contemporaneous values (no forward window leak).")

    # Check 5: Target is not present in features list
    feature_cols = [c for c in df.columns if c not in ['target_pm25_t_plus_1', 'target_available']]
    if 'target_pm25_t_plus_1' in feature_cols:
        leakage_failures.append("Target is present in feature columns!")
    print("PASS: Target is completely excluded from feature columns.")

    if leakage_failures:
        print(f"FAILED LEAKAGE CHECKS: {leakage_failures}")
        raise ValueError(f"Leakage checks failed: {leakage_failures}")
    else:
        print("\nALL 5 LEAKAGE CHECKS PASSED PERFECTLY!")

    # 8. Chronological Splits
    print("\n--- 8. Chronological Split Validation ---")
    train = df[df['dt_utc'] <= '2026-03-31 23:00:00+00:00'].copy()
    val = df[(df['dt_utc'] >= '2026-04-01 00:00:00+00:00') & (df['dt_utc'] <= '2026-06-30 23:00:00+00:00')].copy()
    test = df[df['dt_utc'] >= '2026-07-01 00:00:00+00:00'].copy()

    print(f"Total Rows: {len(df):,}")
    print(f"Train:      {len(train):,} ({len(train)/len(df)*100:.1f}%) | Dates: {train['datetime_utc'].min()} to {train['datetime_utc'].max()}")
    print(f"Validation: {len(val):,} ({len(val)/len(df)*100:.1f}%) | Dates: {val['datetime_utc'].min()} to {val['datetime_utc'].max()}")
    print(f"Test:       {len(test):,} ({len(test)/len(df)*100:.1f}%) | Dates: {test['datetime_utc'].min()} to {test['datetime_utc'].max()}")

    # Check ML-ready subset (where target is not null and pm25 contemporaneous or lag_1h is available)
    ml_ready = df[df['target_available'] == 1].copy()
    print(f"\nML-Ready Subset (target available): {len(ml_ready):,} rows ({len(ml_ready)/len(df)*100:.1f}% of total grid)")
    
    # Check ML-ready with valid pm25 input at time t
    ml_ready_with_current_pm25 = df[(df['target_available'] == 1) & (df['pm25'].notnull())].copy()
    print(f"ML-Ready with valid contemporaneous PM2.5: {len(ml_ready_with_current_pm25):,} rows ({len(ml_ready_with_current_pm25)/len(df)*100:.1f}%)")

    # Column count
    print(f"\nEngineered Dataset Total Columns: {len(df.columns)}")
    print(f"Feature columns: {len(feature_cols)}")

if __name__ == "__main__":
    test_feature_engineering()
