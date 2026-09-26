"""
Urban Environmental Digital Twin - Phase 7: Baseline ML Models Training
========================================================================
Trains baseline PM2.5 forecasting models:
  - Model 0: Persistence Baseline (computed during evaluation)
  - Model 1: Standardized Ridge Regression
  - Model 2: Random Forest Regressor
  - Model 3: HistGradientBoosting Regressor (sklearn)
  - Extended Benchmark: HistGradientBoosting on Station 11613 (Shivajinagar) with co-pollutants (PM10, NO2)

Strict Leakage Guards:
  - No target in feature inputs
  - Chronological splits strictly maintained
  - Preprocessor fit strictly on training set only
  - Zero target imputation (train exclusively on target_available == 1)
"""

import os
import sys
import time
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline


def get_feature_subsets(all_columns):
    """Partition columns into Core and Extended subsets with explicit exclusions."""
    target_cols = ['target_pm25_t_plus_1', 'target_available']
    metadata_cols = [
        'station_name', 'datetime_utc', 'datetime_local_ist',
        'pollution_data_type', 'weather_data_type', 'traffic_road_data_type',
        'traffic_proxy_data_type', 'activity_data_type'
    ]
    extended_pollutants = [
        'pm10', 'pm10_obs_count', 'no2', 'no2_obs_count',
        'temp_insitu_c', 'temp_insitu_obs_count',
        'humidity_insitu_pct', 'humidity_insitu_obs_count',
        'wind_speed_insitu_ms', 'wind_speed_insitu_obs_count'
    ]

    core_features = [
        c for c in all_columns
        if c not in target_cols and c not in metadata_cols and c not in extended_pollutants
    ]
    extended_features = [
        c for c in all_columns
        if c not in target_cols and c not in metadata_cols
    ]

    cat_cols = ['station_id', 'zone_type', 'pm25_completeness_flag', 'dominant_landuse']
    num_core = [c for c in core_features if c not in cat_cols]
    num_extended = [c for c in extended_features if c not in cat_cols]

    return {
        'target_col': 'target_pm25_t_plus_1',
        'core_features': core_features,
        'extended_features': extended_features,
        'cat_cols': cat_cols,
        'num_core': num_core,
        'num_extended': num_extended
    }


def verify_leakage_safety(train_df, val_df, test_df, core_features, target_col):
    """Execute automated leakage assertions prior to model fitting."""
    print("\n--- Executing Automated Leakage Protection Audit ---")

    # 1. No target column in X
    assert target_col not in core_features, "LEAKAGE: Target column present in feature set!"
    assert 'target_available' not in core_features, "LEAKAGE: Target indicator present in feature set!"
    print("  [PASSED] Check 1: Target column and target indicator strictly excluded from features.")

    # 2. Strict chronological separation
    max_train_time = pd.to_datetime(train_df['datetime_utc']).max()
    min_val_time = pd.to_datetime(val_df['datetime_utc']).min()
    max_val_time = pd.to_datetime(val_df['datetime_utc']).max()
    min_test_time = pd.to_datetime(test_df['datetime_utc']).min()

    assert max_train_time < min_val_time, f"LEAKAGE: Train overlap with Val: {max_train_time} >= {min_val_time}"
    assert max_val_time < min_test_time, f"LEAKAGE: Val overlap with Test: {max_val_time} >= {min_test_time}"
    print(f"  [PASSED] Check 2: Strict chronological separation verified:")
    print(f"           Train: -> {max_train_time} | Val: {min_val_time} -> {max_val_time} | Test: {min_test_time} ->")

    # 3. No target imputation in training data
    assert train_df[target_col].isnull().sum() == 0, "LEAKAGE: Target contains NaN values in training subset!"
    print("  [PASSED] Check 3: Filtered subset contains 100% observed targets (zero target imputation).")

    print("--- Leakage Audit 100% Passed ---\n")


def build_preprocessor(num_cols, cat_cols):
    """Build a scikit-learn ColumnTransformer with median imputation and scaling for numericals, and OHE for categoricals."""
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler())
            ]), num_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)
        ]
    )
    return preprocessor


