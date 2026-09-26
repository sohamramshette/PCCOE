"""
Inspection and processing script for Pune Urban Activity, Industrial, Construction, and Land-Use datasets.
Generates:
1. Detailed quality metrics for docs/dataset/activity_quality_report.md
2. Processed feature table ml/data/processed/activity/station_activity_features.csv
3. ml/data/processed/activity/README.md
"""

import json
import math
from pathlib import Path
import pandas as pd
import numpy as np

def main():
    project_root = Path(r"c:\Users\lenovo\OneDrive\Desktop\PCCOE\PCCOE\urban-environmental-digital-twin")
    raw_dir = project_root / "ml/data/raw/activity"
    proc_dir = project_root / "ml/data/processed/activity"
    proc_dir.mkdir(parents=True, exist_ok=True)

    ind_path = raw_dir / "industrial/raw_industrial_elements.csv"
    con_path = raw_dir / "construction/raw_construction_elements.csv"
    lnd_path = raw_dir / "landuse/raw_landuse_elements.csv"
    poi_path = raw_dir / "poi/raw_poi_elements.csv"

    df_ind = pd.read_csv(ind_path)
    df_con = pd.read_csv(con_path)
    df_lnd = pd.read_csv(lnd_path)
    df_poi = pd.read_csv(poi_path)

    print("=== RAW DATA QUALITY SUMMARY ===")
    datasets = {
        "industrial": df_ind,
        "construction": df_con,
        "landuse": df_lnd,
        "poi": df_poi
    }

    metrics = {}
    for name, df in datasets.items():
        metrics[name] = {
            "row_count": len(df),
            "col_count": len(df.columns),
            "columns": list(df.columns),
            "null_counts": df.isnull().sum().to_dict(),
            "lat_min": df["latitude"].min() if "latitude" in df else None,
            "lat_max": df["latitude"].max() if "latitude" in df else None,
            "lon_min": df["longitude"].min() if "longitude" in df else None,
            "lon_max": df["longitude"].max() if "longitude" in df else None,
            "stations_covered": df["station_id"].nunique() if "station_id" in df else 0,
            "counts_per_station": df.groupby("station_id")["element_id"].count().to_dict() if "station_id" in df else {}
        }
        print(f"\n--- {name.upper()} ---")
        print(f"Rows: {len(df)}, Cols: {len(df.columns)}")
        print(f"Lat range: [{df['latitude'].min():.4f}, {df['latitude'].max():.4f}]")
        print(f"Lon range: [{df['longitude'].min():.4f}, {df['longitude'].max():.4f}]")
        print(f"Nulls: {df.isnull().sum().to_dict()}")
        print(f"Per Station: {metrics[name]['counts_per_station']}")

    # Let's inspect station details
    stations_info = [
        {"location_id": "11613", "station_name": "Revenue Colony-Shivajinagar, Pune - IITM", "zone": "Commercial / Educational Urban Core", "lat": 18.5301, "lon": 73.8496},
        {"location_id": "11609", "station_name": "Mhada Colony, Pune - IITM", "zone": "North-Eastern Residential / Airport Corridor", "lat": 18.5730, "lon": 73.9277},
        {"location_id": "60658", "station_name": "Hadapsar, Pune - IITM", "zone": "Eastern Commercial / Mixed Suburban Corridor", "lat": 18.5018, "lon": 73.9275},
        {"location_id": "3409331", "station_name": "Bhosari, Pune - IITM", "zone": "Northern Heavy Industrial / Highway Hub (PCMC)", "lat": 18.6401, "lon": 73.8490},
        {"location_id": "3409438", "station_name": "Katraj Dairy, Pune - MPCB", "zone": "Southern Highway Chokepoint / Ghat Gateway", "lat": 18.4545, "lon": 73.8542},
        {"location_id": "3409526", "station_name": "Panchawati_Pashan, Pune - IITM", "zone": "Western Institutional / Foothill Background", "lat": 18.5365, "lon": 73.8055}
    ]

    buffer_area_km2 = math.pi * (1.5 ** 2) # ~7.0686 km²

    processed_rows = []
    for s in stations_info:
        loc_id = int(s["location_id"]) if s["location_id"].isdigit() else s["location_id"]
        # Handle string or int matching
        sub_ind = df_ind[df_ind["station_id"].astype(str) == str(s["location_id"])]
        sub_con = df_con[df_con["station_id"].astype(str) == str(s["location_id"])]
        sub_lnd = df_lnd[df_lnd["station_id"].astype(str) == str(s["location_id"])]
        sub_poi = df_poi[df_poi["station_id"].astype(str) == str(s["location_id"])]

        # Industrial metrics
        ind_count = len(sub_ind)
        min_ind_dist = sub_ind["distance_to_station_m"].min() if ind_count > 0 else np.nan

        # Construction metrics
        con_count = len(sub_con)
        min_con_dist = sub_con["distance_to_station_m"].min() if con_count > 0 else np.nan

        # POI metrics
        poi_count = len(sub_poi)
        poi_density = poi_count / buffer_area_km2
        comm_poi = len(sub_poi[sub_poi["category"] == "commercial"])
        inst_poi = len(sub_poi[sub_poi["category"] == "institutional"])
        trans_poi = len(sub_poi[sub_poi["category"] == "transportation"])

        # Land use counts
        # Map landuse classes into broader groupings
        lnd_classes = sub_lnd["landuse_class"].value_counts().to_dict()
        res_count = lnd_classes.get("residential", 0)
        com_count = lnd_classes.get("commercial", 0) + lnd_classes.get("retail", 0)
        ind_lu_count = lnd_classes.get("industrial", 0)
        inst_lu_count = lnd_classes.get("institutional", 0)
        green_count = lnd_classes.get("park", 0) + lnd_classes.get("forest", 0) + lnd_classes.get("grass", 0) + lnd_classes.get("garden", 0) + lnd_classes.get("meadow", 0)
        
        dominant_lu = sub_lnd["landuse_class"].mode()[0] if len(sub_lnd) > 0 else "unclassified"

        processed_rows.append({
            "station_id": str(s["location_id"]),
            "station_name": s["station_name"],
            "zone_type": s["zone"],
            "latitude": s["lat"],
            "longitude": s["lon"],
            "industrial_elements_2km": ind_count,
            "dist_nearest_industrial_m": round(min_ind_dist, 1) if not np.isnan(min_ind_dist) else 9999.0,
            "has_industrial_within_1km": 1 if min_ind_dist <= 1000 else 0,
            "construction_elements_1_5km": con_count,
            "dist_nearest_construction_m": round(min_con_dist, 1) if not np.isnan(min_con_dist) else 9999.0,
            "has_construction_within_1km": 1 if min_con_dist <= 1000 else 0,
            "poi_total_count_1_5km": poi_count,
            "poi_density_per_km2": round(poi_density, 2),
            "poi_commercial_count": comm_poi,
            "poi_institutional_count": inst_poi,
            "poi_transit_count": trans_poi,
            "landuse_elements_total": len(sub_lnd),
            "landuse_residential_count": res_count,
            "landuse_commercial_count": com_count,
            "landuse_industrial_count": ind_lu_count,
            "landuse_green_count": green_count,
            "dominant_landuse": dominant_lu,
            "data_classification": "STATIC_LAND_USE / INDUSTRIAL_PROXY / CONSTRUCTION_PROXY / ACTIVITY_PROXY"
        })

    df_proc = pd.DataFrame(processed_rows)
    proc_csv_path = proc_dir / "station_activity_features.csv"
    df_proc.to_csv(proc_csv_path, index=False)
    print(f"\nSaved processed station activity features to {proc_csv_path}")
    print(df_proc.to_string())

    # Write summary json for quality report
    summary_path = proc_dir / "activity_summary_metrics.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "metrics": metrics,
            "station_features": processed_rows
        }, f, indent=2)
    print(f"Saved summary metrics to {summary_path}")

if __name__ == "__main__":
    main()
