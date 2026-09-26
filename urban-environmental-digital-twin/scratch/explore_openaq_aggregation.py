"""
Exploration script for OpenAQ raw measurements:
1. Station coverage & parameter availability per station
2. Observation counts per hour
3. Nulls, negatives, extreme outliers
4. Resampling behavior and quality flags
"""

import pandas as pd
import numpy as np
from pathlib import Path

def main():
    root = Path(r"c:\Users\lenovo\OneDrive\Desktop\PCCOE\PCCOE\urban-environmental-digital-twin")
    pol_path = root / "ml/data/raw/pollution/openaq/measurements/raw_measurements.csv"

    print("Loading OpenAQ raw measurements...")
    df = pd.read_csv(pol_path, low_memory=False)
    print(f"Total rows: {len(df):,}")

    # Inspect station & parameter combinations
    print("\n--- Rows per Location & Parameter ---")
    ct = pd.crosstab(df['location_id'], df['parameter'], margins=True)
    print(ct)

    # Convert timestamps
    df['datetime_from_utc'] = pd.to_datetime(df['datetime_from_utc'])
    df['datetime_utc'] = df['datetime_from_utc'].dt.floor('h')

    # Inspect date ranges per station
    print("\n--- Date Range per Location ---")
    for loc, grp in df.groupby('location_id'):
        print(f"Location {loc}: {grp['datetime_from_utc'].min()} to {grp['datetime_from_utc'].max()} ({len(grp):,} rows)")

    # Value checks: nulls, negatives, summary stats per parameter
    print("\n--- Parameter Summary Statistics ---")
    for param, grp in df.groupby('parameter'):
        v = grp['value']
        nulls = v.isnull().sum()
        negs = (v < 0).sum()
        zeros = (v == 0).sum()
        print(f"Param: {param:16s} | Count: {len(v):7,d} | Nulls: {nulls:4d} | Negs: {negs:4d} | Zeros: {zeros:4d} | Min: {v.min():.2f} | P50: {v.median():.2f} | P99: {v.quantile(0.99):.2f} | Max: {v.max():.2f}")

    # Inspect quarter-hour counts per station-hour for PM2.5
    df_pm25 = df[df['parameter'] == 'pm25'].copy()
    hour_counts = df_pm25.groupby(['location_id', 'datetime_utc'])['value'].agg(['count', 'mean'])
    print("\n--- PM2.5 Readings per Hour Distribution ---")
    print(hour_counts['count'].value_counts().sort_index())

    # Check duplicates for the same (location_id, datetime_utc, parameter, datetime_from_utc)
    dup_raw = df.duplicated(subset=['location_id', 'parameter', 'datetime_from_utc']).sum()
    print(f"\nExact raw duplicates (location, param, datetime_from_utc): {dup_raw}")

if __name__ == "__main__":
    main()
