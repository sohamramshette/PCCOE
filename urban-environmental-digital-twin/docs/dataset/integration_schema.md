# Data Integration & Schema Specification Report

**Project:** Urban Environmental Digital Twin  
**Target Geography:** Pune Metropolitan Area (PMC & PCMC), Maharashtra, India  
**Target Period:** February 18, 2025 `00:00:00Z` → September 24, 2026 `23:00:00Z` (14,016 contiguous hours)  
**Analytical Grain:** `ONE ROW = ONE MONITORING STATION × ONE HOUR`  
**Primary Key:** `(station_id, datetime_utc)`  
**Status:** COMPLETE & AUDITED  

---

## 1. Upstream & Processed Dataset Schema Inventory

The table below documents the inspected schemas across all source, processed, and integrated artifacts.

| Dataset | File Path | Total Rows | Key Columns | Timestamp Format | Timezone | Spatial Key | Provenance Notes |
|---|---|---:|---|---|---|---|---|
| **OpenAQ Raw Measurements** | `ml/data/raw/pollution/openaq/measurements/raw_measurements.csv` | 419,781 | `location_id`, `parameter`, `value` | `datetime_from_utc`, `datetime_to_utc` (15-min interval) | UTC (`Z`) & IST (`+05:30`) | `location_id` (`11613`, `11609`, `60658`, `3409331`, `3409438`, `3409526`) | `OBSERVED`: Raw continuous physical CAAQMS station telemetry. |
| **OpenAQ Processed Hourly** | `ml/data/processed/pollution/openaq_hourly_processed.csv` | 63,068 | `station_id`, `datetime_utc`, `pm25`, `pm25_obs_count` | `datetime_utc` (`YYYY-MM-DDTHH:00:00Z`) | UTC (`Z`) | `station_id` (6 core stations) | `OBSERVED`: Hourly arithmetic averages requiring $\ge 1$ observation; tagged with `pm25_completeness_flag`. |
| **Open-Meteo Raw Weather** | `ml/data/raw/weather/openmeteo/raw_weather_hourly.csv` | 98,112 | `location_id`, `datetime_utc`, `temperature_2m`, `precipitation` | `datetime_utc` (`YYYY-MM-DDTHH:00:00Z`) | UTC (`Z`) | `location_id` (7 locations: central + 6 stations) | `REANALYSIS`: Raw ECMWF ERA5-Land model assimilation archive. |
| **Open-Meteo Processed Weather** | `ml/data/processed/weather/weather_hourly_processed.csv` | 98,112 | `location_id`, `datetime_utc`, `temp_c`, `humidity_pct`, `pbl_height_m` | `datetime_utc`, `datetime_local_ist` | UTC (`Z`) & IST (`+05:30`) | `location_id` | `REANALYSIS`: Standardized physical units and dual time representations. |
| **OSM Raw Road Ways** | `ml/data/raw/traffic/osm/raw_osm_ways.csv` | 4,332 | `element_id`, `station_id`, `highway`, `length_meters` | N/A (Static Snapshot) | N/A | `station_id` | `STATIC_ROAD_NETWORK`: 707.95 km vector highway network within 1,500m buffers. |
| **OSM Station Road Features** | `ml/data/processed/traffic/station_road_features.csv` | 6 | `location_id`, `total_road_length_km`, `major_road_density_km_per_km2` | N/A (Static Snapshot) | N/A | `location_id` | `STATIC_ROAD_NETWORK`: Station-level road exposure metrics. |
| **Pune Empirical Traffic Proxy** | `ml/data/raw/traffic/proxy/pune_diurnal_traffic_profile.csv` | 24 | `hour_of_day`, `weekday_traffic_index`, `weekend_traffic_index` | `hour_of_day` (0 to 23) | Indian Standard Time (IST) | Metropolitan Area | `TRAFFIC_PROXY`: Calibrated diurnal traffic curves from Pune CMP & IITM SAFAR. |
| **Pune Processed Traffic Proxy** | `ml/data/processed/traffic/traffic_hourly_proxy.csv` | 24 | `hour_of_day`, `weekday_traffic_index`, `weekend_traffic_index` | `hour_of_day` (0 to 23) | Indian Standard Time (IST) | Metropolitan Area | `TRAFFIC_PROXY`: Formatted diurnal congestion coefficient. |
| **OSM Raw Industrial Elements** | `ml/data/raw/activity/industrial/raw_industrial_elements.csv` | 49 | `station_id`, `element_id`, `industrial_type`, `distance_to_station_m` | N/A (Static Snapshot) | N/A | `station_id` | `STATIC_INDUSTRIAL`: Factory centroids and works within 2,000m buffers. |
| **OSM Raw Construction Elements**| `ml/data/raw/activity/construction/raw_construction_elements.csv`| 25 | `station_id`, `element_id`, `construction_type`, `distance_to_station_m` | N/A (Static Snapshot) | N/A | `station_id` | `CONSTRUCTION_PROXY`: Active civil works, flyovers, metro construction within 1,500m. |
| **OSM Raw Land-Use Polygons** | `ml/data/raw/activity/landuse/raw_landuse_elements.csv` | 405 | `station_id`, `element_id`, `landuse_class` | N/A (Static Snapshot) | N/A | `station_id` | `STATIC_LAND_USE`: Residential, commercial, industrial, green spaces. |
| **OSM Raw POI Elements** | `ml/data/raw/activity/poi/raw_poi_elements.csv` | 417 | `station_id`, `element_id`, `category`, `subcategory` | N/A (Static Snapshot) | N/A | `station_id` | `ACTIVITY_PROXY`: Commercial, institutional, and transit points of interest. |
| **Station Activity Features** | `ml/data/processed/activity/station_activity_features.csv` | 6 | `station_id`, `industrial_elements_2km`, `poi_density_per_km2` | N/A (Static Snapshot) | N/A | `station_id` | Multi-Classification: Derived spatial exposure features per station. |
| **Master Hourly Analytical Dataset** | `ml/data/processed/integration/master_hourly_dataset.csv` | **84,096** | `station_id`, `datetime_utc` | `datetime_utc`, `datetime_local_ist` | UTC (`Z`) & IST (`+05:30`) | `station_id` | **Unified Canonical Dataset**: 6 stations × 14,016 contiguous hours, 70 columns. |

