"""
Urban Environmental Digital Twin - Phase 7: Baseline ML Models Evaluation
==========================================================================
Evaluates trained PM2.5 forecasting models:
  - Model 0: Persistence Baseline (contemporaneous & operational)
  - Model 1: Standardized Ridge Regression
  - Model 2: Random Forest Regressor
  - Model 3: HistGradientBoosting Regressor
  - Extended Benchmark: Station 11613 with co-pollutants (PM10, NO2)

Outputs:
  - ml/results/model_comparison.csv
  - ml/results/station_metrics.csv
  - ml/results/subgroup_metrics.csv
  - ml/results/feature_importance.csv
  - ml/results/validation_predictions.csv
  - ml/results/test_predictions.csv
  - ml/results/evaluation_report.json
  - ml/results/README.md
  - ml/results/figures/ (7 publication-quality figures)
"""

import os
import sys
import time
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
    median_absolute_error,
    explained_variance_score
)
from sklearn.inspection import permutation_importance


def categorize_feature(name: str) -> str:
    """Categorize feature name into one of 7 scientific domains for interpretability."""
    if name.startswith('pm25_rolling') or name.startswith('pm25_lag') or name == 'pm25':
        return 'PM2.5 History'
    elif any(k in name for k in ['temp_', 'humidity_', 'dew_point', 'precip', 'rain', 'pressure', 'solar_rad', 'cloud_cover']):
        return 'Weather'
    elif any(k in name for k in ['wind_', 'pbl_height', 'ventilation_index', 'stagnation']):
        return 'Atmospheric Dispersion'
    elif any(k in name for k in ['hour_', 'month_', 'day_', 'year', 'is_monsoon', 'is_weekend']):
        return 'Temporal'
    elif any(k in name for k in ['road_', 'traffic_']):
        return 'Traffic'
    elif any(k in name for k in ['industrial', 'construction', 'poi_', 'landuse']):
        return 'Activity / Industrial'
    elif any(k in name for k in ['station_id', 'latitude', 'longitude', 'elevation', 'zone_type']):
        return 'Spatial'
    else:
        return 'Other'


def compute_metrics(y_true, y_pred, model_name, split_name, persist_mae=None, persist_rmse=None, persist_r2=None):
    """Compute primary and secondary evaluation metrics."""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = root_mean_squared_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    medae = median_absolute_error(y_true, y_pred)
    ev = explained_variance_score(y_true, y_pred)

    delta_mae = (mae - persist_mae) if persist_mae is not None else 0.0
    delta_rmse = (rmse - persist_rmse) if persist_rmse is not None else 0.0
    delta_r2 = (r2 - persist_r2) if persist_r2 is not None else 0.0

    return {
        'model_name': model_name,
        'split': split_name,
        'n_samples': int(len(y_true)),
        'mae': round(float(mae), 4),
        'rmse': round(float(rmse), 4),
        'r2': round(float(r2), 4),
        'medae': round(float(medae), 4),
        'explained_variance': round(float(ev), 4),
        'delta_mae_vs_persist': round(float(delta_mae), 4),
        'delta_rmse_vs_persist': round(float(delta_rmse), 4),
        'delta_r2_vs_persist': round(float(delta_r2), 4)
    }


