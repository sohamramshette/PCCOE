"""
Urban Environmental Digital Twin - Observations & Weather Data Loader
======================================================================
Loads hourly observed air quality observations and ERA5-Land weather reanalysis
records from the canonical integrated master dataset into PostgreSQL:
  - environmental_observations table (ground truth PM2.5 + co-pollutants)
  - weather_reanalysis table (meteorology + dispersion parameters)

Idempotent: Uses batch mapping insertion and preserves NULLs strictly.
"""

import sys
import time
import argparse
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database.session import SessionLocal, engine, Base
from backend.app.models import (
    Station,
    EnvironmentalObservation,
    WeatherReanalysis
)


def clean_val(val):
    """Convert numpy / pandas NaN to Python None for SQL NULL preservation."""
    if pd.isna(val):
        return None
    return val


def load_observations_and_weather(limit: int = None, chunk_size: int = 5000):
    t0 = time.time()
    csv_path = PROJECT_ROOT / "ml" / "data" / "processed" / "integration" / "master_hourly_dataset.csv"
    if not csv_path.exists():
        print(f"Error: master_hourly_dataset.csv not found at {csv_path}")
        return

    print("=" * 75)
    print("URBAN ENVIRONMENTAL DIGITAL TWIN: LOADING HOURLY OBSERVATIONS & WEATHER")
    print("=" * 75)
    print(f"Reading from: {csv_path.name}")
    if limit:
        print(f"Processing limit: {limit:,} rows")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check existing row counts
        existing_obs = db.query(EnvironmentalObservation).count()
        existing_wx = db.query(WeatherReanalysis).count()
        print(f"Initial table counts -> Observations: {existing_obs:,} | Weather: {existing_wx:,}")

        # If data already loaded and no limit, report
        if existing_obs > 0 and limit is None:
            print("Existing data detected. Loading in append / idempotent mode...")

        total_obs_inserted = 0
        total_wx_inserted = 0
        rows_processed = 0

        # Read CSV in chunks
        chunk_iter = pd.read_csv(csv_path, chunksize=chunk_size)

        for chunk_idx, df in enumerate(chunk_iter):
            if limit and rows_processed >= limit:
                break
            
            if limit and rows_processed + len(df) > limit:
                df = df.iloc[:limit - rows_processed]

            obs_mappings = []
            wx_mappings = []

            for _, row in df.iterrows():
                dt_utc_str = row["datetime_utc"]
                dt_utc = datetime.fromisoformat(dt_utc_str.replace("Z", "+00:00"))
                
                dt_ist_str = row["datetime_local_ist"]
                dt_ist = datetime.fromisoformat(dt_ist_str)

                sid = int(row["station_id"])

                # 1. Environmental Observation mapping
                obs_mappings.append({
                    "station_id": sid,
                    "datetime_utc": dt_utc,
                    "datetime_local_ist": dt_ist,
                    "pm25": clean_val(row.get("pm25")),
                    "pm25_obs_count": int(row["pm25_obs_count"]) if pd.notnull(row.get("pm25_obs_count")) else None,
                    "pm25_completeness_flag": str(row.get("pm25_completeness_flag", "MISSING")),
                    "pm10": clean_val(row.get("pm10")),
                    "pm10_obs_count": int(row["pm10_obs_count"]) if pd.notnull(row.get("pm10_obs_count")) else None,
                    "no2": clean_val(row.get("no2")),
                    "no2_obs_count": int(row["no2_obs_count"]) if pd.notnull(row.get("no2_obs_count")) else None,
                    "so2": clean_val(row.get("so2")),
                    "co": clean_val(row.get("co")),
                    "o3": clean_val(row.get("o3")),
                    "temp_insitu_c": clean_val(row.get("temp_insitu_c")),
                    "humidity_insitu_pct": clean_val(row.get("humidity_insitu_pct")),
                    "wind_speed_insitu_ms": clean_val(row.get("wind_speed_insitu_ms")),
                    "data_provenance": "OBSERVED"
                })

                # 2. Weather Reanalysis mapping
                wx_mappings.append({
                    "station_id": sid,
                    "datetime_utc": dt_utc,
                    "temp_c": float(row["temp_c"]),
                    "humidity_pct": float(row["humidity_pct"]),
                    "dew_point_c": float(row["dew_point_c"]),
                    "precip_mm": float(row["precip_mm"]),
                    "rain_mm": float(row["rain_mm"]),
                    "pressure_hpa": float(row["pressure_hpa"]),
                    "wind_speed_ms": float(row["wind_speed_ms"]),
                    "wind_dir_deg": float(row["wind_dir_deg"]),
                    "solar_rad_wm2": float(row["solar_rad_wm2"]),
                    "cloud_cover_pct": float(row["cloud_cover_pct"]),
                    "pbl_height_m": float(row["pbl_height_m"]),
                    "grid_latitude": float(row["weather_grid_latitude"]),
                    "grid_longitude": float(row["weather_grid_longitude"]),
                    "elevation_m": float(row["weather_elevation_m"]),
                    "data_provenance": "REANALYSIS (ECMWF ERA5-Land via Open-Meteo)"
                })

            # Bulk insert mappings
            db.bulk_insert_mappings(EnvironmentalObservation, obs_mappings)
            db.bulk_insert_mappings(WeatherReanalysis, wx_mappings)
            db.commit()

            total_obs_inserted += len(obs_mappings)
            total_wx_inserted += len(wx_mappings)
            rows_processed += len(df)

            print(f"  Chunk {chunk_idx + 1:3d}: Processed {rows_processed:6,d} rows... ({time.time()-t0:.1f}s)")

        final_obs = db.query(EnvironmentalObservation).count()
        final_wx = db.query(WeatherReanalysis).count()
        print("\n" + "=" * 75)
        print(f"LOADING COMPLETE IN {time.time()-t0:.2f}s")
        print(f"  Total Rows Processed:                {rows_processed:,}")
        print(f"  Environmental Observations in DB:   {final_obs:,}")
        print(f"  Weather Reanalysis Records in DB:    {final_wx:,}")
        print("=" * 75)

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Transaction rolled back due to error: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load master hourly observations and weather into DB")
    parser.add_argument("--limit", type=int, default=None, help="Optional maximum rows to ingest for quick verification")
    parser.add_argument("--chunk-size", type=int, default=10000, help="Batch insertion chunk size")
    args = parser.parse_args()

    load_observations_and_weather(limit=args.limit, chunk_size=args.chunk_size)