---

## 2. Master Analytical Grain Specification

* **Primary Entity:** Monitoring Station × Hourly Window
* **Primary Key:** `(station_id, datetime_utc)`
* **Uniqueness:** Strictly enforced with **0 duplicates**.
* **Temporal Grid:** Synchronous hourly intervals (`:00:00Z`) starting at `2025-02-18T00:00:00Z` and ending at `2026-09-24T23:00:00Z` (14,016 hours per station).
* **Total Records:** $6 \times 14,016 = 84,096\text{ rows}$.

---

## 3. Schema Structure of Master Analytical Dataset (`master_hourly_dataset.csv`)

### 3.1 Spatial & Temporal Identifiers (14 columns)
1. `station_id` (string): Unique OpenAQ location identifier (`'11613'`, `'11609'`, `'60658'`, `'3409331'`, `'3409438'`, `'3409526'`).
2. `station_name` (string): Official monitoring station name.
3. `zone_type` (string): Qualitative urban morphology classification.
4. `latitude` (float): Station WGS84 latitude.
5. `longitude` (float): Station WGS84 longitude.
6. `datetime_utc` (string): Canonical ISO-8601 UTC timestamp (`YYYY-MM-DDTHH:00:00Z`).
7. `datetime_local_ist` (string): Local Indian Standard Time (`YYYY-MM-DDTHH:00:00+05:30`).
8. `year` (int): Calendar year (2025, 2026).
9. `month` (int): Month of year (1 to 12).
10. `day` (int): Day of month (1 to 31).
11. `hour_utc` (int): Hour of day in UTC (0 to 23).
12. `hour_ist` (int): Hour of day in local IST (0 to 23).
13. `day_of_week` (int): Day of week (0 = Monday, 6 = Sunday).
14. `is_weekend` (int): Binary indicator (1 if Saturday or Sunday, else 0).

### 3.2 Observed Target & Pollutant Features (`OBSERVED`, 7 columns)
15. `pm25` (float): Ground-truth hourly mean PM2.5 concentration in $\mu\text{g/m}^3$ (NaN if sensor offline).
16. `pm25_obs_count` (int): Number of valid 15-minute observations in the hour (0 to 4).
17. `pm25_completeness_flag` (string): Quality flag (`COMPLETE`, `PARTIAL`, `INSUFFICIENT`, `MISSING`).
18. `pm10` (float): Ground-truth hourly mean PM10 concentration in $\mu\text{g/m}^3$ (available at 11613).
19. `pm10_obs_count` (int): Number of valid 15-minute PM10 observations (0 to 4).
20. `no2` (float): Ground-truth hourly mean NO2 concentration in ppb (available at 11613).
21. `no2_obs_count` (int): Number of valid 15-minute NO2 observations (0 to 4).

### 3.3 In-Situ Station Meteorology (`OBSERVED`, 6 columns)
22. `temp_insitu_c` (float): In-situ thermometer reading at monitoring station in $^\circ\text{C}$ (station 11613).
23. `temp_insitu_obs_count` (int): Count of in-situ temperature readings (0 to 4).
24. `humidity_insitu_pct` (float): In-situ relative humidity hygrometer reading in % (station 11613).
25. `humidity_insitu_obs_count` (int): Count of in-situ humidity readings (0 to 4).
26. `wind_speed_insitu_ms` (float): In-situ anemometer wind speed in m/s (station 11613).
27. `wind_speed_insitu_obs_count` (int): Count of in-situ wind speed readings (0 to 4).

