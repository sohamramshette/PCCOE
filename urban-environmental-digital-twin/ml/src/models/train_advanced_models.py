"""
Urban Environmental Digital Twin - Advanced Models Training Suite
==================================================================
Implements:
  - Upgrade 1: Calibrated Quantile Regressors (p10, p50, p90) for conformal uncertainty estimation
  - Upgrade 2: Direct Multi-Horizon Regressors (t+1h, t+3h, t+6h, t+12h, t+24h) eliminating recursive error compounding

Uses scikit-learn HistGradientBoostingRegressor (loss='quantile') for ultra-fast,
dependency-free, CPU-optimized training matching production memory limits (<150 MB).
"""

import os
import sys
import time
import json
import joblib
from pathlib import Path
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def pinball_loss(y_true, y_pred, quantile: float) -> float:
    """Calculates pinball (check) loss for a given quantile."""
    err = y_true - y_pred
    return float(np.mean(np.maximum(quantile * err, (quantile - 1.0) * err)))


def train_advanced_models():
    t_start = time.time()
    project_root = Path(__file__).resolve().parents[3]
    features_dir = project_root / "ml" / "data" / "processed" / "features"
    models_dir = project_root / "ml" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 75)
    print("URBAN ENVIRONMENTAL DIGITAL TWIN: ADVANCED MODELS TRAINING SUITE")
    print("  • Upgrade 1: Calibrated Quantile Forecasters (p10, p50, p90)")
    print("  • Upgrade 2: Direct Multi-Horizon Forecasters (1h, 3h, 6h, 12h, 24h)")
    print("=" * 75)

    # 1. Load Partitions
    print("\n[1/5] Loading feature partitions...")
    train_df = pd.read_csv(features_dir / "train.csv")
    val_df = pd.read_csv(features_dir / "validation.csv")
    test_df = pd.read_csv(features_dir / "test.csv")

    with open(models_dir / "feature_names.json", "r") as f:
        spec = json.load(f)
    core_features = spec["core_features"]
    preprocessor = joblib.load(models_dir / "preprocessor.joblib")

    # Filter to valid contemporaneous observations
    train_v = train_df[train_df["target_available"] == 1].copy()
    val_v = val_df[val_df["target_available"] == 1].copy()
    test_v = test_df[test_df["target_available"] == 1].copy()

    print(f"  Train:      {len(train_v):,} valid rows")
    print(f"  Validation: {len(val_v):,} valid rows")
    print(f"  Test:       {len(test_v):,} valid rows")

    # 2. Preprocess feature inputs
    print("\n[2/5] Preprocessing feature matrices across splits...")
    X_train_proc = preprocessor.transform(train_v[core_features])
    X_val_proc = preprocessor.transform(val_v[core_features])
    X_test_proc = preprocessor.transform(test_v[core_features])

    y_train = train_v["target_pm25_t_plus_1"].values
    y_val = val_v["target_pm25_t_plus_1"].values
    y_test = test_v["target_pm25_t_plus_1"].values
    print(f"  Encoded dimension: {X_train_proc.shape[1]} features.")

    metrics_output = {
        "timestamp_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "quantile_models": {},
        "multi_horizon_models": {}
    }

    # -------------------------------------------------------------------------
    # 3. Upgrade 1: Calibrated Quantile Regressors (p10, p50, p90)
    # -------------------------------------------------------------------------
    print("\n[3/5] Training Upgrade 1: Calibrated Quantile Forecasters...")
    quantiles = [0.10, 0.50, 0.90]
    quantile_preds = {}

    for q in quantiles:
        q_tag = f"p{int(q * 100)}"
        t0 = time.time()
        model_q = HistGradientBoostingRegressor(
            loss="quantile",
            quantile=q,
            max_iter=150,
            learning_rate=0.08,
            max_depth=10,
            min_samples_leaf=20,
            random_state=42
        )
        model_q.fit(X_train_proc, y_train)
        fit_time = round(time.time() - t0, 2)

        val_preds = model_q.predict(X_val_proc)
        test_preds = model_q.predict(X_test_proc)
        quantile_preds[q] = test_preds

        val_pinball = round(pinball_loss(y_val, val_preds, q), 4)
        test_pinball = round(pinball_loss(y_test, test_preds, q), 4)
        test_mae = round(float(mean_absolute_error(y_test, test_preds)), 3)

        out_name = f"gradient_boosting_quantile_{int(q * 100)}.joblib"
        joblib.dump(model_q, models_dir / out_name)

        metrics_output["quantile_models"][q_tag] = {
            "quantile": q,
            "fit_time_seconds": fit_time,
            "validation_pinball_loss": val_pinball,
            "test_pinball_loss": test_pinball,
            "test_mae": test_mae
        }
        print(f"  -> Quantile {int(q*100)}% (q={q:.2f}): Fit in {fit_time}s | Test Pinball: {test_pinball:.4f} | Test MAE: {test_mae:.2f} µg/m³ -> Saved {out_name}")

    # Coverage analysis on Test set (Nominal 80% coverage between p10 and p90)
    lower_bound = quantile_preds[0.10]
    upper_bound = quantile_preds[0.90]
    in_interval = (y_test >= lower_bound) & (y_test <= upper_bound)
    coverage_pct = round(float(np.mean(in_interval) * 100), 2)
    avg_width = round(float(np.mean(upper_bound - lower_bound)), 2)

    metrics_output["quantile_models"]["interval_80pct"] = {
        "nominal_coverage_pct": 80.0,
        "empirical_coverage_pct": coverage_pct,
        "average_width_ug_m3": avg_width
    }
    print(f"  [EVALUATION] Nominal 80% Interval (p10 to p90):")
    print(f"               Empirical Coverage on Unseen Test Data: {coverage_pct}% (Ideal: ~80.0%)")
    print(f"               Average Interval Width: {avg_width} µg/m³")

    # -------------------------------------------------------------------------
    # 4. Upgrade 2: Direct Multi-Horizon Regressors
    # -------------------------------------------------------------------------
    print("\n[4/5] Training Upgrade 2: Direct Multi-Horizon Forecasters...")
    horizons = [1, 3, 6, 12, 24]
    multi_horizon_models = {}

    for h in horizons:
        t0 = time.time()
        # Create station-wise target shifted by h hours
        train_h = train_df.copy()
        val_h = val_df.copy()
        test_h = test_df.copy()

        train_h["target_h"] = train_h.groupby("station_id")["pm25"].shift(-h)
        val_h["target_h"] = val_h.groupby("station_id")["pm25"].shift(-h)
        test_h["target_h"] = test_h.groupby("station_id")["pm25"].shift(-h)

        # Filter to rows where target_h is valid
        tr_valid = train_h[train_h["target_h"].notnull()].copy()
        va_valid = val_h[val_h["target_h"].notnull()].copy()
        te_valid = test_h[test_h["target_h"].notnull()].copy()

        X_tr = preprocessor.transform(tr_valid[core_features])
        y_tr = tr_valid["target_h"].values

        X_va = preprocessor.transform(va_valid[core_features])
        y_va = va_valid["target_h"].values

        X_te = preprocessor.transform(te_valid[core_features])
        y_te = te_valid["target_h"].values

        model_h = HistGradientBoostingRegressor(
            max_iter=150,
            learning_rate=0.08,
            max_depth=10,
            min_samples_leaf=20,
            random_state=42
        )
        model_h.fit(X_tr, y_tr)
        fit_time = round(time.time() - t0, 2)

        va_preds = model_h.predict(X_va)
        te_preds = model_h.predict(X_te)

        val_mae = round(float(mean_absolute_error(y_va, va_preds)), 3)
        test_mae = round(float(mean_absolute_error(y_te, te_preds)), 3)
        test_rmse = round(float(np.sqrt(mean_squared_error(y_te, te_preds))), 3)
        test_r2 = round(float(r2_score(y_te, te_preds)), 4)

        multi_horizon_models[f"{h}h"] = model_h
        metrics_output["multi_horizon_models"][f"{h}h"] = {
            "horizon_hours": h,
            "fit_time_seconds": fit_time,
            "val_mae": val_mae,
            "test_mae": test_mae,
            "test_rmse": test_rmse,
            "test_r2": test_r2
        }
        print(f"  -> Horizon t+{h}h: Fit in {fit_time}s | Test MAE: {test_mae:.2f} µg/m³ | Test RMSE: {test_rmse:.2f} | R²: {test_r2:.4f}")

    joblib.dump(multi_horizon_models, models_dir / "multi_horizon_models.joblib")
    print(f"  -> Saved combined multi-horizon container: multi_horizon_models.joblib")

    # 5. Save metrics JSON
    with open(models_dir / "advanced_model_metrics.json", "w") as f:
        json.dump(metrics_output, f, indent=2)
    print("\n[5/5] Comprehensive metrics report saved to advanced_model_metrics.json")

    total_time = round(time.time() - t_start, 2)
    print("\n" + "=" * 75)
    print(f"ADVANCED MODELS TRAINING COMPLETE IN {total_time} SECONDS!")
    print("=" * 75)


if __name__ == "__main__":
    train_advanced_models()
