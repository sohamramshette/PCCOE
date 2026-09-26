# OpenAQ Pune Monitoring Locations & Sensor Inventory

**Dataset:** OpenAQ Air Quality Data (API v3)  
**Target Geography:** Pune Urban Area (Pune Municipal Corporation & Pimpri-Chinchwad Municipal Corporation), Maharashtra, India  
**Investigation Date:** September 2026  
**Status:** Evaluated and Classified  

---

## 1. Executive Summary

A comprehensive spatial and temporal discovery was conducted via the **OpenAQ API v3** across the Pune metropolitan area (`18.35°N` to `18.80°N`, `73.65°E` to `74.15°E`). 

A total of **19 monitoring locations** and **214 distinct sensor entities** were discovered, verified, and mapped. These stations represent continuous air quality monitoring installations operated by the Central Pollution Control Board (**CPCB**), Maharashtra Pollution Control Board (**MPCB**), and the Indian Institute of Tropical Meteorology (**IITM SAFAR**).

### Key Findings
1. **Primary Target (PM2.5):** All 19 stations feature PM2.5 monitoring. A total of **622,262 PM2.5 observations** are recorded across the historical and contemporary networks.
2. **Co-Pollutants:**
   - **PM10:** Available at all 19 stations (619,902 observations).
   - **NO2:** Available at 18 stations (595,101 observations).
   - **CO & O3:** Available across all stations (630,453 and 630,210 observations respectively).
   - **SO2:** Available at 10 stations (273,867 observations).
3. **Meteorological Variables:**
   - **Temperature, Relative Humidity, Wind Speed, and Wind Direction** are co-located at 15 monitoring stations.
4. **Temporal Clustering (Two Distinct Eras):**
   - **Contemporary Synchronized Network (Feb 18, 2025 – Sep 24, 2026):** 14 stations operate concurrently with continuous 15-minute resolution, providing over 4.9 million active parameter readings.
   - **Historical Baseline Network (2016 / 2020 – Jul 2022):** 7 stations operated during earlier monitoring phases before an ingestion hiatus between July 2022 and February 2025.

---

## 2. Monitoring Locations Overview

| Location ID | Location Name | Latitude | Longitude | Provider / Source | City / Subregion | Status | Total Sensors |
| ----------- | ------------- | -------: | --------: | ----------------- | ---------------- | ------ | ------------: |
| **2585** | AAQMS Karve Road Pune | 18.4975 | 73.8135 | CPCB | Pune (Kothrud/Karve Rd) | Retired (2016–2018) | 5 |
| **5661** | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | CPCB / MPCB | Pune (Karve Rd) | Inactive (May 2025) | 18 |
| **11608** | Bhosari, Pune - IITM | 18.6401 | 73.8490 | caaqm / IITM | PCMC (Bhosari) | Retired (2020–2022) | 5 |
| **11609** | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | CPCB / IITM | Pune (Viman Nagar/Lohagaon) | **Active** | 16 |
| **11610** | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | CPCB / IITM | PCMC (Nigdi) | **Active** | 11 |
| **11613** | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | CPCB / IITM | Pune (Shivajinagar Core) | **Active** | 18 |
| **12042** | Alandi, Pune - IITM | 18.6751 | 73.8927 | CPCB / IITM | Northern Fringe (Alandi) | Retired (2020–2022) | 5 |
| **60658** | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | CPCB / IITM | Pune (Hadapsar East) | **Active** | 16 |
| **60660** | MIT-Kothrud, Pune - IITM | 18.5178 | 73.8215 | caaqm / IITM | Pune (Kothrud West) | Retired (2021–2022) | 5 |
| **3409331** | Bhosari, Pune - IITM | 18.6401 | 73.8490 | CPCB / IITM | PCMC (Bhosari Industrial) | **Active** | 11 |
| **3409435** | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | CPCB / MPCB | PCMC (Gavalinagar) | **Active** | 12 |
| **3409436** | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | CPCB / MPCB | PCMC (Wakad IT Corridor) | **Active** | 12 |
| **3409437** | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | CPCB / MPCB | PCMC (Thergaon) | **Active** | 12 |
| **3409438** | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | CPCB / MPCB | Pune (Katraj South) | **Active** | 12 |
| **3409439** | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | CPCB / MPCB | Pune (University / West) | **Active** | 12 |
| **3409523** | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | CPCB / IITM | PCMC (Wakad/Bhumkar) | **Active** | 11 |
| **3409526** | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | CPCB / IITM | Pune (Pashan / IISER) | **Active** | 11 |
| **3409528** | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | CPCB / IITM | PCMC (Bhosari/Savta Mali) | **Active** | 11 |
| **3410005** | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | IITM SAFAR | Pune (Dhankawadi South) | **Active** | 11 |

