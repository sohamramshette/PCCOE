"""
Urban Environmental Digital Twin - Phase 7 Experiment Orchestrator
===================================================================
Executes end-to-end Phase 7 baseline training and comprehensive evaluation.
Keeps stages logically separated:
  1. train_baselines.py
  2. evaluate_models.py

Usage:
  python ml/src/models/run_baseline_experiments.py
"""

import sys
import time
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.src.models.train_baselines import train_baselines
from ml.src.models.evaluate_models import evaluate_all


def main():
    t_start = time.time()
    print("=" * 80)
    print("URBAN ENVIRONMENTAL DIGITAL TWIN: PHASE 7 EXPERIMENT ORCHESTRATION")
    print("=" * 80)

    data_dir = PROJECT_ROOT / "ml" / "data" / "processed" / "features"
    models_dir = PROJECT_ROOT / "ml" / "models"

    print("\n>>> STAGE 1: TRAINING BASELINE MODELS & PREPROCESSORS <<<")
    train_baselines(data_dir, models_dir)

    print("\n>>> STAGE 2: EVALUATING MODELS, RESIDUALS, SUBGROUPS & FIGURES <<<")
    evaluate_all()

    print("\n" + "=" * 80)
    print(f"PHASE 7 COMPLETE: ALL BASELINES TRAINED & EVALUATED IN {time.time()-t_start:.2f}s")
    print("=" * 80)


if __name__ == "__main__":
    main()