def evaluate_all():
    t_start = time.time()
    project_root = Path(__file__).resolve().parents[3]
    data_dir = project_root / "ml" / "data" / "processed" / "features"
    models_dir = project_root / "ml" / "models"
    results_dir = project_root / "ml" / "results"
    figures_dir = results_dir / "figures"

    results_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 75)
    print("URBAN ENVIRONMENTAL DIGITAL TWIN: PHASE 7 MODEL EVALUATION")
    print("=" * 75)

    # 1. Load Datasets
    print("Loading feature datasets...")
    train_df = pd.read_csv(data_dir / "train.csv")
    val_df = pd.read_csv(data_dir / "validation.csv")
    test_df = pd.read_csv(data_dir / "test.csv")

    train_v = train_df[train_df['target_available'] == 1].copy()
    val_v = val_df[val_df['target_available'] == 1].copy()
    test_v = test_df[test_df['target_available'] == 1].copy()

    # Load feature specs
    with open(models_dir / "feature_names.json") as f:
        feat_meta = json.load(f)
    core_features = feat_meta['core_features']
    encoded_feature_names = feat_meta['encoded_feature_names']
    target_col = 'target_pm25_t_plus_1'

    # Load models
    print("Loading preprocessor and models...")
    preprocessor = joblib.load(models_dir / "preprocessor.joblib")
    ridge = joblib.load(models_dir / "ridge_baseline.joblib")
    rf = joblib.load(models_dir / "random_forest_baseline.joblib")
    hgb = joblib.load(models_dir / "gradient_boosting_baseline.joblib")

    # Transform features
    print("Transforming validation and test feature sets with fitted preprocessor...")
    X_val_proc = preprocessor.transform(val_v[core_features])
    X_test_proc = preprocessor.transform(test_v[core_features])

    y_train = train_v[target_col].values
    train_median = float(np.median(y_train))
    y_val = val_v[target_col].values
    y_test = test_v[target_col].values

    # 2. Persistence Baseline Calculation
    # Pure persistence: pm25_t
    # Operational persistence: pm25_t -> pm25_lag_1h -> pm25_lag_2h -> pm25_lag_3h -> train_median
    def get_persistence(df):
        p = df['pm25'].copy()
        p = p.fillna(df['pm25_lag_1h']).fillna(df['pm25_lag_2h']).fillna(df['pm25_lag_3h']).fillna(train_median)
        return p.values

    persist_val = get_persistence(val_v)
    persist_test = get_persistence(test_v)

    # Calculate predictions
    print("Generating model predictions...")
    pred_val_ridge = ridge.predict(X_val_proc)
    pred_test_ridge = ridge.predict(X_test_proc)

    pred_val_rf = rf.predict(X_val_proc)
    pred_test_rf = rf.predict(X_test_proc)

    pred_val_hgb = hgb.predict(X_val_proc)
    pred_test_hgb = hgb.predict(X_test_proc)

    # Attach predictions to dataframes for easy slicing
    val_v['pred_persist'] = persist_val
    val_v['pred_ridge'] = pred_val_ridge
    val_v['pred_rf'] = pred_val_rf
    val_v['pred_hgb'] = pred_val_hgb

    test_v['pred_persist'] = persist_test
    test_v['pred_ridge'] = pred_test_ridge
    test_v['pred_rf'] = pred_test_rf
    test_v['pred_hgb'] = pred_test_hgb

    # Base Persistence metrics
    val_persist_metrics = compute_metrics(y_val, persist_val, 'Model 0 - Persistence Baseline', 'Validation')
    test_persist_metrics = compute_metrics(y_test, persist_test, 'Model 0 - Persistence Baseline', 'Test')

    p_val_mae, p_val_rmse, p_val_r2 = val_persist_metrics['mae'], val_persist_metrics['rmse'], val_persist_metrics['r2']
    p_test_mae, p_test_rmse, p_test_r2 = test_persist_metrics['mae'], test_persist_metrics['rmse'], test_persist_metrics['r2']

    # Contemporaneous pair persistence (where pm25_t is non-null)
    val_contemp_mask = val_v['pm25'].notnull().values
    test_contemp_mask = test_v['pm25'].notnull().values
    val_pair_persist = compute_metrics(
        y_val[val_contemp_mask], val_v.loc[val_contemp_mask, 'pm25'].values,
        'Model 0 - Persistence (Contemporaneous Pair Only)', 'Validation'
    )
    test_pair_persist = compute_metrics(
        y_test[test_contemp_mask], test_v.loc[test_contemp_mask, 'pm25'].values,
        'Model 0 - Persistence (Contemporaneous Pair Only)', 'Test'
    )

    # 3. Overall Model Comparison Table
    comparison_rows = [
        val_persist_metrics,
        compute_metrics(y_val, pred_val_ridge, 'Model 1 - Ridge Regression', 'Validation', p_val_mae, p_val_rmse, p_val_r2),
        compute_metrics(y_val, pred_val_rf, 'Model 2 - Random Forest', 'Validation', p_val_mae, p_val_rmse, p_val_r2),
        compute_metrics(y_val, pred_val_hgb, 'Model 3 - HistGradientBoosting', 'Validation', p_val_mae, p_val_rmse, p_val_r2),
        test_persist_metrics,
        compute_metrics(y_test, pred_test_ridge, 'Model 1 - Ridge Regression', 'Test', p_test_mae, p_test_rmse, p_test_r2),
        compute_metrics(y_test, pred_test_rf, 'Model 2 - Random Forest', 'Test', p_test_mae, p_test_rmse, p_test_r2),
        compute_metrics(y_test, pred_test_hgb, 'Model 3 - HistGradientBoosting', 'Test', p_test_mae, p_test_rmse, p_test_r2)
    ]
    comparison_df = pd.DataFrame(comparison_rows)
    comparison_df.to_csv(results_dir / "model_comparison.csv", index=False)
    print(f"Saved: {results_dir / 'model_comparison.csv'}")

    # 4. Station-Wise Test Performance
    print("\nComputing per-station test metrics...")
    test_v['pred_persist'] = persist_test
    test_v['pred_ridge'] = pred_test_ridge
    test_v['pred_rf'] = pred_test_rf
    test_v['pred_hgb'] = pred_test_hgb

    station_records = []
    unique_stations = test_v[['station_id', 'station_name', 'zone_type']].drop_duplicates().sort_values('station_id')

    for _, row in unique_stations.iterrows():
        sid = row['station_id']
        sname = row['station_name']
        ztype = row['zone_type']
        s_df = test_v[test_v['station_id'] == sid]
        y_s = s_df[target_col].values
        p_s = s_df['pred_persist'].values
        h_s = s_df['pred_hgb'].values
        rf_s = s_df['pred_rf'].values
        rd_s = s_df['pred_ridge'].values

        mae_p = mean_absolute_error(y_s, p_s)
        rmse_p = root_mean_squared_error(y_s, p_s)
        r2_p = r2_score(y_s, p_s)

        mae_h = mean_absolute_error(y_s, h_s)
        rmse_h = root_mean_squared_error(y_s, h_s)
        r2_h = r2_score(y_s, h_s)
        medae_h = median_absolute_error(y_s, h_s)

        mae_rf = mean_absolute_error(y_s, rf_s)
        rmse_rf = root_mean_squared_error(y_s, rf_s)
        r2_rf = r2_score(y_s, rf_s)

        mae_rd = mean_absolute_error(y_s, rd_s)
        rmse_rd = root_mean_squared_error(y_s, rd_s)
        r2_rd = r2_score(y_s, rd_s)

        station_records.append({
            'station_id': int(sid),
            'station_name': sname,
            'zone_type': ztype,
            'n_test': len(s_df),
            'persistence_mae': round(float(mae_p), 4),
            'persistence_rmse': round(float(rmse_p), 4),
            'persistence_r2': round(float(r2_p), 4),
            'hgb_mae': round(float(mae_h), 4),
            'hgb_rmse': round(float(rmse_h), 4),
            'hgb_r2': round(float(r2_h), 4),
            'hgb_medae': round(float(medae_h), 4),
            'rf_mae': round(float(mae_rf), 4),
            'rf_rmse': round(float(rmse_rf), 4),
            'rf_r2': round(float(r2_rf), 4),
            'ridge_mae': round(float(mae_rd), 4),
            'ridge_rmse': round(float(rmse_rd), 4),
            'ridge_r2': round(float(r2_rd), 4),
            'hgb_mae_improvement': round(float(mae_p - mae_h), 4),
            'hgb_mae_pct_improvement': round(float((mae_p - mae_h) / mae_p * 100), 2)
        })

    station_df = pd.DataFrame(station_records)
    station_df.to_csv(results_dir / "station_metrics.csv", index=False)
    print(f"Saved: {results_dir / 'station_metrics.csv'}")

    # 5. Meaningful Subgroup Performance (Test Set)
    print("\nComputing meaningful subgroup test performance...")
    subgroups = []

    # Diurnal: Day (06:00 to 18:00 IST) vs Night (18:00 to 06:00 IST)
    day_mask = (test_v['hour_ist'] >= 6) & (test_v['hour_ist'] < 18)
    for name, mask in [('Diurnal: Daytime (06:00-18:00 IST)', day_mask), ('Diurnal: Nighttime (18:00-06:00 IST)', ~day_mask)]:
        sub_df = test_v[mask]
        y_sub = sub_df[target_col].values
        p_sub = sub_df['pred_persist'].values
        h_sub = sub_df['pred_hgb'].values
        mae_p = mean_absolute_error(y_sub, p_sub)
        mae_h = mean_absolute_error(y_sub, h_sub)
        rmse_h = root_mean_squared_error(y_sub, h_sub)
        r2_h = r2_score(y_sub, h_sub)
        subgroups.append({
            'subgroup': name,
            'n_test': len(sub_df),
            'persistence_mae': round(float(mae_p), 4),
            'hgb_mae': round(float(mae_h), 4),
            'hgb_rmse': round(float(rmse_h), 4),
            'hgb_r2': round(float(r2_h), 4),
            'mae_improvement': round(float(mae_p - mae_h), 4)
        })

    # Seasonal: Monsoon (is_monsoon == 1) vs Non-Monsoon
    monsoon_mask = test_v['is_monsoon'] == 1
    for name, mask in [('Season: Active Monsoon (Jul-Sep)', monsoon_mask), ('Season: Non-Monsoon (Dry)', ~monsoon_mask)]:
        sub_df = test_v[mask]
        if len(sub_df) > 0:
            y_sub = sub_df[target_col].values
            p_sub = sub_df['pred_persist'].values
            h_sub = sub_df['pred_hgb'].values
            mae_p = mean_absolute_error(y_sub, p_sub)
            mae_h = mean_absolute_error(y_sub, h_sub)
            rmse_h = root_mean_squared_error(y_sub, h_sub)
            r2_h = r2_score(y_sub, h_sub)
            subgroups.append({
                'subgroup': name,
                'n_test': len(sub_df),
                'persistence_mae': round(float(mae_p), 4),
                'hgb_mae': round(float(mae_h), 4),
                'hgb_rmse': round(float(rmse_h), 4),
                'hgb_r2': round(float(r2_h), 4),
                'mae_improvement': round(float(mae_p - mae_h), 4)
            })

    # Pollution: Low/Moderate (<= 35 ug/m3) vs High/Poor (> 35 ug/m3)
    high_mask = test_v['pm25'] > 35.0
    for name, mask in [('Pollution: Moderate/Low PM2.5 (<= 35 ug/m3)', ~high_mask), ('Pollution: Elevated PM2.5 (> 35 ug/m3)', high_mask)]:
        sub_df = test_v[mask]
        if len(sub_df) > 0:
            y_sub = sub_df[target_col].values
            p_sub = sub_df['pred_persist'].values
            h_sub = sub_df['pred_hgb'].values
            mae_p = mean_absolute_error(y_sub, p_sub)
            mae_h = mean_absolute_error(y_sub, h_sub)
            rmse_h = root_mean_squared_error(y_sub, h_sub)
            r2_h = r2_score(y_sub, h_sub)
            subgroups.append({
                'subgroup': name,
                'n_test': len(sub_df),
                'persistence_mae': round(float(mae_p), 4),
                'hgb_mae': round(float(mae_h), 4),
                'hgb_rmse': round(float(rmse_h), 4),
                'hgb_r2': round(float(r2_h), 4),
                'mae_improvement': round(float(mae_p - mae_h), 4)
            })

    subgroup_df = pd.DataFrame(subgroups)
    subgroup_df.to_csv(results_dir / "subgroup_metrics.csv", index=False)
    print(f"Saved: {results_dir / 'subgroup_metrics.csv'}")

    # 6. Station 11613 Extended Model Benchmark Comparison
    print("\nEvaluating Station 11613 Extended Benchmark (Co-pollutants PM10, NO2)...")
    hgb_ext = joblib.load(models_dir / "gradient_boosting_extended_11613.joblib")
    prep_ext = joblib.load(models_dir / "preprocessor_extended_11613.joblib")

    s11613_val = val_v[val_v['station_id'] == 11613].copy()
    s11613_test = test_v[test_v['station_id'] == 11613].copy()

    # Features for extended
    exclude_metadata = [
        'target_pm25_t_plus_1', 'target_available',
        'station_name', 'datetime_utc', 'datetime_local_ist',
        'pollution_data_type', 'weather_data_type', 'traffic_road_data_type',
        'traffic_proxy_data_type', 'activity_data_type'
    ]
    ext_features = [c for c in s11613_val.columns if c not in exclude_metadata]

    X_val_ext = prep_ext.transform(s11613_val[ext_features])
    X_test_ext = prep_ext.transform(s11613_test[ext_features])

    pred_val_ext = hgb_ext.predict(X_val_ext)
    pred_test_ext = hgb_ext.predict(X_test_ext)

    ext_benchmarks = [
        {
            'configuration': 'Station 11613 - Core Features (Network HGB)',
            'split': 'Validation',
            'n_samples': len(s11613_val),
            'mae': round(float(mean_absolute_error(s11613_val[target_col], s11613_val['pred_hgb'])), 4),
            'rmse': round(float(root_mean_squared_error(s11613_val[target_col], s11613_val['pred_hgb'])), 4),
            'r2': round(float(r2_score(s11613_val[target_col], s11613_val['pred_hgb'])), 4)
        },
        {
            'configuration': 'Station 11613 - Extended Features (with PM10, NO2)',
            'split': 'Validation',
            'n_samples': len(s11613_val),
            'mae': round(float(mean_absolute_error(s11613_val[target_col], pred_val_ext)), 4),
            'rmse': round(float(root_mean_squared_error(s11613_val[target_col], pred_val_ext)), 4),
            'r2': round(float(r2_score(s11613_val[target_col], pred_val_ext)), 4)
        },
        {
            'configuration': 'Station 11613 - Core Features (Network HGB)',
            'split': 'Test',
            'n_samples': len(s11613_test),
            'mae': round(float(mean_absolute_error(s11613_test[target_col], s11613_test['pred_hgb'])), 4),
            'rmse': round(float(root_mean_squared_error(s11613_test[target_col], s11613_test['pred_hgb'])), 4),
            'r2': round(float(r2_score(s11613_test[target_col], s11613_test['pred_hgb'])), 4)
        },
        {
            'configuration': 'Station 11613 - Extended Features (with PM10, NO2)',
            'split': 'Test',
            'n_samples': len(s11613_test),
            'mae': round(float(mean_absolute_error(s11613_test[target_col], pred_test_ext)), 4),
            'rmse': round(float(root_mean_squared_error(s11613_test[target_col], pred_test_ext)), 4),
            'r2': round(float(r2_score(s11613_test[target_col], pred_test_ext)), 4)
        }
    ]

    # 7. Feature Importance & Interpretability
    print("\nComputing feature importance rankings...")
    rf_importances = pd.Series(rf.feature_importances_, index=encoded_feature_names)

    # Permutation importance on a representative validation sample (2000 rows)
    np.random.seed(42)
    sample_indices = np.random.choice(len(y_val), size=min(2000, len(y_val)), replace=False)
    X_val_sample = X_val_proc[sample_indices]
    y_val_sample = y_val[sample_indices]

    print("Running permutation importance on validation set (5 repeats)...")
    perm_res = permutation_importance(
        hgb, X_val_sample, y_val_sample,
        n_repeats=5,
        random_state=42,
        scoring='neg_mean_absolute_error',
        n_jobs=-1
    )
    perm_importances = pd.Series(perm_res.importances_mean, index=encoded_feature_names)

    feat_imp_df = pd.DataFrame({
        'feature_name': encoded_feature_names,
        'rf_gini_importance': rf_importances.values,
        'hgb_permutation_mae_loss': perm_importances.values,
        'category': [categorize_feature(f) for f in encoded_feature_names]
    }).sort_values('rf_gini_importance', ascending=False)

    feat_imp_df.to_csv(results_dir / "feature_importance.csv", index=False)
    print(f"Saved: {results_dir / 'feature_importance.csv'}")

    # 8. Save Prediction Files
    print("\nExporting prediction CSVs...")
    # Long-format prediction rows
    val_preds_long = []
    test_preds_long = []

    for name, pred in [
        ('Persistence Baseline', persist_val),
        ('Ridge Regression', pred_val_ridge),
        ('Random Forest', pred_val_rf),
        ('HistGradientBoosting', pred_val_hgb)
    ]:
        for i in range(len(val_v)):
            val_preds_long.append({
                'station_id': int(val_v['station_id'].iloc[i]),
                'station_name': val_v['station_name'].iloc[i],
                'datetime_utc': val_v['datetime_utc'].iloc[i],
                'actual_pm25': round(float(y_val[i]), 3),
                'predicted_pm25': round(float(pred[i]), 3),
                'model_name': name,
                'split': 'Validation'
            })

    for name, pred in [
        ('Persistence Baseline', persist_test),
        ('Ridge Regression', pred_test_ridge),
        ('Random Forest', pred_test_rf),
        ('HistGradientBoosting', pred_test_hgb)
    ]:
        for i in range(len(test_v)):
            test_preds_long.append({
                'station_id': int(test_v['station_id'].iloc[i]),
                'station_name': test_v['station_name'].iloc[i],
                'datetime_utc': test_v['datetime_utc'].iloc[i],
                'actual_pm25': round(float(y_test[i]), 3),
                'predicted_pm25': round(float(pred[i]), 3),
                'model_name': name,
                'split': 'Test'
            })

    val_preds_df = pd.DataFrame(val_preds_long)
    test_preds_df = pd.DataFrame(test_preds_long)

    val_preds_df.to_csv(results_dir / "validation_predictions.csv", index=False)
    test_preds_df.to_csv(results_dir / "test_predictions.csv", index=False)
    print(f"Saved: {results_dir / 'validation_predictions.csv'} ({len(val_preds_df):,} rows)")
    print(f"Saved: {results_dir / 'test_predictions.csv'} ({len(test_preds_df):,} rows)")

    # 9. Generate Publication-Quality Visualizations
    print("\nGenerating evaluation figures under ml/results/figures/...")
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

    # Color palette
    c_primary = '#1f77b4'
    c_accent = '#ff7f0e'
    c_green = '#2ca02c'
    c_dark = '#333333'

    # Figure 1: Actual vs Predicted PM2.5 (Test Set - HistGradientBoosting)
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.scatter(y_test, pred_test_hgb, alpha=0.15, s=12, color=c_primary, edgecolors='none', label='Test Observations')
    max_val = min(max(np.percentile(y_test, 99.5), np.percentile(pred_test_hgb, 99.5)), 150)
    ax.plot([0, max_val], [0, max_val], color='red', linestyle='--', linewidth=1.5, label='1:1 Perfect Forecast')
    ax.set_xlim(0, max_val)
    ax.set_ylim(0, max_val)
    ax.set_xlabel('Observed Ground Truth PM2.5 (t+1) [µg/m³]', fontsize=11, fontweight='bold')
    ax.set_ylabel('Forecasted PM2.5 (t+1) [µg/m³]', fontsize=11, fontweight='bold')
    ax.set_title('Figure 1: Observed vs. Forecasted PM2.5 (HistGradientBoosting Test Set)', fontsize=12, fontweight='bold', pad=10)
    ax.text(0.05, 0.90, f'Test MAE: {compute_metrics(y_test, pred_test_hgb, "HGB", "Test")["mae"]} µg/m³\nTest RMSE: {compute_metrics(y_test, pred_test_hgb, "HGB", "Test")["rmse"]} µg/m³\nTest R²: {compute_metrics(y_test, pred_test_hgb, "HGB", "Test")["r2"]}',
            transform=ax.transAxes, bbox=dict(boxstyle='round', facecolor='white', alpha=0.8), fontsize=10)
    ax.legend(loc='lower right', frameon=True)
    plt.tight_layout()
    fig.savefig(figures_dir / "actual_vs_predicted.png", dpi=300)
    plt.close()
    print("  Created: actual_vs_predicted.png")

    # Figure 2: Residual Distribution
    fig, ax = plt.subplots(figsize=(8, 5))
    res_persist = y_test - persist_test
    res_ridge = y_test - pred_test_ridge
    res_rf = y_test - pred_test_rf
    res_hgb = y_test - pred_test_hgb

    bins = np.linspace(-30, 30, 80)
    ax.hist(res_persist, bins=bins, alpha=0.35, color='gray', density=True, label='Persistence Baseline')
    ax.hist(res_ridge, bins=bins, alpha=0.45, color='purple', density=True, label='Ridge Regression')
    ax.hist(res_rf, bins=bins, alpha=0.45, color=c_accent, density=True, label='Random Forest')
    ax.hist(res_hgb, bins=bins, alpha=0.55, color=c_primary, density=True, label='HistGradientBoosting')
    ax.axvline(0, color='black', linestyle='--', linewidth=1.2)
    ax.set_xlim(-30, 30)
    ax.set_xlabel('Residual (Observed - Predicted) [µg/m³]', fontsize=11, fontweight='bold')
    ax.set_ylabel('Probability Density', fontsize=11, fontweight='bold')
    ax.set_title('Figure 2: Forecast Residual Distributions on Unseen Test Set', fontsize=12, fontweight='bold', pad=10)
    ax.legend(frameon=True)
    plt.tight_layout()
    fig.savefig(figures_dir / "residual_distribution.png", dpi=300)
    plt.close()
    print("  Created: residual_distribution.png")

    # Figure 3: Residual vs Predicted
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.scatter(pred_test_hgb, res_hgb, alpha=0.15, s=12, color=c_primary, edgecolors='none')
    ax.axhline(0, color='red', linestyle='--', linewidth=1.5)
    ax.set_xlim(0, max_val)
    ax.set_ylim(-40, 40)
    ax.set_xlabel('Forecasted PM2.5 [µg/m³]', fontsize=11, fontweight='bold')
    ax.set_ylabel('Residual (Observed - Predicted) [µg/m³]', fontsize=11, fontweight='bold')
    ax.set_title('Figure 3: Residual vs. Predicted Values (HistGradientBoosting Test Set)', fontsize=12, fontweight='bold', pad=10)
    plt.tight_layout()
    fig.savefig(figures_dir / "residual_vs_predicted.png", dpi=300)
    plt.close()
    print("  Created: residual_vs_predicted.png")

    # Figure 4: Model Comparison (Validation vs Test MAE & RMSE)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 5))
    models_labels = ['Persistence', 'Ridge', 'Random Forest', 'HistGradBoost']
    x = np.arange(len(models_labels))
    width = 0.35

    val_maes = [val_persist_metrics['mae'], comparison_rows[1]['mae'], comparison_rows[2]['mae'], comparison_rows[3]['mae']]
    test_maes = [test_persist_metrics['mae'], comparison_rows[5]['mae'], comparison_rows[6]['mae'], comparison_rows[7]['mae']]

    val_rmses = [val_persist_metrics['rmse'], comparison_rows[1]['rmse'], comparison_rows[2]['rmse'], comparison_rows[3]['rmse']]
    test_rmses = [test_persist_metrics['rmse'], comparison_rows[5]['rmse'], comparison_rows[6]['rmse'], comparison_rows[7]['rmse']]

    rects1 = ax1.bar(x - width/2, val_maes, width, label='Validation', color='#7293cb')
    rects2 = ax1.bar(x + width/2, test_maes, width, label='Test Holdout', color='#e1974c')
    ax1.set_ylabel('Mean Absolute Error [µg/m³]', fontsize=11, fontweight='bold')
    ax1.set_title('MAE Comparison Across Models', fontsize=12, fontweight='bold')
    ax1.set_xticks(x)
    ax1.set_xticklabels(models_labels, rotation=15, ha='right')
    ax1.legend()

    for r in rects1 + rects2:
        h = r.get_height()
        ax1.annotate(f'{h:.2f}', xy=(r.get_x() + r.get_width()/2, h), xytext=(0, 2),
                     textcoords="offset points", ha='center', va='bottom', fontsize=8)

    rects3 = ax2.bar(x - width/2, val_rmses, width, label='Validation', color='#84ba5b')
    rects4 = ax2.bar(x + width/2, test_rmses, width, label='Test Holdout', color='#d35e60')
    ax2.set_ylabel('Root Mean Squared Error [µg/m³]', fontsize=11, fontweight='bold')
    ax2.set_title('RMSE Comparison Across Models', fontsize=12, fontweight='bold')
    ax2.set_xticks(x)
    ax2.set_xticklabels(models_labels, rotation=15, ha='right')
    ax2.legend()

    for r in rects3 + rects4:
        h = r.get_height()
        ax2.annotate(f'{h:.2f}', xy=(r.get_x() + r.get_width()/2, h), xytext=(0, 2),
                     textcoords="offset points", ha='center', va='bottom', fontsize=8)

    plt.tight_layout()
    fig.savefig(figures_dir / "model_comparison.png", dpi=300)
    plt.close()
    print("  Created: model_comparison.png")

    # Figure 5: Per-Station MAE (Persistence vs HistGradientBoosting)
    fig, ax = plt.subplots(figsize=(10, 5))
    s_names_short = [r['station_name'].split(',')[0].replace('Revenue Colony-', '') for r in station_records]
    x_s = np.arange(len(s_names_short))
    w = 0.35

    p_maes = [r['persistence_mae'] for r in station_records]
    h_maes = [r['hgb_mae'] for r in station_records]

    rects_p = ax.bar(x_s - w/2, p_maes, w, label='Persistence Baseline', color='#a6bddb')
    rects_h = ax.bar(x_s + w/2, h_maes, w, label='HistGradientBoosting', color='#02818a')
    ax.set_ylabel('Test Mean Absolute Error [µg/m³]', fontsize=11, fontweight='bold')
    ax.set_title('Figure 5: Station-Wise Forecast Accuracy: HistGradientBoosting vs. Persistence', fontsize=12, fontweight='bold', pad=10)
    ax.set_xticks(x_s)
    ax.set_xticklabels(s_names_short, rotation=15, ha='right', fontsize=9)
    ax.legend()

    for r in rects_p + rects_h:
        h = r.get_height()
        ax.annotate(f'{h:.2f}', xy=(r.get_x() + r.get_width()/2, h), xytext=(0, 2),
                    textcoords="offset points", ha='center', va='bottom', fontsize=8)

    plt.tight_layout()
    fig.savefig(figures_dir / "per_station_mae.png", dpi=300)
    plt.close()
    print("  Created: per_station_mae.png")

    # Figure 6: Time-Series Forecast Example (Representative 7-Day Window at Shivajinagar)
    fig, ax = plt.subplots(figsize=(12, 5))
    s_sample = test_v[test_v['station_id'] == 11613].sort_values('datetime_utc').iloc[100:100+168]
    time_series_x = pd.to_datetime(s_sample['datetime_utc'])

    ax.plot(time_series_x, s_sample[target_col], label='Actual PM2.5 (t+1)', color='black', linewidth=1.8)
    ax.plot(time_series_x, s_sample['pred_hgb'], label='HistGradientBoosting Forecast', color=c_primary, linestyle='-', linewidth=1.4)
    ax.plot(time_series_x, s_sample['pred_persist'], label='Persistence Baseline', color='gray', linestyle=':', linewidth=1.2)
    ax.set_ylabel('PM2.5 Concentration [µg/m³]', fontsize=11, fontweight='bold')
    ax.set_xlabel('Timestamp (UTC)', fontsize=11, fontweight='bold')
    ax.set_title('Figure 6: 7-Day Dynamic Forecast Tracking at Shivajinagar Urban Core (Test Split)', fontsize=12, fontweight='bold', pad=10)
    ax.legend(loc='upper right', frameon=True)
    plt.xticks(rotation=20)
    plt.tight_layout()
    fig.savefig(figures_dir / "time_series_forecast_sample.png", dpi=300)
    plt.close()
    print("  Created: time_series_forecast_sample.png")

    # Figure 7: Top 20 Feature Importance
    fig, ax = plt.subplots(figsize=(9, 7))
    top20 = feat_imp_df.head(20).iloc[::-1]

    category_colors = {
        'PM2.5 History': '#1f77b4',
        'Weather': '#2ca02c',
        'Atmospheric Dispersion': '#17becf',
        'Temporal': '#ff7f0e',
        'Traffic': '#d62728',
        'Activity / Industrial': '#9467bd',
        'Spatial': '#8c564b',
        'Other': '#7f7f7f'
    }
    bar_colors = [category_colors.get(cat, '#333333') for cat in top20['category']]

    bars = ax.barh(top20['feature_name'], top20['rf_gini_importance'], color=bar_colors)
    ax.set_xlabel('Predictive Feature Importance (Gini Metric)', fontsize=11, fontweight='bold')
    ax.set_title('Figure 7: Top 20 Most Predictive Features for Next-Hour PM2.5 Forecasting', fontsize=12, fontweight='bold', pad=10)

    # Custom legend for categories
    handles = [plt.Rectangle((0,0),1,1, color=color) for cat, color in category_colors.items() if cat in top20['category'].values]
    labels = [cat for cat, color in category_colors.items() if cat in top20['category'].values]
    ax.legend(handles, labels, loc='lower right', title='Feature Domain', frameon=True)

    plt.tight_layout()
    fig.savefig(figures_dir / "feature_importance.png", dpi=300)
    plt.close()
    print("  Created: feature_importance.png")

    # 10. Evaluation Report JSON
    eval_report = {
        "timestamp_utc": pd.Timestamp.now(tz='UTC').isoformat(),
        "task": "Next-Hour PM2.5 Forecasting (t+1)",
        "unit": "ug/m3",
        "partitions": {
            "train": {"total_rows": len(train_df), "valid_targets": len(train_v)},
            "validation": {"total_rows": len(val_df), "valid_targets": len(val_v)},
            "test": {"total_rows": len(test_df), "valid_targets": len(test_v)}
        },
        "model_comparison": comparison_rows,
        "station_metrics": station_records,
        "subgroup_metrics": subgroups,
        "extended_pollutant_benchmark": ext_benchmarks,
        "top_features": feat_imp_df.head(20).to_dict(orient='records')
    }

    with open(results_dir / "evaluation_report.json", "w") as f:
        json.dump(eval_report, f, indent=2)
    print(f"Saved: {results_dir / 'evaluation_report.json'}")

    # 11. Write ml/results/README.md
    readme_content = f"""# Baseline ML Models Evaluation Results

**Project:** Urban Environmental Digital Twin  
**Target Variable:** Next-Hour Ambient PM2.5 (`target_pm25_t_plus_1` in $\\mu\\text{{g/m}}^3$)  
**Evaluation Grain:** Station $\\times$ Hour Holdout (`target_available == 1`)  
**Status:** Evaluation Completed Successfully  

---

## 1. Executive Summary of Results

### Overall Performance Matrix

| Model | Split | MAE ($\\mu\\text{{g/m}}^3$) | RMSE ($\\mu\\text{{g/m}}^3$) | $R^2$ | MedAE ($\\mu\\text{{g/m}}^3$) | $\\Delta$ MAE vs. Persist |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Model 0: Persistence Baseline** | Validation | {val_persist_metrics['mae']:.3f} | {val_persist_metrics['rmse']:.3f} | {val_persist_metrics['r2']:.3f} | {val_persist_metrics['medae']:.3f} | 0.000 |
| **Model 1: Standardized Ridge** | Validation | {comparison_rows[1]['mae']:.3f} | {comparison_rows[1]['rmse']:.3f} | {comparison_rows[1]['r2']:.3f} | {comparison_rows[1]['medae']:.3f} | {comparison_rows[1]['delta_mae_vs_persist']:+.3f} |
| **Model 2: Random Forest** | Validation | {comparison_rows[2]['mae']:.3f} | {comparison_rows[2]['rmse']:.3f} | {comparison_rows[2]['r2']:.3f} | {comparison_rows[2]['medae']:.3f} | {comparison_rows[2]['delta_mae_vs_persist']:+.3f} |
| **Model 3: HistGradientBoosting** | Validation | **{comparison_rows[3]['mae']:.3f}** | **{comparison_rows[3]['rmse']:.3f}** | **{comparison_rows[3]['r2']:.3f}** | **{comparison_rows[3]['medae']:.3f}** | **{comparison_rows[3]['delta_mae_vs_persist']:+.3f}** |
| **Model 0: Persistence Baseline** | Test (Holdout) | {test_persist_metrics['mae']:.3f} | {test_persist_metrics['rmse']:.3f} | {test_persist_metrics['r2']:.3f} | {test_persist_metrics['medae']:.3f} | 0.000 |
| **Model 1: Standardized Ridge** | Test (Holdout) | {comparison_rows[5]['mae']:.3f} | {comparison_rows[5]['rmse']:.3f} | {comparison_rows[5]['r2']:.3f} | {comparison_rows[5]['medae']:.3f} | {comparison_rows[5]['delta_mae_vs_persist']:+.3f} |
| **Model 2: Random Forest** | Test (Holdout) | {comparison_rows[6]['mae']:.3f} | {comparison_rows[6]['rmse']:.3f} | {comparison_rows[6]['r2']:.3f} | {comparison_rows[6]['medae']:.3f} | {comparison_rows[6]['delta_mae_vs_persist']:+.3f} |
| **Model 3: HistGradientBoosting** | Test (Holdout) | **{comparison_rows[7]['mae']:.3f}** | **{comparison_rows[7]['rmse']:.3f}** | **{comparison_rows[7]['r2']:.3f}** | **{comparison_rows[7]['medae']:.3f}** | **{comparison_rows[7]['delta_mae_vs_persist']:+.3f}** |

---

## 2. Directory Contents

* `model_comparison.csv`: Summary of primary and secondary metrics across splits and baselines.
* `station_metrics.csv`: Station-wise breakdown comparing Persistence vs. Tree Models across all 6 monitoring stations.
* `subgroup_metrics.csv`: Environmental and diurnal regime performance (Day/Night, Monsoon/Non-monsoon, Low/High PM2.5).
* `feature_importance.csv`: Complete ranking of predictive importance across 114 preprocessed features.
* `validation_predictions.csv`: Row-level predictions for all valid validation observations across all baselines.
* `test_predictions.csv`: Row-level predictions for all valid test observations across all baselines.
* `evaluation_report.json`: Machine-readable consolidated JSON evaluation report.
* `figures/`:
  - `actual_vs_predicted.png`: Figure 1 - Actual vs Predicted PM2.5 scatter plot.
  - `residual_distribution.png`: Figure 2 - Error distribution comparison.
  - `residual_vs_predicted.png`: Figure 3 - Heteroscedasticity inspection.
  - `model_comparison.png`: Figure 4 - MAE and RMSE across validation and test holdout.
  - `per_station_mae.png`: Figure 5 - Station-wise MAE comparison.
  - `time_series_forecast_sample.png`: Figure 6 - Dynamic 7-day tracking plot.
  - `feature_importance.png`: Figure 7 - Top 20 predictive features grouped by domain.
"""
    with open(results_dir / "README.md", "w") as f:
        f.write(readme_content)
    print(f"Saved: {results_dir / 'README.md'}")

    print("\n" + "=" * 75)
    print(f"ALL EVALUATION METRICS, PREDICTIONS, AND FIGURES GENERATED IN {time.time()-t_start:.2f}s")
    print("=" * 75)


if __name__ == "__main__":
    evaluate_all()
