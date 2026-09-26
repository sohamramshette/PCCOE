# Weather Source Inventory & Evaluation Report

**Project:** Urban Environmental Digital Twin  
**Target Geography:** Pune Metropolitan Area, Maharashtra, India  
**Target Temporal Period:** February 18, 2025 to September 24, 2026 (583 continuous days / 14,016 hours)  
**Target Temporal Resolution:** Hourly  
**Evaluation Date:** September 2026  

---

## 1. Executive Summary Table

| Source | Dataset Name | Provider / Source | Pune Coverage | Date Range Evaluated | Resolution | Key Variables Available | Access Protocol | API Key / Account | Licensing | Data Type / Provenance | Status for MVP |
|---|---|---|---|---|---|---|---|---|---|---|:---:|
| **Open-Meteo** | Historical Weather API (ERA5-Land / ERA5) | Open-Meteo GmbH / ECMWF | Exact coordinate point (~10 km ERA5-Land grid) | 1940 to present (Near-real-time lag: 2 days) | **Hourly** | Temp, RH, Wind Speed, Wind Dir, Precipitation, Pressure, Dew Point, Solar Rad, PBL Height | REST API (JSON / CSV) | **None** (Open access, 10k calls/day) | CC BY 4.0 / ODbL | `REANALYSIS` (ECMWF ERA5 / ERA5-Land) | **SELECTED** |
| **India Meteorological Department (IMD)** | Surface Observational Station Data | National Data Centre (NDC), IMD Pune | In-situ ground stations (Shivajinagar 43063, Lohegaon 43062, Pashan) | 1969 to present (synoptic/daily/hourly) | Synoptic (3-hr) / Hourly AWS | Temp, RH, Wind Speed, Wind Dir, Rainfall, Pressure | Manual online request form (`dsp.imdpune.gov.in`) | **Mandatory** account + identity verification + BharatKosh payment | Government of India Data Policy (Restricted / Paid) | `OBSERVED` (Physical Ground Instrumentation) | **REJECTED (MVP)** (Requires manual purchase/credentials) |
| **Copernicus CDS** | ERA5 hourly data on single levels | ECMWF / Copernicus Climate Change Service (C3S) | Global 0.25° grid (~28 km) | 1940 to present (5-day lag) | **Hourly** | 2m Temp, 2m Dewpoint, 10m U/V Wind, Total Precip, Surface Pressure, Boundary Layer Height | CDS API (`cdsapi` Python client) / Web portal | **Mandatory** CDS account + user API token (`.cdsapirc`) + dataset agreement | Copernicus Open Licence | `REANALYSIS` (ECMWF Atmospheric Model Assimilation) | **REJECTED (MVP)** (Requires account registration & batch queue) |
| **NASA POWER** | Hourly Point API (MERRA-2) | NASA Langley Research Center | Global 0.5° × 0.625° grid (~55 km × ~65 km) | 1981 to present (2–3 month lag) | **Hourly** | T2M, RH2M, WS10M, WD10M, PRECTOTCORR, PS, ALLSKY_SFC_SW_DWN | REST API (JSON / CSV) | **None** (Open access) | Open Access (Public Domain / NASA) | `REANALYSIS` / `DATA ASSIMILATION` (NASA GMAO MERRA-2) | **REJECTED (MVP)** (Coarse 55 km grid, slow API latency) |

---

## 2. Detailed Source Profiles