def train_baselines(data_dir: Path, models_dir: Path):
    """Train all baseline models and save artifacts."""
    t_start = time.time()
    models_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("URBAN ENVIRONMENTAL DIGITAL TWIN: PHASE 7 MODEL TRAINING")
    print("=" * 70)

    # 1. Load Partitions
    print("Loading feature datasets...")
    train_path = data_dir / "train.csv"
    val_path = data_dir / "validation.csv"
    test_path = data_dir / "test.csv"

    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)

    print(f"Loaded raw partitions:")
    print(f"  Train:      {len(train_df):,} rows")
    print(f"  Validation: {len(val_df):,} rows")
    print(f"  Test:       {len(test_df):,} rows")

    # Filter to valid targets only
    train_v = train_df[train_df['target_available'] == 1].copy()
    val_v = val_df[val_df['target_available'] == 1].copy()
    test_v = test_df[test_df['target_available'] == 1].copy()

    print(f"Filtered valid target rows (target_available == 1):")
    print(f"  Train Valid:      {len(train_v):,} rows ({len(train_v)/len(train_df)*100:.2f}%)")
    print(f"  Validation Valid: {len(val_v):,} rows ({len(val_v)/len(val_df)*100:.2f}%)")
    print(f"  Test Valid:       {len(test_v):,} rows ({len(test_v)/len(test_df)*100:.2f}%)")

    # Feature definitions
    feat_spec = get_feature_subsets(train_df.columns.tolist())
    target_col = feat_spec['target_col']
    core_features = feat_spec['core_features']
    cat_cols = feat_spec['cat_cols']
    num_core = feat_spec['num_core']

    print(f"\nFeature Taxonomy:")
    print(f"  Core Features:     {len(core_features)} ({len(num_core)} numerical, {len(cat_cols)} categorical)")
    print(f"  Extended Features: {len(feat_spec['extended_features'])}")
    print(f"  Target:            {target_col} (Next-hour PM2.5 in ug/m3)")

    # Leakage check
    verify_leakage_safety(train_v, val_v, test_v, core_features, target_col)

    # 2. Fit Preprocessor strictly on Train
    print("Fitting preprocessor on training data...")
    t0 = time.time()
    preprocessor = build_preprocessor(num_core, cat_cols)
    X_train_core = train_v[core_features]
    y_train = train_v[target_col].values

    X_train_proc = preprocessor.fit_transform(X_train_core)
    print(f"Preprocessor fit complete in {time.time()-t0:.2f}s. Encoded dimension: {X_train_proc.shape[1]} features.")

    # Save preprocessor
    joblib.dump(preprocessor, models_dir / "preprocessor.joblib")
    print(f"Saved: {models_dir / 'preprocessor.joblib'}")

    # Save feature names
    cat_encoder = preprocessor.named_transformers_['cat']
    encoded_cat_names = cat_encoder.get_feature_names_out(cat_cols).tolist()
    all_feature_names = num_core + encoded_cat_names
    with open(models_dir / "feature_names.json", "w") as f:
        json.dump({
            "core_features": core_features,
            "num_cols": num_core,
            "cat_cols": cat_cols,
            "encoded_feature_names": all_feature_names
        }, f, indent=2)

    # 3. Model 1: Ridge Regression
    print("\n--- Training Model 1: Standardized Ridge Regression ---")
    t0 = time.time()
    ridge = Ridge(alpha=100.0, random_state=42)
    ridge.fit(X_train_proc, y_train)
    print(f"Ridge training complete in {time.time()-t0:.2f}s.")
    joblib.dump(ridge, models_dir / "ridge_baseline.joblib")
    print(f"Saved: {models_dir / 'ridge_baseline.joblib'}")

    # 4. Model 2: Random Forest Regressor
    print("\n--- Training Model 2: Random Forest Regressor ---")
    t0 = time.time()
    rf = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        max_features=0.3,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_proc, y_train)
    print(f"Random Forest training complete in {time.time()-t0:.2f}s.")
    joblib.dump(rf, models_dir / "random_forest_baseline.joblib")
    print(f"Saved: {models_dir / 'random_forest_baseline.joblib'}")

    # 5. Model 3: HistGradientBoosting Regressor
    print("\n--- Training Model 3: HistGradientBoosting Regressor ---")
    t0 = time.time()
    hgb = HistGradientBoostingRegressor(
        max_iter=150,
        learning_rate=0.08,
        max_depth=10,
        min_samples_leaf=20,
        random_state=42
    )
    hgb.fit(X_train_proc, y_train)
    print(f"HistGradientBoosting training complete in {time.time()-t0:.2f}s.")
    joblib.dump(hgb, models_dir / "gradient_boosting_baseline.joblib")
    print(f"Saved: {models_dir / 'gradient_boosting_baseline.joblib'}")

    # 6. Extended Benchmark Model: Station 11613 (Shivajinagar)
    print("\n--- Training Extended Benchmark Model: Station 11613 (Shivajinagar) ---")
    s11613_train = train_v[train_v['station_id'] == 11613].copy()
    ext_features = feat_spec['extended_features']
    num_ext = feat_spec['num_extended']

    preprocessor_ext = build_preprocessor(num_ext, cat_cols)
    X_train_ext = preprocessor_ext.fit_transform(s11613_train[ext_features])
    y_train_ext = s11613_train[target_col].values

    hgb_ext = HistGradientBoostingRegressor(
        max_iter=150,
        learning_rate=0.08,
        max_depth=8,
        min_samples_leaf=20,
        random_state=42
    )
    hgb_ext.fit(X_train_ext, y_train_ext)
    print(f"Station 11613 Extended Model trained on {len(s11613_train):,} rows with {len(ext_features)} features.")
    joblib.dump(hgb_ext, models_dir / "gradient_boosting_extended_11613.joblib")
    joblib.dump(preprocessor_ext, models_dir / "preprocessor_extended_11613.joblib")
    print(f"Saved: {models_dir / 'gradient_boosting_extended_11613.joblib'}")

    print("\n" + "=" * 70)
    print(f"ALL BASELINE MODELS TRAINED & SAVED IN {time.time()-t_start:.2f}s")
    print("=" * 70)


if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[3]
    DATA_DIR = PROJECT_ROOT / "ml" / "data" / "processed" / "features"
    MODELS_DIR = PROJECT_ROOT / "ml" / "models"
    train_baselines(DATA_DIR, MODELS_DIR)
