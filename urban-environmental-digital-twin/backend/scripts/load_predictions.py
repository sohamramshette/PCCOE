"""
Urban Environmental Digital Twin - Model Predictions Loader
============================================================
Loads evaluation predictions from Phase 7 (Validation and Test splits) into
the model_predictions database table. Supports future inference predictions.
"""

import sys
import time
import argparse
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database.session import SessionLocal, engine, Base
from backend.app.models import ModelPrediction, ModelRegistry, Station


MODEL_NAME_MAP = {
    "HistGradientBoosting": "gradient_boosting_baseline",
    "Random Forest": "random_forest_baseline",
    "Ridge Regression": "ridge_baseline",
    "Persistence Baseline": "persistence_baseline"
}


def load_prediction_file(db, csv_path: Path, split_name: str, limit: int = None, chunk_size: int = 5000):
    if not csv_path.exists():
        print(f"  [WARN] Predictions file not found: {csv_path}")
        return 0

    print(f"\nLoading {split_name} predictions from: {csv_path.name}")
    chunk_iter = pd.read_csv(csv_path, chunksize=chunk_size)
    total_inserted = 0

    for chunk in chunk_iter:
        if limit and total_inserted >= limit:
            break
        if limit and total_inserted + len(chunk) > limit:
            chunk = chunk.iloc[:limit - total_inserted]

        mappings = []
        for _, row in chunk.iterrows():
            m_name = row["model_name"]
            model_id = MODEL_NAME_MAP.get(m_name, m_name.lower().replace(" ", "_"))

            target_dt_str = row["datetime_utc"]
            target_dt = datetime.fromisoformat(target_dt_str.replace("Z", "+00:00"))
            # Horizon is 1 hour, so prediction initialization time is t - 1h
            pred_dt = target_dt - timedelta(hours=1)

            mappings.append({
                "model_id": model_id,
                "station_id": int(row["station_id"]),
                "prediction_time_utc": pred_dt,
                "target_time_utc": target_dt,
                "horizon_hours": 1,
                "predicted_pm25": float(row["predicted_pm25"]),
                "actual_pm25": float(row["actual_pm25"]) if pd.notnull(row.get("actual_pm25")) else None,
                "split": split_name.upper()
            })

        db.bulk_insert_mappings(ModelPrediction, mappings)
        db.commit()
        total_inserted += len(mappings)

    print(f"  [OK] Successfully loaded {total_inserted:,} {split_name} predictions.")
    return total_inserted


def main(limit: int = None):
    t0 = time.time()
    print("=" * 75)
    print("URBAN ENVIRONMENTAL DIGITAL TWIN: LOADING MODEL PREDICTIONS")
    print("=" * 75)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        val_csv = PROJECT_ROOT / "ml" / "results" / "validation_predictions.csv"
        test_csv = PROJECT_ROOT / "ml" / "results" / "test_predictions.csv"

        n_val = load_prediction_file(db, val_csv, "VALIDATION", limit=limit)
        n_test = load_prediction_file(db, test_csv, "TEST", limit=limit)

        total_preds = db.query(ModelPrediction).count()
        print("\n" + "=" * 75)
        print(f"PREDICTIONS LOADING COMPLETE IN {time.time()-t0:.2f}s")
        print(f"  Total Predictions in Database: {total_preds:,}")
        print("=" * 75)

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load model predictions into DB")
    parser.add_argument("--limit", type=int, default=None, help="Optional maximum rows to load")
    args = parser.parse_args()
    main(limit=args.limit)
