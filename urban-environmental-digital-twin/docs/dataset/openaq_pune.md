# OpenAQ Pune Historical Air Quality Dataset Documentation

**Dataset Identifier:** `openaq_pune_air_quality`  
**Data Category:** Pollution & Meteorology  
**Data Classification:** `OBSERVED`  
**API Version:** OpenAQ API v3 (`https://api.openaq.org/v3`)  
**Geography:** Pune Metropolitan Area (Pune Municipal Corporation & Pimpri-Chinchwad Municipal Corporation), Maharashtra, India  
**Retrieval Date:** September 2026  
**License:** Creative Commons Attribution 4.0 International (CC BY 4.0)  

---

## 1. Dataset & Provider Identity

- **Aggregator / Platform:** OpenAQ (Global Open Air Quality platform)
- **API Version:** v3 (REST endpoints authenticated via `X-API-Key`)
- **Upstream Primary Providers:**
  - **CPCB (Central Pollution Control Board, India):** National Continuous Ambient Air Quality Monitoring Network (CAAQMN).
  - **MPCB (Maharashtra Pollution Control Board):** State regulatory network stations.
  - **IITM SAFAR (Indian Institute of Tropical Meteorology - System of Air Quality and Weather Forecasting And Research):** High-precision urban atmospheric research stations.

---

## 2. Access Method & Ingestion Architecture

- **Protocol:** HTTPS REST API v3
- **Endpoints Utilized:**
  - `GET /v3/locations`: Spatial bounding box query (`bbox=73.65,18.35,74.15,18.80`)
  - `GET /v3/locations/{id}`: Station entity metadata
  - `GET /v3/locations/{id}/sensors`: Sensor catalog and coverage metadata
  - `GET /v3/sensors/{id}/measurements`: Timestamp-keyed pagination retrieving raw observation records
- **Ingestion Script:** `ml/src/data/ingest_openaq.py`
  - Automated pagination using keyset cursor navigation (`datetime_from` advancing to `latest_datetime_to`), eliminating deep-offset database timeouts.
  - Automatic rate-limit tracking via response headers (`X-Ratelimit-Remaining`, `X-Ratelimit-Reset`) with exponential backoff on HTTP 408/429/5xx.
  - Local caching of locations, sensors, and measurements to prevent redundant network requests and duplicate records.

---

## 3. Geographic Scope & Selected Locations

A total of 19 monitoring locations were discovered in the Pune metropolitan area. For the Urban Environmental Digital Twin MVP, a representative spatial envelope has been selected:

### Central Benchmark Station
- **Location ID 11613: Revenue Colony-Shivajinagar, Pune - IITM**
  - **Coordinates:** `18.5301°N, 73.8496°E`
  - **Role:** Central urban core reference station, longest operational pedigree, fully equipped with co-located pollutants (PM2.5, PM10, NO2, SO2, CO, O3) and meteorological instrumentation (Temperature, Relative Humidity, Wind Speed, Wind Direction).

### Multi-Station Urban Polygon (MVP Spatial Envelope)
| Station Name | Location ID | Latitude | Longitude | Urban Zone / Characteristic | Operating Agency |
| ------------ | ----------: | -------: | --------: | --------------------------- | ---------------- |
| **Shivajinagar** | 11613 | 18.5301 | 73.8496 | Central Commercial & Traffic Hub | IITM SAFAR / CPCB |
| **Hadapsar** | 60658 | 18.5018 | 73.9275 | Eastern Corridor (Industrial & Residential) | IITM SAFAR / CPCB |
| **Panchawati Pashan** | 3409526 | 18.5365 | 73.8055 | Western Fringe (Institutional & Green Zone) | IITM SAFAR / CPCB |
| **Katraj Dairy** | 3409438 | 18.4545 | 73.8542 | Southern Gateway (Heavy Inter-city Transit) | MPCB / CPCB |
| **Bhosari** | 3409331 | 18.6401 | 73.8489 | Northern Industrial Hub (PCMC Sector) | IITM SAFAR / CPCB |
| **Mhada Colony** | 11609 | 18.5730 | 73.9277 | North-Eastern Corridor (Airport / Suburban) | IITM SAFAR / CPCB |

---

## 4. Parameters, Units & Sampling Resolution