---

## 3. Parameter Availability & Distribution

The OpenAQ API v3 returns individual sensors per parameter per station. The table below outlines the availability of requested target pollutants and meteorological variables:

| Variable | Requested in Task | OpenAQ Parameter Name | Available Stations | Total Observations | Measurement Units | Status in Pune |
| -------- | :---------------: | --------------------- | -----------------: | ------------------: | ----------------- | -------------- |
| **PM2.5** | Yes (Primary) | `pm25` | 19 / 19 | 622,262 | µg/m³ | **Confirmed (Universal)** |
| **PM10** | Yes | `pm10` | 19 / 19 | 619,902 | µg/m³ | **Confirmed (Universal)** |
| **NO2** | Yes | `no2` | 18 / 19 | 595,101 | µg/m³, ppb | **Confirmed (Widespread)** |
| **CO** | Yes | `co` | 19 / 19 | 630,453 | µg/m³, ppb | **Confirmed (Universal)** |
| **O3** | Yes | `o3` | 19 / 19 | 630,210 | µg/m³ | **Confirmed (Universal)** |
| **SO2** | Yes | `so2` | 10 / 19 | 273,867 | µg/m³, ppb | **Confirmed (Subset)** |
| **NO** | Additional | `no` | 15 / 19 | 521,686 | ppb | **Confirmed** |
| **NOx** | Additional | `nox` | 15 / 19 | 312,693 | ppb | **Confirmed** |
| **Temperature** | Yes (Meteo) | `temperature` | 15 / 19 | 414,755 | °C | **Confirmed (Co-located)** |
| **Rel. Humidity** | Yes (Meteo) | `relativehumidity` | 15 / 19 | 422,497 | % | **Confirmed (Co-located)** |
| **Wind Speed** | Yes (Meteo) | `wind_speed` | 15 / 19 | 252,830 | m/s | **Confirmed (Co-located)** |
| **Wind Direction** | Yes (Meteo) | `wind_direction` | 15 / 19 | 253,848 | deg | **Confirmed (Co-located)** |

---

## 4. Complete Sensor Inventory

Below is the complete inventory of all 214 sensor entities across Pune monitoring locations, indicating parameter, units, verified operational timeframes, sampling resolution, and operational status.

