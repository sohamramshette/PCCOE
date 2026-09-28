import json
import joblib
import numpy as np
import pandas as pd
import shap
from pathlib import Path

base = Path(r'C:\Users\A1\Desktop\PCCOE\urban-environmental-digital-twin\ml\models')
feature_names = json.load(open(base / 'feature_names.json'))['core_features']
pre = joblib.load(base / 'preprocessor.joblib')
model = joblib.load(base / 'gradient_boosting_baseline.joblib')
row = {c: 0.0 for c in feature_names}
row['station_id'] = 11613
row['zone_type'] = 'residential'
row['latitude'] = 18.53
row['longitude'] = 73.85
row['year'] = 2026
row['month'] = 6
row['day'] = 15
row['hour_utc'] = 12
row['hour_ist'] = 17
row['day_of_week'] = 0
row['is_weekend'] = 0
row['pm25'] = 42.0
row['pm25_obs_count'] = 5
row['pm25_completeness_flag'] = 1
row['weather_grid_latitude'] = 18.53
row['weather_grid_longitude'] = 73.85
row['weather_elevation_m'] = 550
row['temp_c'] = 30
row['humidity_pct'] = 45
row['dew_point_c'] = 20
row['precip_mm'] = 0.0
row['rain_mm'] = 0.0
row['pressure_hpa'] = 1012
row['wind_speed_ms'] = 4.0
row['wind_dir_deg'] = 180
row['solar_rad_wm2'] = 400
row['cloud_cover_pct'] = 20
row['pbl_height_m'] = 600
row['total_road_length_km'] = 50
row['major_road_length_km'] = 10
row['local_road_length_km'] = 40
row['major_road_density_km_per_km2'] = 2.0
row['total_road_density_km_per_km2'] = 20.0
row['distance_to_nearest_major_road_m'] = 300.0
row['traffic_proxy_index'] = 0.6
row['industrial_elements_2km'] = 0
row['dist_nearest_industrial_m'] = 5000.0
row['has_industrial_within_1km'] = 0
row['construction_elements_1_5km'] = 0
row['dist_nearest_construction_m'] = 5000.0
row['has_construction_within_1km'] = 0
row['poi_total_count_1_5km'] = 50
row['poi_density_per_km2'] = 2.0
row['poi_commercial_count'] = 20
row['poi_institutional_count'] = 10
row['poi_transit_count'] = 5
row['landuse_elements_total'] = 30
row['landuse_residential_count'] = 15
row['landuse_commercial_count'] = 5
row['landuse_industrial_count'] = 2
row['landuse_green_count'] = 5
row['dominant_landuse'] = 'residential'
row['hour_sin'] = 0.0
row['hour_cos'] = 1.0
row['month_sin'] = 0.5
row['month_cos'] = 0.866
row['day_of_week_sin'] = 0.0
row['day_of_week_cos'] = 1.0
row['is_monsoon'] = 0
row['wind_u'] = 0.0
row['wind_v'] = -4.0
row['ventilation_index'] = 2400.0
row['temp_dewpoint_spread'] = 10.0
row['is_precipitating'] = 0
row['atmospheric_stagnation_flag'] = 0
for lag in [1, 2, 3, 6, 12, 24]:
    row[f'pm25_lag_{lag}h'] = 38.0
for lag in [1, 3, 6]:
    row[f'temp_c_lag_{lag}h'] = 30.0
    row[f'wind_speed_ms_lag_{lag}h'] = 4.0
    row[f'pbl_height_m_lag_{lag}h'] = 600.0
row['humidity_pct_lag_1h'] = 45.0
row['ventilation_index_lag_1h'] = 2400.0
for name in [
    'pm25_rolling_mean_3h','pm25_rolling_mean_6h','pm25_rolling_mean_12h','pm25_rolling_mean_24h',
    'pm25_rolling_std_6h','pm25_rolling_std_24h','temp_c_rolling_mean_6h',
    'wind_speed_ms_rolling_mean_6h','pbl_height_m_rolling_mean_6h','precip_rolling_sum_6h',
    'precip_rolling_sum_24h','traffic_stagnation_ratio','traffic_ventilation_ratio',
    'industrial_dispersion_ratio','construction_dispersion_ratio','poi_traffic_interaction'
]:
    row[name] = 0.0
X = pd.DataFrame([row])
Xt = pre.transform(X[feature_names])
Xt_dense = Xt.toarray() if hasattr(Xt, 'toarray') else Xt
print(type(model))
print('feature count', Xt_dense.shape)
for label, explainer in [('tree', shap.TreeExplainer(model)), ('explainer', shap.Explainer(model, Xt_dense))]:
    print('--', label)
    try:
        sv = explainer(Xt_dense, check_additivity=False) if label == 'explainer' else explainer.shap_values(Xt_dense)
        arr = np.asarray(sv.values if hasattr(sv, 'values') else sv)
        if arr.ndim == 0:
            print('scalar values', arr)
        else:
            print('shape', arr.shape)
            print('first 10', arr[0][:10])
            print('max abs', np.max(np.abs(arr[0])))
            print('mean abs', np.mean(np.abs(arr[0])))
            print('base', getattr(sv, 'base_values', None))
    except Exception as exc:
        print('error', type(exc).__name__, exc)
print('prediction', model.predict(Xt_dense)[0])