| Variable | OpenAQ Parameter | Measurement Units | Sampling Interval | OpenAQ Period Label | Classification |
| -------- | ---------------- | ----------------- | ----------------- | ------------------- | -------------- |
| **Particulate Matter < 2.5 µm** | `pm25` | µg/m³ | 15 minutes | `raw` | `OBSERVED` |
| **Particulate Matter < 10 µm** | `pm10` | µg/m³ | 15 minutes | `raw` | `OBSERVED` |
| **Nitrogen Dioxide** | `no2` | ppb / µg/m³ | 15 minutes | `raw` | `OBSERVED` |
| **Carbon Monoxide** | `co` | ppb / µg/m³ | 15 minutes | `raw` | `OBSERVED` |
| **Ozone** | `o3` | µg/m³ | 15 minutes | `raw` | `OBSERVED` |
| **Sulfur Dioxide** | `so2` | ppb / µg/m³ | 15 minutes | `raw` | `OBSERVED` |
| **Ambient Temperature** | `temperature` | °C | 15 minutes | `raw` | `OBSERVED` |
| **Relative Humidity** | `relativehumidity` | % | 15 minutes | `raw` | `OBSERVED` |
| **Wind Speed** | `wind_speed` | m/s | 15 minutes | `raw` | `OBSERVED` |
| **Wind Direction** | `wind_direction` | deg (degrees) | 15 minutes | `raw` | `OBSERVED` |

---

## 5. Temporal Coverage & Available Eras

1. **Contemporary Synchronized Era (Recommended MVP Period):**
   - **Start Date:** February 18, 2025 (`2025-02-18T20:15:00Z`)
   - **End Date:** September 24, 2026 (`2026-09-24T17:30:00Z`)
   - **Duration:** ~19 continuous months (~583 days).
   - **Characteristics:** Highly synchronized across 14 stations with consistent 15-minute intervals. Co-located meteorological readings are available simultaneously.

2. **Historical Baseline Era:**
   - **Start Date:** March 2016 (Karve Road) / November 2020 (Shivajinagar, Bhosari, Hadapsar, Mhada Colony).
   - **End Date:** July 2022 (with Karve Road extending to October 2022).
   - **Characteristics:** Covers earlier baseline periods; contains fewer operational stations and retired sensor entities.

3. **Ingestion Gap:**
   - An upstream integration gap exists between **July 2022 and February 2025** where continuous data was not captured in OpenAQ feeds for Pune stations.

---

## 6. Dataset Size & Observation Statistics

- **Total Stations in Pune Catalog:** 19
- **Total Sensors in Pune Catalog:** 214
- **Total Cataloged Active Observations (2025–2026):** 4,928,901 observations
- **Total Cataloged PM2.5 Observations (All Eras):** 622,262 observations
- **Active Era PM2.5 Observations:** 515,277 observations
- **Shivajinagar Benchmark Total Active Observations:** 406,433 observations across 12 sensors

---

## 7. Missing-Data & Quality Characteristics

1. **Reporting Regularity:** High during active periods (>95% coverage on operational days).
2. **Missing Value Encoding:** OpenAQ records missing values either by omitting timestamp intervals (interval gaps) or returning null values.
3. **Flags:** OpenAQ v3 includes `flagInfo.hasFlags` indicating whether measurements carry quality control flags from upstream providers.
4. **Maintenance Outages:** Periodic dips in coverage correspond to instrument recalibration or station power maintenance, particularly during peak monsoon periods.

---

## 8. Transformations & Raw Data Integrity

- **Raw Data Policy:** Zero transformations, imputations, or synthetic fillings were performed on the downloaded raw data.
- **Storage Layout:**
  - `ml/data/raw/pollution/openaq/locations/`: Pristine location JSON responses.
  - `ml/data/raw/pollution/openaq/metadata/`: Sensor catalog and ingestion manifests.
  - `ml/data/raw/pollution/openaq/measurements/`: Original sensor measurements JSON and consolidated tabular CSV (`raw_measurements.csv`).
- **Downstream Processing:** Any cleaning, outlier rejection, or hourly aggregation must be written to `ml/data/processed/pollution/` to keep raw data 100% reproducible.

---

## 9. Known Limitations

1. **Ambient Concentrations Only:** OpenAQ reports ambient receptor measurements. It does NOT provide source-emission breakdowns (e.g. vehicular vs industrial vs dust).
2. **July 2022 – February 2025 Gap:** Cannot train models continuously across the 2022–2025 boundary without acknowledging the hiatus.
3. **Varying Units:** Some stations report gaseous pollutants in `ppb` while older feeds reported in `µg/m³`. Proper molecular mass conversion is required during preprocessing.

---

## 10. License & Attribution

- **OpenAQ License:** Creative Commons Attribution 4.0 International (CC BY 4.0).
- **Attribution Statement:** Data provided by OpenAQ (openaq.org), sourced from Central Pollution Control Board (CPCB), Maharashtra Pollution Control Board (MPCB), and Indian Institute of Tropical Meteorology (IITM SAFAR).