| Location ID | Location | Latitude | Longitude | Parameter | Unit | Start | End | Resolution | Status |
| ----------- | -------- | -------: | --------: | --------- | ---- | ----- | --- | ---------- | ------ |
| 2585 | AAQMS Karve Road Pune | 18.4975 | 73.8135 | co | µg/m³ | 2016-03-21 | 2018-02-22 | 15 min | Retired (Historical) |
| 2585 | AAQMS Karve Road Pune | 18.4975 | 73.8135 | o3 | µg/m³ | 2016-03-21 | 2018-02-22 | 15 min | Retired (Historical) |
| 2585 | AAQMS Karve Road Pune | 18.4975 | 73.8135 | pm10 | µg/m³ | 2016-03-21 | 2018-02-22 | 15 min | Retired (Historical) |
| 2585 | AAQMS Karve Road Pune | 18.4975 | 73.8135 | pm25 | µg/m³ | 2016-03-21 | 2018-02-22 | 15 min | Retired (Historical) |
| 2585 | AAQMS Karve Road Pune | 18.4975 | 73.8135 | so2 | µg/m³ | 2017-06-19 | 2018-02-22 | 15 min | Retired (Historical) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | co | µg/m³ | 2018-03-09 | 2022-10-10 | 1 hour | Retired (Historical) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | co | ppb | 2025-02-18 | 2025-05-23 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | no | ppb | 2025-02-18 | 2025-05-23 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | no2 | µg/m³ | 2018-03-09 | 2022-10-10 | 1 hour | Retired (Historical) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | no2 | ppb | 2025-02-18 | 2025-05-23 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | nox | ppb | N/A | N/A | 15 min | Unknown |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | o3 | µg/m³ | 2018-03-09 | 2022-10-10 | 1 hour | Retired (Historical) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | o3 | µg/m³ | 2025-02-18 | 2025-05-23 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | pm10 | µg/m³ | 2018-03-09 | 2022-10-10 | 1 hour | Retired (Historical) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | pm10 | µg/m³ | 2025-02-18 | 2025-03-13 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | pm25 | µg/m³ | 2018-03-09 | 2022-10-10 | 1 hour | Retired (Historical) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | pm25 | µg/m³ | 2025-02-18 | 2025-05-23 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | relativehumidity | % | 2025-02-18 | 2025-05-23 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | so2 | µg/m³ | 2018-03-09 | 2022-10-10 | 1 hour | Retired (Historical) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | so2 | ppb | 2025-02-18 | 2025-05-23 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | temperature | c | 2025-02-18 | 2025-05-23 | 1 hour | Inactive (2025) |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | wind_direction | deg | N/A | N/A | 15 min | Unknown |
| 5661 | Karve Road Pune, Pune - MPCB | 18.5012 | 73.8166 | wind_speed | m/s | N/A | N/A | 15 min | Unknown |
| 11608 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | co | µg/m³ | 2020-11-13 | 2022-07-07 | 15 min | Retired (Historical) |
| 11608 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | no2 | µg/m³ | 2020-11-13 | 2022-07-07 | 15 min | Retired (Historical) |
| 11608 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | o3 | µg/m³ | 2020-11-13 | 2022-07-07 | 15 min | Retired (Historical) |
| 11608 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | pm10 | µg/m³ | 2020-11-13 | 2022-07-07 | 15 min | Retired (Historical) |
| 11608 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | pm25 | µg/m³ | 2020-11-13 | 2022-07-07 | 15 min | Retired (Historical) |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | co | µg/m³ | 2020-11-13 | 2022-10-16 | 1 hour | Retired (Historical) |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | no2 | µg/m³ | 2020-11-13 | 2022-10-16 | 1 hour | Retired (Historical) |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | o3 | µg/m³ | 2020-11-13 | 2022-10-16 | 1 hour | Retired (Historical) |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | pm10 | µg/m³ | 2020-11-13 | 2022-06-22 | 1 hour | Retired (Historical) |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | pm25 | µg/m³ | 2020-11-13 | 2022-06-22 | 1 hour | Retired (Historical) |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | relativehumidity | % | 2026-01-06 | 2026-08-06 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | temperature | c | 2026-01-06 | 2026-08-06 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | wind_direction | deg | 2025-10-10 | 2026-08-06 | 1 hour | Active |
| 11609 | Mhada Colony, Pune - IITM | 18.5730 | 73.9277 | wind_speed | m/s | 2025-10-10 | 2026-08-06 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | relativehumidity | % | 2025-03-01 | 2025-12-22 | 1 hour | Inactive (2025) |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | temperature | c | 2025-03-01 | 2026-08-06 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | wind_direction | deg | 2025-10-10 | 2026-08-06 | 1 hour | Active |
| 11610 | Transport Nagar-Nigdi, Pune - IITM | 18.6643 | 73.7640 | wind_speed | m/s | 2025-10-10 | 2026-08-06 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | co | µg/m³ | 2020-11-13 | 2022-07-07 | 1 hour | Retired (Historical) |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | no2 | µg/m³ | 2020-11-13 | 2022-07-07 | 1 hour | Retired (Historical) |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | o3 | µg/m³ | 2020-11-13 | 2022-07-07 | 1 hour | Retired (Historical) |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | pm10 | µg/m³ | 2020-11-13 | 2022-07-07 | 1 hour | Retired (Historical) |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | pm25 | µg/m³ | 2020-11-13 | 2022-07-07 | 1 hour | Retired (Historical) |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | relativehumidity | % | 2025-02-18 | 2026-08-21 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | so2 | µg/m³ | 2020-11-13 | 2022-07-07 | 1 hour | Retired (Historical) |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | so2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | temperature | c | 2025-02-18 | 2026-08-21 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | wind_direction | deg | 2025-10-10 | 2026-08-21 | 1 hour | Active |
| 11613 | Revenue Colony-Shivajinagar, Pune - IITM | 18.5301 | 73.8496 | wind_speed | m/s | 2025-10-10 | 2026-08-21 | 1 hour | Active |
| 12042 | Alandi, Pune - IITM | 18.6751 | 73.8927 | co | µg/m³ | 2020-12-16 | 2022-07-21 | 1 hour | Retired (Historical) |
| 12042 | Alandi, Pune - IITM | 18.6751 | 73.8927 | no2 | µg/m³ | 2020-12-16 | 2022-07-21 | 1 hour | Retired (Historical) |
| 12042 | Alandi, Pune - IITM | 18.6751 | 73.8927 | o3 | µg/m³ | 2020-12-16 | 2022-07-21 | 1 hour | Retired (Historical) |
| 12042 | Alandi, Pune - IITM | 18.6751 | 73.8927 | pm10 | µg/m³ | 2020-12-16 | 2022-07-21 | 1 hour | Retired (Historical) |
| 12042 | Alandi, Pune - IITM | 18.6751 | 73.8927 | pm25 | µg/m³ | 2020-12-16 | 2022-07-21 | 1 hour | Retired (Historical) |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | co | µg/m³ | 2021-01-12 | 2022-06-22 | 1 hour | Retired (Historical) |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | no2 | µg/m³ | 2021-01-12 | 2022-06-22 | 1 hour | Retired (Historical) |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | o3 | µg/m³ | 2021-01-12 | 2022-06-22 | 1 hour | Retired (Historical) |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | pm10 | µg/m³ | 2021-01-12 | 2022-06-22 | 1 hour | Retired (Historical) |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | pm25 | µg/m³ | 2021-01-12 | 2022-06-22 | 1 hour | Retired (Historical) |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | relativehumidity | % | 2025-02-18 | 2026-07-27 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | temperature | c | 2025-02-18 | 2026-07-27 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | wind_direction | deg | 2025-10-10 | 2026-07-27 | 1 hour | Active |
| 60658 | Hadapsar, Pune - IITM | 18.5018 | 73.9275 | wind_speed | m/s | 2025-10-10 | 2026-07-27 | 1 hour | Active |
| 60660 | MIT-Kothrud, Pune - IITM | 18.5178 | 73.8215 | co | µg/m³ | 2021-01-12 | 2022-07-11 | 15 min | Retired (Historical) |
| 60660 | MIT-Kothrud, Pune - IITM | 18.5178 | 73.8215 | no2 | µg/m³ | 2021-01-12 | 2022-07-11 | 15 min | Retired (Historical) |
| 60660 | MIT-Kothrud, Pune - IITM | 18.5178 | 73.8215 | o3 | µg/m³ | 2021-01-12 | 2022-07-11 | 15 min | Retired (Historical) |
| 60660 | MIT-Kothrud, Pune - IITM | 18.5178 | 73.8215 | pm10 | µg/m³ | 2021-01-12 | 2022-07-11 | 15 min | Retired (Historical) |
| 60660 | MIT-Kothrud, Pune - IITM | 18.5178 | 73.8215 | pm25 | µg/m³ | 2021-01-12 | 2022-07-11 | 15 min | Retired (Historical) |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | co | ppb | 2025-02-25 | 2026-09-24 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | no | ppb | 2025-02-25 | 2026-09-24 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | no2 | ppb | 2025-02-25 | 2026-09-24 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | nox | ppb | 2025-12-11 | 2026-09-24 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | o3 | µg/m³ | 2025-02-25 | 2026-09-24 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | pm10 | µg/m³ | 2025-02-25 | 2026-09-24 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | pm25 | µg/m³ | 2025-02-25 | 2026-09-24 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | relativehumidity | % | 2025-02-25 | 2026-08-06 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | temperature | c | 2025-02-25 | 2026-08-06 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | wind_direction | deg | 2025-12-11 | 2026-08-06 | 1 hour | Active |
| 3409331 | Bhosari, Pune - IITM | 18.6401 | 73.8490 | wind_speed | m/s | 2025-12-11 | 2026-08-06 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | relativehumidity | % | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | so2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | temperature | c | 2025-02-18 | 2026-06-23 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | wind_direction | deg | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409435 | Gavalinagar, Pimpri Chinchwad - MPCB | 18.6367 | 73.8249 | wind_speed | m/s | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | relativehumidity | % | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | so2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | temperature | c | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | wind_direction | deg | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409436 | Park Street Wakad, Pimpri Chinchwad - MPCB | 18.5905 | 73.7795 | wind_speed | m/s | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | co | ppb | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | no | ppb | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | no2 | ppb | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | o3 | µg/m³ | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | pm10 | µg/m³ | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | pm25 | µg/m³ | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | relativehumidity | % | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | so2 | ppb | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | temperature | c | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | wind_direction | deg | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409437 | Thergaon, Pimpri Chinchwad - MPCB | 18.6163 | 73.7658 | wind_speed | m/s | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | co | ppb | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | no | ppb | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | no2 | ppb | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | o3 | µg/m³ | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | pm10 | µg/m³ | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | pm25 | µg/m³ | 2025-02-19 | 2026-09-23 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | relativehumidity | % | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | so2 | ppb | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | temperature | c | 2025-02-19 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | wind_direction | deg | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409438 | Katraj Dairy, Pune - MPCB | 18.4545 | 73.8542 | wind_speed | m/s | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | relativehumidity | % | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | so2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | temperature | c | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | wind_direction | deg | 2025-10-12 | 2026-09-24 | 1 hour | Active |
| 3409439 | Savitribai Phule Pune University, Pune - MPCB | 18.5471 | 73.8269 | wind_speed | m/s | 2025-10-12 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | relativehumidity | % | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | temperature | c | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | wind_direction | deg | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409523 | Bhumkar Nagar, Pune - IITM | 18.6058 | 73.7500 | wind_speed | m/s | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | relativehumidity | % | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | temperature | c | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | wind_direction | deg | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409526 | Panchawati_Pashan, Pune - IITM | 18.5365 | 73.8055 | wind_speed | m/s | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | co | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | relativehumidity | % | 2025-03-01 | 2026-03-18 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | temperature | c | 2025-03-01 | 2026-03-18 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | wind_direction | deg | 2026-03-18 | 2026-03-18 | 1 hour | Active |
| 3409528 | Savta Mali Nagar, Pimpri-Chinchwad - IITM | 18.6148 | 73.7995 | wind_speed | m/s | 2026-03-18 | 2026-03-18 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | co | ppb | 2025-02-18 | 2026-09-22 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | no | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | no2 | ppb | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | nox | ppb | 2025-10-10 | 2026-09-24 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | o3 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | pm10 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | pm25 | µg/m³ | 2025-02-18 | 2026-09-24 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | relativehumidity | % | 2025-02-18 | 2026-09-09 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | temperature | c | 2025-02-18 | 2026-09-09 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | wind_direction | deg | 2025-10-10 | 2026-07-08 | 1 hour | Active |
| 3410005 | Dhankawadi, Pune - IITM | 18.4599 | 73.8522 | wind_speed | m/s | 2025-10-10 | 2026-07-08 | 1 hour | Active |