### 3.4 Numerical Reanalysis Weather (`REANALYSIS`, 14 columns)
28. `weather_grid_latitude` (float): Nearest ERA5-Land atmospheric model grid coordinate.
29. `weather_grid_longitude` (float): Nearest ERA5-Land atmospheric model grid coordinate.
30. `weather_elevation_m` (float): Surface elevation above sea level in meters.
31. `temp_c` (float): 2-meter air temperature in $^\circ\text{C}$.
32. `humidity_pct` (int/float): 2-meter relative humidity in %.
33. `dew_point_c` (float): 2-meter dew point temperature in $^\circ\text{C}$.
34. `precip_mm` (float): Total precipitation accumulated in the hour in mm.
35. `rain_mm` (float): Liquid rain in mm.
36. `pressure_hpa` (float): Atmospheric surface pressure in hPa.
37. `wind_speed_ms` (float): 10-meter wind speed in m/s.
38. `wind_dir_deg` (int): 10-meter wind direction in degrees ($0^\circ$ to $360^\circ$).
39. `solar_rad_wm2` (float): Shortwave surface solar radiation in $\text{W/m}^2$.
40. `cloud_cover_pct` (int): Total cloud cover percentage (0% to 100%).
41. `pbl_height_m` (float): Planetary boundary layer mixing height in meters.

### 3.5 Traffic Exposure & Activity Proxy (`STATIC_ROAD_NETWORK` / `TRAFFIC_PROXY`, 7 columns)
42. `total_road_length_km` (float): Total digitized road network length within 1,500m buffer in km.
43. `major_road_length_km` (float): Total arterial/highway length in buffer in km.
44. `local_road_length_km` (float): Total residential/service street length in buffer in km.
45. `major_road_density_km_per_km2` (float): Density of major arterial roads in $\text{km/km}^2$.
46. `total_road_density_km_per_km2` (float): Overall road network density in $\text{km/km}^2$.
47. `distance_to_nearest_major_road_m` (float): Great-circle distance to nearest arterial highway corridor in meters.
48. `traffic_proxy_index` (float): Normalized diurnal vehicular congestion factor (0.0 to 1.0) matched to `(hour_ist, is_weekend)`.

### 3.6 Urban Activity, Industrial, Construction & Land Use (`STATIC` / `PROXIES`, 17 columns)
49. `industrial_elements_2km` (int): Total industrial facilities/works within 2,000m buffer.
50. `dist_nearest_industrial_m` (float): Distance to nearest factory/industrial cluster in meters.
51. `has_industrial_within_1km` (int): Binary indicator (1 if industrial $\le 1\text{ km}$, else 0).
52. `construction_elements_1_5km` (int): Count of active civil construction sites within 1,500m buffer.
53. `dist_nearest_construction_m` (float): Distance to nearest construction project in meters.
54. `has_construction_within_1km` (int): Binary indicator (1 if construction $\le 1\text{ km}$, else 0).
55. `poi_total_count_1_5km` (int): Total commercial, institutional, and transit points of interest.
56. `poi_density_per_km2` (float): Spatial density of POIs in $\text{POIs/km}^2$.
57. `poi_commercial_count` (int): Commercial shops, restaurants, and offices in buffer.
58. `poi_institutional_count` (int): Schools, colleges, universities, and hospitals in buffer.
59. `poi_transit_count` (int): Bus stations, depots, and fuel stations in buffer.
60. `landuse_elements_total` (int): Total land-use zoning polygons mapped in buffer.
61. `landuse_residential_count` (int): Count of residential zones in buffer.
62. `landuse_commercial_count` (int): Count of commercial/retail zones in buffer.
63. `landuse_industrial_count` (int): Count of industrial zoning footprints in buffer.
64. `landuse_green_count` (int): Count of parks, forests, and green spaces in buffer.
65. `dominant_landuse` (string): Most frequent land-use classification in buffer.

### 3.7 Provenance Classification Labels (5 columns)
66. `pollution_data_type` (string): Fixed value `'OBSERVED'`.
67. `weather_data_type` (string): Fixed value `'REANALYSIS'`.
68. `traffic_road_data_type` (string): Fixed value `'STATIC_ROAD_NETWORK'`.
69. `traffic_proxy_data_type` (string): Fixed value `'TRAFFIC_PROXY'`.
70. `activity_data_type` (string): Fixed value `'STATIC_LAND_USE / PROXY'`.
