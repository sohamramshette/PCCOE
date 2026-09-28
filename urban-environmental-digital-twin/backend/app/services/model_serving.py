"""
Urban Environmental Digital Twin - Model Serving Manager
========================================================
Manages pre-loaded model artifacts and scikit-learn preprocessors in memory.
Artifacts are loaded once during application startup (in app lifespan)
to avoid costly file I/O on inference requests.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
import shap
from backend.app.config.settings import settings

logger = logging.getLogger("model_serving")


class ModelServingManager:
    _instance: Optional["ModelServingManager"] = None

    def __init__(self):
        self.is_initialized: bool = False
        self.models_dir: Path = settings.MODELS_DIR
        self.feature_meta: Dict[str, Any] = {}
        self.core_features: List[str] = []
        self.preprocessor: Any = None
        self.loaded_models: Dict[str, Any] = {}
        self.default_model_id: str = settings.DEFAULT_FORECAST_MODEL_ID

    @classmethod
    def get_instance(cls) -> "ModelServingManager":
        """Singleton accessor for the model serving manager."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def initialize(self, models_dir: Optional[Path] = None) -> None:
        """Loads feature specifications, preprocessor, and baseline model artifacts into memory."""
        if models_dir is not None:
            self.models_dir = models_dir

        logger.info(f"Initializing ModelServingManager from artifact directory: {self.models_dir}")

        # 1. Load feature names specification
        feat_path = self.models_dir / "feature_names.json"
        if feat_path.exists():
            try:
                with open(feat_path, "r", encoding="utf-8") as f:
                    self.feature_meta = json.load(f)
                self.core_features = self.feature_meta.get("core_features", [])
                logger.info(f"Loaded feature specification: {len(self.core_features)} core features.")
            except Exception as e:
                logger.error(f"Failed to parse feature_names.json: {e}")
        else:
            logger.warning(f"Feature metadata file not found at: {feat_path}")

        # 2. Load fitted scikit-learn ColumnTransformer preprocessor
        prep_path = self.models_dir / "preprocessor.joblib"
        if prep_path.exists():
            try:
                self.preprocessor = joblib.load(prep_path)
                logger.info("Loaded scikit-learn ColumnTransformer preprocessor.")
            except Exception as e:
                logger.error(f"Failed to load preprocessor.joblib: {e}")
        else:
            logger.warning(f"Preprocessor artifact not found at: {prep_path}")

        # 3. Load baseline model artifacts
        artifact_map = {
            "gradient_boosting_baseline": "gradient_boosting_baseline.joblib",
            "random_forest_baseline": "random_forest_baseline.joblib",
            "ridge_baseline": "ridge_baseline.joblib",
        }

        for model_id, filename in artifact_map.items():
            model_path = self.models_dir / filename
            if model_path.exists():
                try:
                    self.loaded_models[model_id] = joblib.load(model_path)
                    logger.info(f"Loaded model artifact '{model_id}' from {filename}.")
                except Exception as e:
                    logger.error(f"Failed to load model {model_id} ({filename}): {e}")
            else:
                logger.warning(f"Model artifact {filename} not found at {model_path}.")

        # Register non-parametric persistence heuristic
        self.loaded_models["persistence_baseline"] = "HEURISTIC_PERSISTENCE"
        logger.info("Registered heuristic persistence model.")

        self.is_initialized = True
        logger.info(f"ModelServingManager initialized with models: {list(self.loaded_models.keys())}")

    def is_model_available(self, model_id: str) -> bool:
        """Checks if a requested model identifier is loaded and available for serving."""
        return model_id in self.loaded_models

    def predict(self, model_id: str, feature_df: pd.DataFrame) -> float:
        """
        Executes model inference on a single-row feature DataFrame.
        Ensures feature transformation matches Phase 7 evaluation pipeline.
        """
        if not self.is_model_available(model_id):
            raise ValueError(f"Requested model '{model_id}' is not loaded in model serving registry.")

        # Handle persistence baseline
        if model_id == "persistence_baseline":
            pm25_val = feature_df["pm25"].iloc[0]
            if pd.notna(pm25_val):
                return round(float(pm25_val), 2)
            # Fallbacks through lag sequence
            for lag in [1, 2, 3]:
                lag_col = f"pm25_lag_{lag}h"
                if lag_col in feature_df.columns and pd.notna(feature_df[lag_col].iloc[0]):
                    return round(float(feature_df[lag_col].iloc[0]), 2)
            return 18.50  # Historical training median fallback

        if self.preprocessor is None:
            raise RuntimeError("Cannot serve predictions: Feature preprocessor is not loaded.")

        model = self.loaded_models[model_id]

        # Verify all core features are present in the DataFrame
        missing_feats = [col for col in self.core_features if col not in feature_df.columns]
        if missing_feats:
            raise ValueError(f"Feature DataFrame missing required core features: {missing_feats[:5]}...")

        # Transform features through fitted ColumnTransformer
        X_proc = self.preprocessor.transform(feature_df[self.core_features])

        # Predict
        raw_pred = model.predict(X_proc)
        prediction_val = float(raw_pred[0])

        # Physical boundary: PM2.5 concentration cannot be negative
        bounded_pred = max(0.0, prediction_val)
        return round(bounded_pred, 2)

    def explain_prediction(self, model_id: str, feature_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Returns the top SHAP-style feature contributions for a single forecast instance."""
        if model_id == "persistence_baseline":
            return []

        if not self.is_model_available(model_id):
            raise ValueError(f"Requested model '{model_id}' is not loaded in model serving registry.")

        if self.preprocessor is None:
            return []

        missing_feats = [col for col in self.core_features if col not in feature_df.columns]
        if missing_feats:
            return []

        try:
            model = self.loaded_models[model_id]
            X_proc = self.preprocessor.transform(feature_df[self.core_features])
            X_proc_dense = X_proc.toarray() if hasattr(X_proc, "toarray") else X_proc

            # Tree-based ensembles need a tree-aware explainer. For HistGradientBoosting
            # and forest regressors, the generic SHAP Explainer uses the same single-row
            # sample as both background and input, which collapses contributions to zero.
            model_name = type(model).__name__.lower()
            tree_model = (
                hasattr(model, "estimators_")
                or hasattr(model, "tree_")
                or "forest" in model_name
                or "tree" in model_name
                or "gradientboosting" in model_name
                or "histgradientboosting" in model_name
                or "randomforest" in model_name
                or "decisiontree" in model_name
            )

            if tree_model:
                shap_values = shap.TreeExplainer(model).shap_values(X_proc_dense)
                if isinstance(shap_values, list):
                    shap_values = shap_values[0]
                values = np.asarray(shap_values)
            else:
                explainer = shap.Explainer(model, X_proc_dense)
                shap_values = explainer(X_proc_dense, check_additivity=False)
                values = shap_values.values

            if values is None:
                return []

            values_arr = np.asarray(values)
            if values_arr.ndim == 0:
                return []
            row_contrib = values_arr[0] if values_arr.ndim > 1 else values_arr
            if row_contrib.size == 0:
                return []

            feature_names = list(self.preprocessor.get_feature_names_out())
            max_feature_count = min(len(feature_names), row_contrib.shape[0])
            attributions = []
            for index in range(max_feature_count):
                feature_name = feature_names[index]
                contribution = float(row_contrib[index])
                if np.isnan(contribution):
                    continue
                attributions.append({
                    "feature": str(feature_name),
                    "contribution": round(contribution, 4),
                    "direction": "positive" if contribution >= 0 else "negative",
                })

            attributions.sort(key=lambda item: abs(item["contribution"]), reverse=True)
            return attributions[:8]
        except Exception as exc:
            logger.warning(f"Unable to compute SHAP feature attributions for model '{model_id}': {exc}")
            return []


model_serving = ModelServingManager.get_instance()