---

## 5. Temporal Coverage & Era Comparison

### Era 1: Historical Pioneer Monitoring (2016 – mid 2022)
- Early stations established by CPCB and IITM SAFAR.
- Locations: Karve Road (2585 & 5661), Shivajinagar (11613), Mhada Colony (11609), Hadapsar (60658), Bhosari (11608), Alandi (12042), MIT-Kothrud (60660).
- Peak overlapping continuity: **November 2020 – July 2022** (~20 months).
- Characterized by lower sensor counts per station and retired sensor IDs.

### Era 2: Contemporary High-Density Multi-Station Grid (Feb 2025 – Sep 2026)
- Standardized, modernized 14-station network deployed across PMC and PCMC.
- Start Date: **February 18, 2025** across all stations.
- End Date: **September 24, 2026** (continuous near-real-time streaming).
- Continuity: Over 19 months of uninterrupted, highly synchronized 15-minute observations.
- All stations feature co-located PM2.5, PM10, NO2, CO, O3, Temperature, Relative Humidity, Wind Speed, and Wind Direction.

---

## 6. Selection Recommendations for MVP

1. **Recommended Coverage Period:** **February 18, 2025 – September 24, 2026** (~19 months).
   - **Factual Basis:** This period offers 14 concurrent stations with identical temporal bounds, co-located meteorology, 15-minute frequency, and zero inter-station drift.
2. **Benchmark Central Station:** **Location 11613 (Revenue Colony - Shivajinagar)**.
   - Longest operational pedigree, central urban location, all pollutants and meteorological variables present with >38,000 raw readings.
3. **Multi-Station Spatial Envelope:**
   - Central: Shivajinagar (11613)
   - East: Hadapsar (60658)
   - North-East: Mhada Colony (11609)
   - South: Katraj Dairy (3409438) & Dhankawadi (3410005)
   - West / University: Savitribai Phule Pune University (3409439) & Pashan (3409526)
   - North / Industrial (PCMC): Bhosari (3409331), Wakad (3409436), Thergaon (3409437), Nigdi (11610).