### 2.1 India Meteorological Department (IMD)
* **Official URL:** [IMD Data Supply Portal (dsp.imdpune.gov.in)](https://dsp.imdpune.gov.in/) | [IMD Headquarters](https://mausam.imd.gov.in/)
* **Dataset Name:** Surface Meteorological Station Observations (Pune)
* **Data Classification:** `OBSERVED` (Physical In-Situ Stations)
* **Geographic Coverage:** Station-specific ground weather stations in Pune (Shivajinagar Station ID 43063 at 18.53°N, 73.85°E; Lohegaon Airport Station ID 43062 at 18.58°N, 73.92°E; Pashan AWS).
* **Temporal Coverage:** 1969 to present.
* **Temporal Resolution:** Synoptic observations at 3-hour intervals (00, 03, 06, 09, 12, 15, 18, 21 UTC) or 15-minute/hourly Automatic Weather Station (AWS) logs.
* **Variables Available:** Surface air temperature, relative humidity, wind speed, wind direction, station pressure, rainfall / 24-hr precipitation, visibility, cloud amount.
* **Units:** Temperature (°C), Relative Humidity (%), Wind Speed (knots / km/h), Wind Direction (degrees from true North), Rainfall (mm), Pressure (hPa).
* **Access Method:** Manual online request via the IMD Data Service Portal managed by the National Data Centre (NDC) located in Pune.
* **API Availability:** **No open public REST API** for bulk historical hourly station records. `aws.imd.gov.in` is restricted and not open for programmatic queries.
* **Account Requirement:** **Mandatory**. Requires user enrolment including submission of a valid government ID and an institutional Certificate of Undertaking.
* **Pricing / Payment:** **Chargeable Basis**. Data is priced per station-year and per parameter under official IMD pricing schedules, plus **18% GST**, payable exclusively via the Government of India Non-Tax Receipt Portal ([BharatKosh](https://www.bharatkosh.gov.in/)).
* **Licensing / Restrictions:** Restricted for internal/academic use specified in the undertaking. Commercial redistribution or public open-source repository publishing is restricted.
* **Evaluation for MVP:** While IMD provides ground-truth `OBSERVED` data, it cannot be acquired programmatically and requires financial expenditure, identity submission, and manual administrative review. This directly violates the project constraint against paid datasets and creating external user accounts. Therefore, it is **rejected for the automated MVP pipeline**.

---

### 2.2 Open-Meteo Historical Weather API
* **Official URL:** [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api)
* **Dataset Name:** Open-Meteo Historical Weather Archive (ECMWF ERA5 & ERA5-Land Reanalysis)
* **Data Classification:** `REANALYSIS` (Atmospheric Model Assimilation)
* **Data Provenance:** Derived directly from the European Centre for Medium-Range Weather Forecasts (ECMWF) ERA5-Land high-resolution (9 km / 0.1°) reanalysis dataset and ERA5 (28 km / 0.25°) global atmospheric model.
* **Geographic Coverage:** Global gridded land surface. Exact coordinate point queries automatically map to the nearest high-resolution ERA5-Land grid cell (~10 km resolution). In Pune, resolves differences between industrial Bhosari (18.66°N, 73.84°E), urban Shivajinagar (18.52°N, 73.87°E), and southern Katraj (18.45°N, 73.85°E).
* **Temporal Coverage:** January 1, 1940 to present (updated continuously with a 2-day near-real-time lag).
* **Temporal Resolution:** Exactly **Hourly** (`00:00`, `01:00`, ..., `23:00` UTC).
* **Variables Available:**
  * `temperature_2m`: Air temperature at 2 meters above ground (°C).
  * `relative_humidity_2m`: Relative humidity at 2 meters (%).
  * `dew_point_2m`: Dew point temperature at 2 meters (°C).
  * `precipitation`: Total precipitation (rain + snow water equivalent) (mm).
  * `rain`: Liquid precipitation (mm).
  * `surface_pressure`: Atmospheric air pressure at surface level (hPa).
  * `wind_speed_10m`: Horizontal wind speed at 10 meters above ground (configurable to m/s or km/h).
  * `wind_direction_10m`: Wind direction at 10 meters (degrees, 0° = North).
  * `shortwave_radiation_instant`: Solar downwelling shortwave radiation (W/m²).
  * `cloud_cover`: Total cloud cover percentage (%).
  * `boundary_layer_height`: Planetary boundary layer height above ground (m).
* **Units:** Metric (°C, %, mm, hPa, m/s, °, W/m², m).
* **Access Method:** Open REST API returning standard JSON or CSV. Supports multi-coordinate queries in a single HTTP request.
* **API Availability:** Public RESTful endpoint (`https://archive-api.open-meteo.com/v1/archive`).
* **API Key / Account Requirement:** **None**. No API key and no account registration required for non-commercial open use.
* **Rate Limits:** Up to 10,000 API calls per day and up to 5,000 calls per hour. (Our ingestion requires fewer than 10 calls total).
* **Licensing / Attribution:** Creative Commons Attribution 4.0 International (CC BY 4.0) and Open Database License (ODbL). Requires attribution to "Open-Meteo.com" and "Copernicus Climate Change Service / ECMWF".
* **Evaluation for MVP:** **SELECTED**. It covers the complete target date range (2025-02-18 to 2026-09-24) with zero missing hours (14,016 contiguous records), provides all 5 required variables plus critical atmospheric dispersion variables (PBL height, solar radiation), requires zero API keys or payments, and executes programmatically in under 5 seconds.

---

### 2.3 Copernicus Climate Data Store (CDS) / Direct ERA5
* **Official URL:** [Copernicus Climate Data Store](https://cds.climate.copernicus.eu/)
* **Dataset Name:** ERA5 hourly data on single levels from 1940 to present
* **Data Classification:** `REANALYSIS` (ECMWF ERA5)
* **Data Provenance:** European Centre for Medium-Range Weather Forecasts (ECMWF).
* **Geographic Coverage:** Global regular latitude-longitude grid at 0.25° (~28 km) resolution.
* **Temporal Coverage:** 1940 to present (with 5-day latency for ERA5T).
* **Temporal Resolution:** Hourly.
* **Variables Available:** 2m temperature, 2m dewpoint, 10m u-component of wind, 10m v-component of wind (wind speed and direction must be mathematically computed from vectors), total precipitation, surface pressure, boundary layer height, surface solar radiation downwards.
* **Units:** Kelvin (K), m/s, meters (m), Pascals (Pa), Joules per square meter (J/m²). Requires conversion to standard meteorological units (°C, mm, hPa, W/m²).
* **Access Method:** Programmatic access via `cdsapi` Python client, requiring downloading NetCDF or GRIB files.
* **API Availability:** REST API via CDS-Beta infrastructure.
* **API Key / Account Requirement:** **Mandatory**. Requires individual account creation on the Copernicus portal, accepting dataset terms of use on the web UI, and configuring a `.cdsapirc` file containing a personal access token.
* **Rate Limits / Performance:** Asynchronous request queuing. Requests are queued on European supercomputers and typically take 10 to 45 minutes to execute before the download can begin.
* **Licensing:** Copernicus Open Access Licence (free for commercial and non-commercial use with attribution).
* **Evaluation for MVP:** While ERA5 is the authoritative global reanalysis, accessing it directly via CDS requires user account creation and personal API tokens (violating user friction constraints) and returns raw NetCDF grids with asynchronous queuing. Open-Meteo delivers the exact same underlying ERA5/ERA5-Land data in lightweight, pre-converted JSON/CSV without credentials or queue latency. Therefore, direct CDS is **rejected for the MVP**.

---

### 2.4 NASA POWER (Prediction Of Worldwide Energy Resources)
* **Official URL:** [NASA POWER API Documentation](https://power.larc.nasa.gov/docs/services/api/)
* **Dataset Name:** NASA POWER Hourly Point Meteorological Data (MERRA-2)
* **Data Classification:** `REANALYSIS` / `DATA ASSIMILATION`
* **Data Provenance:** NASA Global Modeling and Assimilation Office (GMAO) Modern-Era Retrospective analysis for Research and Applications, Version 2 (MERRA-2).
* **Geographic Coverage:** Global grid at 0.5° latitude × 0.625° longitude (~55 km × ~65 km).
* **Temporal Coverage:** 1981 to present (typically 2 to 3 months latency).
* **Temporal Resolution:** Hourly.
* **Variables Available:** T2M (temperature at 2m), RH2M (relative humidity at 2m), WS10M (wind speed at 10m), WD10M (wind direction at 10m), PRECTOTCORR (precipitation corrected), PS (surface pressure), ALLSKY_SFC_SW_DWN (solar irradiance).
* **Units:** °C, %, m/s, degrees, mm/hr, kPa.
* **Access Method:** REST API (`https://power.larc.nasa.gov/api/temporal/hourly/point`).
* **API Key / Account Requirement:** None (Open public access).
* **Rate Limits / Performance:** High latency: API calls for multi-month hourly series frequently take 45–90 seconds per point and occasionally encounter gateway timeouts.
* **Spatial Resolution:** Coarse (0.5° × 0.625° grid) — a single grid cell encompasses the entirety of Pune, PCMC, and surrounding rural Western Ghats, unable to resolve microclimatic urban variations.
* **Evaluation for MVP:** Rejected due to coarse spatial resolution (~55 km vs 10 km for ERA5-Land), high API request latency, and longer publication lag compared to Open-Meteo.

---

## 3. Comparison Against Existing OpenAQ Dataset

| Comparison Criterion | OpenAQ Dataset (Acquired) | Open-Meteo Weather Dataset (Selected) | Compatibility & Alignment Strategy |
|---|---|---|---|
| **Target Geography** | Pune Urban Area (6 core stations: Shivajinagar, Mhada, Hadapsar, Bhosari, Katraj, Pashan) | Pune Metropolitan Area (Coordinates: 18.5204°N, 73.8567°E + station coordinates) | **Exact Spatial Alignment**: Weather data can be acquired both as a central urban baseline and per-station grid cell. |
| **Observation Period** | 2025-02-18 20:00:00 UTC to 2026-09-24 17:15:00 UTC | 2025-02-18 00:00:00 UTC to 2026-09-24 23:00:00 UTC | **100% Complete Overlap**: Weather data spans the exact continuous OpenAQ period (14,016 hourly records). |
| **Temporal Resolution** | Nominal 15-minute intervals (`:00`, `:15`, `:30`, `:45`) | Exactly 60-minute intervals (`:00`) | **Hourly Aggregation**: OpenAQ measurements will be resampled to 1-hour means (`00:00-00:59` → `00:00`), matching weather timestamps 1-to-1. |
| **Timezone & Timestamps** | UTC (`datetime_from_utc`) + IST (`UTC+05:30`) | UTC (`iso8601`) + Local IST | **Identical Timestamps**: Both datasets explicitly support UTC ISO-8601 format, eliminating daylight saving or timezone ambiguities. |
| **Data Provenance** | `OBSERVED` (In-situ ground regulatory monitors: CPCB / MPCB / IITM SAFAR) | `REANALYSIS` (ECMWF ERA5 / ERA5-Land atmospheric model assimilation) | **Strict Separation**: OpenAQ is documented as `OBSERVED`; Open-Meteo is explicitly classified as `REANALYSIS`. |
| **Key Overlapping Variables** | Temp, Relative Humidity, Wind Speed (measured at station 11613) | Temp, Relative Humidity, Wind Speed, Wind Direction, Precipitation | **Cross-Validation**: In-situ meteorology from station 11613 can be directly cross-validated against reanalysis estimates. |
| **Missing Data Behavior** | Sporadic instrument offline gaps | Zero temporal gaps (14,016 contiguous hours) | **High Reliability**: Reanalysis provides continuous atmospheric covariates without missing feature vectors. |

---

## 4. Final Selection Rationale

### Preferred Source: **Open-Meteo Historical Weather API (ECMWF ERA5 / ERA5-Land)**
* **Technical Basis:**
  1. **Zero Credential Overhead:** Requires no user registration, no API key, and no payment, fully complying with project rules against creating accounts with user identity or incurring financial charges.
  2. **Complete Coverage:** Delivers all 5 required variables (`temperature`, `relative_humidity`, `wind_speed`, `wind_direction`, `precipitation`) and all 4 optional variables (`surface_pressure`, `dew_point`, `solar_radiation`, `cloud_cover`) plus planetary boundary layer height.
  3. **High Resolution:** 0.1° (~10 km) ERA5-Land resolution resolves topographic and land-use microclimates across the Pune basin.
  4. **Perfect Temporal Match:** Covers all 583 days (14,016 hours) matching the OpenAQ observation window with zero gaps.
  5. **Deterministic & Reproducible:** Fully automated via lightweight REST API calls reproducible in `ml/src/data/ingest_weather.py`.

---

## 5. Preliminary OpenAQ Join Plan

1. **Step 1 (Raw Ingestion):** Download and store raw unmodified Open-Meteo weather JSON and CSV in `ml/data/raw/weather/openmeteo/`.
2. **Step 2 (Hourly Resampling of OpenAQ):** Group 15-minute OpenAQ pollution readings into 1-hour temporal bins using arithmetic mean for concentrations:
   $$\overline{C}_{\text{hour}} = \frac{1}{N} \sum_{i=1}^{N} C_i \quad (N \ge 2)$$
3. **Step 3 (Spatial Mapping):** 
   - Primary mapping: Nearest high-resolution ERA5-Land weather grid coordinate mapped to each OpenAQ station latitude/longitude.
   - Secondary mapping: Central Pune urban weather time-series joined across all stations as synoptic urban covariates.
4. **Step 4 (Timestamp Merge):** Join on `(timestamp_utc, location_id)` or `(timestamp_utc)` using UTC ISO-8601 timestamps.
