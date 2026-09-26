# Master Hourly Analytical Dataset

## 1. Overview
The **Master Hourly Analytical Dataset** is the integrated, canonical dataset for the **Urban Environmental Digital Twin** project. It fuses observed ambient air quality measurements with meteorological reanalysis, physical road network metrics, empirical diurnal traffic profiles, and urban activity/industrial proxies across Pune, Maharashtra, India.

* **Primary Artifact:** `master_hourly_dataset.csv`
* **Canonical Grain:** `ONE ROW = ONE MONITORING STATION × ONE HOUR`
* **Primary Key:** `(station_id, datetime_utc)`
* **Row Count:** 84,096 rows (6 stations × 14,016 contiguous hours)
* **Column Count:** 70 features
* **Temporal Period:** February 18, 2025 `00:00:00Z` to September 24, 2026 `23:00:00Z` (19 continuous months)
* **Geographic Coverage:** 6 Core Pune Air Quality Monitoring Stations (Shivajinagar, Mhada Colony, Hadapsar, Bhosari, Katraj Dairy, Pashan)

---

## 2. Integrated Domains & Provenance Classifications

| Domain | Source Provider | Feature Set | Data Classification |
|---|---|---|---|
| **Pollution** | OpenAQ (CPCB / MPCB / IITM SAFAR) | PM2.5, PM10, NO2, in-situ temp/humidity/wind, completeness flags | `OBSERVED` |
| **Meteorology** | Open-Meteo / ECMWF ERA5-Land | 2m temp, humidity, pressure, wind speed/dir, rain, solar radiation, PBLH | `REANALYSIS` |
| **Traffic Network** | OpenStreetMap (Overpass API) | Road length, arterial road density, distance to nearest major highway | `STATIC_ROAD_NETWORK` |
| **Traffic Activity** | Empirical Diurnal Curve (Pune CMP / IITM) | Normalized hourly traffic intensity index (0.0 to 1.0) | `TRAFFIC_PROXY` |
| **Industrial Activity**| OpenStreetMap (Overpass API) | Factory count in 2km, distance to nearest industrial cluster | `STATIC_INDUSTRIAL` / `INDUSTRIAL_PROXY` |
| **Construction Activity**| OpenStreetMap (Overpass API) | Active construction sites in 1.5km, distance to nearest project | `CONSTRUCTION_PROXY` |
| **Land Use & POI** | OpenStreetMap (Overpass API) | Land-use counts (residential, commercial, green), POI density per km² | `STATIC_LAND_USE` / `ACTIVITY_PROXY` |

---

## 3. Completeness Flags for Target Variable (PM2.5)
* `COMPLETE` (58,908 hours, 70.0%): $\ge 3$ valid 15-minute readings in the hour.
* `PARTIAL` (2,111 hours, 2.5%): Exactly 2 valid 15-minute readings in the hour.
* `INSUFFICIENT` (2,000 hours, 2.4%): Exactly 1 valid 15-minute reading in the hour.
* `MISSING` (21,077 hours, 25.1%): 0 valid readings (station offline, sensor calibration, or prior to deployment).

---

## 4. Critical Truthfulness & Modeling Rules
1. **Zero Fabrication:** Missing pollution observations are represented honestly as `NaN` (with `pm25_completeness_flag = 'MISSING'`). No fake values or artificial interpolations have been introduced.
2. **Static Exposure Invariance:** Activity and road network metrics are static spatial exposure features and do not vary by hour.
3. **Traffic Proxy Distinction:** `traffic_proxy_index` is an empirical proxy curve, not an observed probe count.
4. **No Target Leakage:** No future pollution lags, rolling future averages, or target-derived encodings have been added. Feature engineering belongs strictly to Phase 4.

---

## 5. Generation Script
```bash
python ml/src/data/build_master_dataset.py --force
```
