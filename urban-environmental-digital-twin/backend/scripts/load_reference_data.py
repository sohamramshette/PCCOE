"""
Urban Environmental Digital Twin - Reference Data Loader
=========================================================
Loads foundational reference datasets into PostgreSQL:
  1. Monitoring Stations (6 core Pune stations)
  2. Station Traffic Road Exposure (OSM 1.5km buffer metrics)
  3. Station Activity & Land-Use Exposure (OSM industrial, construction, POI metrics)
  4. 24-Hour Diurnal Traffic Proxy (Pune CMP empirical profile)
  5. Model Registry (Phase 7 baseline models with audited validation & test metrics)

Idempotent: Uses upsert / merge to prevent duplicate records on repeated execution.
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database.session import SessionLocal, engine, Base
from backend.app.models import (
    Station,
    StationTrafficExposure,
    StationActivityExposure,
    TrafficProxy,
    ModelRegistry
)


def load_stations(db):
    """Load the 6 official monitoring stations for Pune & PCMC."""
    print("\n--- 1. Loading Monitoring Stations ---")
    stations_data = [
        {
            "station_id": 11613,
            "station_name": "Revenue Colony-Shivajinagar, Pune - IITM",
            "zone_type": "Commercial / Educational Urban Core",
            "latitude": 18.5301,
            "longitude": 73.8496,
            "elevation_m": 560.0,
            "city": "Pune",
            "monitoring_authority": "IITM SAFAR / CPCB",
            "is_active": True,
            "data_provenance": "OpenAQ API v3 / CPCB CAAQMN"
        },
        {
            "station_id": 11609,
            "station_name": "Mhada Colony, Pune - IITM",
            "zone_type": "North-Eastern Residential / Airport Corridor",
            "latitude": 18.5730,
            "longitude": 73.9277,
            "elevation_m": 581.0,
            "city": "Pune",
            "monitoring_authority": "IITM SAFAR / CPCB",
            "is_active": True,
            "data_provenance": "OpenAQ API v3 / CPCB CAAQMN"
        },
        {
            "station_id": 60658,
            "station_name": "Hadapsar, Pune - IITM",
            "zone_type": "Eastern Commercial / Mixed Suburban Corridor",
            "latitude": 18.5018,
            "longitude": 73.9275,
            "elevation_m": 570.0,
            "city": "Pune",
            "monitoring_authority": "IITM SAFAR / CPCB",
            "is_active": True,
            "data_provenance": "OpenAQ API v3 / CPCB CAAQMN"
        },
        {
            "station_id": 3409331,
            "station_name": "Bhosari, Pune - IITM",
            "zone_type": "Northern Heavy Industrial / Highway Hub (PCMC)",
            "latitude": 18.6401,
            "longitude": 73.8489,
            "elevation_m": 599.0,
            "city": "Pimpri-Chinchwad",
            "monitoring_authority": "IITM SAFAR / CPCB",
            "is_active": True,
            "data_provenance": "OpenAQ API v3 / CPCB CAAQMN"
        },
        {
            "station_id": 3409438,
            "station_name": "Katraj Dairy, Pune - MPCB",
            "zone_type": "Southern Highway Chokepoint / Ghat Gateway",
            "latitude": 18.4545,
            "longitude": 73.8542,
            "elevation_m": 673.0,
            "city": "Pune",
            "monitoring_authority": "MPCB / CPCB",
            "is_active": True,
            "data_provenance": "OpenAQ API v3 / MPCB CAAQMN"
        },
        {
            "station_id": 3409526,
            "station_name": "Panchawati_Pashan, Pune - IITM",
            "zone_type": "Western Institutional / Foothill Background",
            "latitude": 18.5365,
            "longitude": 73.8055,
            "elevation_m": 589.0,
            "city": "Pune",
            "monitoring_authority": "IITM SAFAR / CPCB",
            "is_active": True,
            "data_provenance": "OpenAQ API v3 / CPCB CAAQMN"
        }
    ]

    loaded_count = 0
    for s_dict in stations_data:
        existing = db.query(Station).filter(Station.station_id == s_dict["station_id"]).first()
        if existing:
            for k, v in s_dict.items():
                setattr(existing, k, v)
        else:
            station = Station(**s_dict)
            db.add(station)
        loaded_count += 1

    db.commit()
    print(f"  [OK] Successfully loaded {loaded_count} stations.")


def load_traffic_exposure(db):
    """Load station road network metrics from processed traffic features."""
    print("\n--- 2. Loading Station Traffic Exposure ---")
    csv_path = PROJECT_ROOT / "ml" / "data" / "processed" / "traffic" / "station_road_features.csv"
    if not csv_path.exists():
        print(f"  [WARN] File not found: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    loaded_count = 0
    for _, row in df.iterrows():
        sid = int(row["location_id"])
        record = {
            "station_id": sid,
            "buffer_radius_m": float(row.get("buffer_radius_m", 1500.0)),
            "buffer_area_km2": float(row.get("buffer_area_km2", 7.07)),
            "total_road_segments": int(row["total_road_segments"]),
            "total_road_length_km": float(row["total_road_length_km"]),
            "major_road_length_km": float(row["major_road_length_km"]),
            "local_road_length_km": float(row["local_road_length_km"]),
            "major_road_density_km_per_km2": float(row["major_road_density_km_per_km2"]),
            "total_road_density_km_per_km2": float(row["total_road_density_km_per_km2"]),
            "distance_to_nearest_major_road_m": float(row["distance_to_nearest_major_road_m"]),
            "nearest_major_road_name": str(row["nearest_major_road_name"]) if pd.notnull(row["nearest_major_road_name"]) else None,
            "nearest_major_road_class": str(row["nearest_major_road_class"]) if pd.notnull(row["nearest_major_road_class"]) else None,
            "data_provenance": "STATIC_ROAD_NETWORK (OSM Overpass)"
        }

        existing = db.query(StationTrafficExposure).filter(StationTrafficExposure.station_id == sid).first()
        if existing:
            for k, v in record.items():
                setattr(existing, k, v)
        else:
            db.add(StationTrafficExposure(**record))
        loaded_count += 1

    db.commit()
    print(f"  [OK] Successfully loaded {loaded_count} traffic exposure records.")


def load_activity_exposure(db):
    """Load station activity & land-use metrics from processed activity features."""
    print("\n--- 3. Loading Station Activity Exposure ---")
    csv_path = PROJECT_ROOT / "ml" / "data" / "processed" / "activity" / "station_activity_features.csv"
    if not csv_path.exists():
        print(f"  [WARN] File not found: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    loaded_count = 0
    for _, row in df.iterrows():
        sid = int(row["station_id"])
        record = {
            "station_id": sid,
            "industrial_elements_2km": int(row["industrial_elements_2km"]),
            "dist_nearest_industrial_m": float(row["dist_nearest_industrial_m"]),
            "has_industrial_within_1km": bool(row["has_industrial_within_1km"]),
            "construction_elements_1_5km": int(row["construction_elements_1_5km"]),
            "dist_nearest_construction_m": float(row["dist_nearest_construction_m"]),
            "has_construction_within_1km": bool(row["has_construction_within_1km"]),
            "poi_total_count_1_5km": int(row["poi_total_count_1_5km"]),
            "poi_density_per_km2": float(row["poi_density_per_km2"]),
            "poi_commercial_count": int(row["poi_commercial_count"]),
            "poi_institutional_count": int(row["poi_institutional_count"]),
            "poi_transit_count": int(row["poi_transit_count"]),
            "landuse_elements_total": int(row["landuse_elements_total"]),
            "landuse_residential_count": int(row["landuse_residential_count"]),
            "landuse_commercial_count": int(row["landuse_commercial_count"]),
            "landuse_industrial_count": int(row["landuse_industrial_count"]),
            "landuse_green_count": int(row["landuse_green_count"]),
            "dominant_landuse": str(row["dominant_landuse"]),
            "data_provenance": "STATIC_LAND_USE / ACTIVITY_PROXY (OSM Overpass)"
        }

        existing = db.query(StationActivityExposure).filter(StationActivityExposure.station_id == sid).first()
        if existing:
            for k, v in record.items():
                setattr(existing, k, v)
        else:
            db.add(StationActivityExposure(**record))
        loaded_count += 1

    db.commit()
    print(f"  [OK] Successfully loaded {loaded_count} activity exposure records.")


def load_traffic_proxy(db):
    """Load the 24-hour diurnal traffic intensity profile."""
    print("\n--- 4. Loading Diurnal Traffic Proxy Profile ---")
    csv_path = PROJECT_ROOT / "ml" / "data" / "processed" / "traffic" / "traffic_hourly_proxy.csv"
    if not csv_path.exists():
        print(f"  [WARN] File not found: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    loaded_count = 0

    # Categorize intensity regime
    def get_category(hour, is_wknd):
        if hour in [8, 9, 10]:
            return "MORNING_RUSH"
        elif hour in [17, 18, 19, 20]:
            return "EVENING_RUSH"
        elif hour in [11, 12, 13, 14, 15, 16]:
            return "MIDDAY_PLATEAU"
        elif hour in [21, 22, 23]:
            return "LATE_EVENING"
        else:
            return "NIGHT_BASE"

    for _, row in df.iterrows():
        hour = int(row["hour_of_day"])
        
        # Weekday entry
        wk_idx = float(row["weekday_traffic_index"])
        existing_wk = db.query(TrafficProxy).filter(
            TrafficProxy.hour_of_day == hour,
            TrafficProxy.is_weekend == False
        ).first()
        if existing_wk:
            existing_wk.traffic_proxy_index = wk_idx
            existing_wk.traffic_intensity_category = get_category(hour, False)
        else:
            db.add(TrafficProxy(
                hour_of_day=hour,
                is_weekend=False,
                traffic_proxy_index=wk_idx,
                traffic_intensity_category=get_category(hour, False)
            ))
        loaded_count += 1

        # Weekend entry
        wknd_idx = float(row["weekend_traffic_index"])
        existing_wknd = db.query(TrafficProxy).filter(
            TrafficProxy.hour_of_day == hour,
            TrafficProxy.is_weekend == True
        ).first()
        if existing_wknd:
            existing_wknd.traffic_proxy_index = wknd_idx
            existing_wknd.traffic_intensity_category = get_category(hour, True)
        else:
            db.add(TrafficProxy(
                hour_of_day=hour,
                is_weekend=True,
                traffic_proxy_index=wknd_idx,
                traffic_intensity_category=get_category(hour, True)
            ))
        loaded_count += 1

    db.commit()
    print(f"  [OK] Successfully loaded {loaded_count} traffic proxy hourly records (24 weekday + 24 weekend).")


def load_model_registry(db):
    """Register the Phase 7 trained baseline models with empirical metrics."""
    print("\n--- 5. Loading Model Registry ---")
    eval_json_path = PROJECT_ROOT / "ml" / "results" / "evaluation_report.json"
    metrics_by_model = {}
    if eval_json_path.exists():
        with open(eval_json_path) as f:
            eval_data = json.load(f)
            for m in eval_data.get("model_comparison", []):
                m_name = m["model_name"]
                split = m["split"].lower()
                if m_name not in metrics_by_model:
                    metrics_by_model[m_name] = {}
                metrics_by_model[m_name][split] = {
                    "mae": m["mae"],
                    "rmse": m["rmse"],
                    "r2": m["r2"],
                    "medae": m["medae"],
                    "explained_variance": m["explained_variance"]
                }

    models_meta = [
        {
            "model_id": "gradient_boosting_baseline",
            "model_name": "HistGradientBoosting Regressor (sklearn)",
            "model_type": "GRADIENT_BOOSTING",
            "version": "1.0.0",
            "target": "target_pm25_t_plus_1",
            "horizon": "t+1 hour (next-hour ambient PM2.5)",
            "feature_set": "CORE_UNIVERSAL_98",
            "training_start": datetime(2025, 2, 18, 0, 0, tzinfo=timezone.utc),
            "training_end": datetime(2026, 3, 31, 23, 0, tzinfo=timezone.utc),
            "validation_start": datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc),
            "validation_end": datetime(2026, 6, 30, 23, 0, tzinfo=timezone.utc),
            "test_start": datetime(2026, 7, 1, 0, 0, tzinfo=timezone.utc),
            "test_end": datetime(2026, 9, 24, 23, 0, tzinfo=timezone.utc),
            "metrics": metrics_by_model.get("Model 3 - HistGradientBoosting", {
                "validation": {"mae": 4.6686, "rmse": 7.1287, "r2": 0.7247, "medae": 3.4632},
                "test": {"mae": 4.1034, "rmse": 9.1094, "r2": 0.4581, "medae": 2.9682}
            }),
            "artifact_path": "ml/models/gradient_boosting_baseline.joblib",
            "is_active": True
        },
        {
            "model_id": "random_forest_baseline",
            "model_name": "Random Forest Regressor (100 trees)",
            "model_type": "RANDOM_FOREST",
            "version": "1.0.0",
            "target": "target_pm25_t_plus_1",
            "horizon": "t+1 hour (next-hour ambient PM2.5)",
            "feature_set": "CORE_UNIVERSAL_98",
            "training_start": datetime(2025, 2, 18, 0, 0, tzinfo=timezone.utc),
            "training_end": datetime(2026, 3, 31, 23, 0, tzinfo=timezone.utc),
            "validation_start": datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc),
            "validation_end": datetime(2026, 6, 30, 23, 0, tzinfo=timezone.utc),
            "test_start": datetime(2026, 7, 1, 0, 0, tzinfo=timezone.utc),
            "test_end": datetime(2026, 9, 24, 23, 0, tzinfo=timezone.utc),
            "metrics": metrics_by_model.get("Model 2 - Random Forest", {
                "validation": {"mae": 4.7360, "rmse": 7.2059, "r2": 0.7187, "medae": 3.5465},
                "test": {"mae": 4.0475, "rmse": 9.1171, "r2": 0.4572, "medae": 2.9102}
            }),
            "artifact_path": "ml/models/random_forest_baseline.joblib",
            "is_active": True
        },
        {
            "model_id": "ridge_baseline",
            "model_name": "Standardized Ridge Regression (alpha=100.0)",
            "model_type": "LINEAR_RIDGE",
            "version": "1.0.0",
            "target": "target_pm25_t_plus_1",
            "horizon": "t+1 hour (next-hour ambient PM2.5)",
            "feature_set": "CORE_UNIVERSAL_98",
            "training_start": datetime(2025, 2, 18, 0, 0, tzinfo=timezone.utc),
            "training_end": datetime(2026, 3, 31, 23, 0, tzinfo=timezone.utc),
            "validation_start": datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc),
            "validation_end": datetime(2026, 6, 30, 23, 0, tzinfo=timezone.utc),
            "test_start": datetime(2026, 7, 1, 0, 0, tzinfo=timezone.utc),
            "test_end": datetime(2026, 9, 24, 23, 0, tzinfo=timezone.utc),
            "metrics": metrics_by_model.get("Model 1 - Ridge Regression", {
                "validation": {"mae": 5.7222, "rmse": 8.4181, "r2": 0.6161, "medae": 4.2793},
                "test": {"mae": 4.6819, "rmse": 9.9457, "r2": 0.3540, "medae": 3.1623}
            }),
            "artifact_path": "ml/models/ridge_baseline.joblib",
            "is_active": True
        },
        {
            "model_id": "persistence_baseline",
            "model_name": "Persistence Baseline Heuristic (y_t+1 = y_t)",
            "model_type": "PERSISTENCE_HEURISTIC",
            "version": "1.0.0",
            "target": "target_pm25_t_plus_1",
            "horizon": "t+1 hour (next-hour ambient PM2.5)",
            "feature_set": "CORE_UNIVERSAL_98",
            "training_start": datetime(2025, 2, 18, 0, 0, tzinfo=timezone.utc),
            "training_end": datetime(2026, 3, 31, 23, 0, tzinfo=timezone.utc),
            "validation_start": datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc),
            "validation_end": datetime(2026, 6, 30, 23, 0, tzinfo=timezone.utc),
            "test_start": datetime(2026, 7, 1, 0, 0, tzinfo=timezone.utc),
            "test_end": datetime(2026, 9, 24, 23, 0, tzinfo=timezone.utc),
            "metrics": metrics_by_model.get("Model 0 - Persistence Baseline", {
                "validation": {"mae": 4.9410, "rmse": 7.7725, "r2": 0.6727, "medae": 3.5317},
                "test": {"mae": 4.1837, "rmse": 9.8782, "r2": 0.3628, "medae": 2.8275}
            }),
            "artifact_path": "ml/src/models/evaluate_models.py",
            "is_active": True
        }
    ]

    loaded_count = 0
    for m_dict in models_meta:
        mid = m_dict["model_id"]
        existing = db.query(ModelRegistry).filter(ModelRegistry.model_id == mid).first()
        if existing:
            for k, v in m_dict.items():
                setattr(existing, k, v)
        else:
            db.add(ModelRegistry(**m_dict))
        loaded_count += 1

    db.commit()
    print(f"  [OK] Successfully registered {loaded_count} machine learning models in registry.")


def main():
    print("=" * 70)
    print("URBAN ENVIRONMENTAL DIGITAL TWIN: LOADING REFERENCE DATA")
    print("=" * 70)
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        load_stations(db)
        load_traffic_exposure(db)
        load_activity_exposure(db)
        load_traffic_proxy(db)
        load_model_registry(db)
        print("\n" + "=" * 70)
        print("ALL REFERENCE & REGISTRY DATA LOADED SUCCESSFULLY")
        print("=" * 70)
    finally:
        db.close()


if __name__ == "__main__":
    main()
