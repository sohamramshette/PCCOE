# Traffic Source Inventory & Evaluation Report

**Project:** Urban Environmental Digital Twin  
**Target Geography:** Pune Metropolitan Area (PMC & PCMC), Maharashtra, India  
**Target Temporal Period:** February 18, 2025 to September 24, 2026 (matching OpenAQ and Weather)  
**Evaluation Date:** September 2026  
**Primary Goal:** Identify reliable, reproducible, and legally accessible traffic-related features and proxies to explain spatial-temporal urban PM2.5 concentrations.

---

## 1. Executive Summary Table

| Source | Dataset Name | Pune Coverage | Date Range Evaluated | Resolution | Key Variables Available | Data Classification | Access Protocol | API Key / Account | Licensing / Terms | Status for MVP |
|---|---|---|---|---|---|---|---|---|---|:---:|
| **OpenStreetMap (OSM)** | Overpass API / Geofabrik Road Network | Full Pune & PCMC Metropolitan Area | Current topology / Historical diffs | Road-segment level (vector geometry) | Highway class (`trunk`, `primary`, `secondary`, etc.), lanes, oneway, length, intersection nodes | `STATIC_ROAD_NETWORK` | REST API (Overpass QL) / Direct PBF dump | **None** (Open public access) | Open Database License (ODbL) | **SELECTED** |
| **Pune / PCMC Smart City & Open Data** | PMC / PCMC / OpenCity.in Traffic Portals | Citywide Pune | Historical annual aggregates & sporadic study reports | Annual / Static PDF | Annual vehicle registrations, public bus (PMPML) ridership, outer ring road feasibility surveys | `OBSERVED` (Aggregates) / `STATIC_REPORT` | Web download (`opencity.in`, `data.gov.in`) | None (public web) | Government Open Data License (India) | **REJECTED (MVP)** (No continuous hourly sensor feeds) |
| **TomTom Traffic** | TomTom Traffic Stats / Traffic Flow API | Pune Urban Grid | Real-time (API) / 2025–2026 (Traffic Stats) | Hourly / 15-min (Traffic Stats) | Segment speed, travel time, congestion index, delay | `OBSERVED` (Probe-derived) | Enterprise REST API / MOVE Portal | **Mandatory** account + enterprise commercial contract / sales quote | Proprietary / Commercial paid license | **REJECTED (MVP)** (Requires paid enterprise contract) |
| **Google Maps Platform** | Routes / Distance Matrix API | Global (Pune routes) | Real-time & predictive future only | Per-request travel duration | Duration in traffic, distance, baseline duration | `DERIVED` (Probe model) | Google Cloud API | **Mandatory** GCP account + billing account + API key | Google Maps Platform Terms of Service | **REJECTED (MVP)** (No historical query endpoint for 2025–2026) |
| **Empirical Diurnal Traffic Profile (Pune CMP / IITM)** | Urban Diurnal Emission & Traffic Curves | Pune Core Arterials | Calibrated to Pune metropolitan traffic patterns | **Hourly** (00:00 to 23:00) | Hourly traffic intensity index (0.0–1.0), peak multipliers, weekday vs weekend factors | `TRAFFIC_PROXY` | Programmatic algorithm based on published urban studies | None (Mathematical derivation) | Open Academic / Public Domain | **SELECTED (PROXY)** |

---

## 2. Detailed Source Profiles

### 2.1 OpenStreetMap (OSM) Road Network
* **Official URL:** [OpenStreetMap](https://www.openstreetmap.org/) | [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
* **Dataset Name:** OpenStreetMap Pune Urban Road Network & Highway Hierarchy
* **Provider:** OpenStreetMap Foundation & Global Volunteer Mapping Community
* **Data Classification:** `STATIC_ROAD_NETWORK`
* **Geographic Coverage:** Complete road network coverage across Pune Municipal Corporation (PMC) and Pimpri-Chinchwad Municipal Corporation (PCMC), including dense historical corridors, industrial sectors, and peri-urban highways.
* **Temporal Coverage:** Static physical infrastructure snapshot corresponding to the 2025–2026 operational period.
* **Spatial Resolution:** Meter-level vector geometry (Way and Node coordinates).
* **Variables Available:**
  * `highway`: Road functional class (`trunk`, `primary`, `secondary`, `tertiary`, `residential`, `trunk_link`, `primary_link`, etc.).
  * `geometry`: LineString coordinates connecting ordered nodes.
  * `lanes`: Number of vehicular travel lanes (where tagged).
  * `oneway`: Directionality of vehicle flow (`yes`, `no`).
  * `maxspeed`: Speed limit tagging (where available).
  * `surface`: Paved, asphalt, unpaved.
  * `junction`: Roundabout, traffic signals, intersections.
* **Legitimate Derived Features (for PM2.5 Modeling):**
  * `road_length_500m`, `road_length_1000m`, `road_length_2000m`: Total road length within buffer radii around air quality stations.
  * `major_road_length`: Aggregated length of high-emission corridors (`trunk`, `primary`, `secondary`).
  * `major_road_density`: Major road length divided by buffer area ($\text{km/km}^2$).
  * `distance_to_nearest_major_road`: Minimum Euclidean distance from monitoring station to arterial highway (meters).
  * `intersection_density`: Count of road-network nodes connecting 3 or more ways per $\text{km}^2$.
* **Access Method:** Overpass API (`https://overpass-api.de/api/interpreter`) using Overpass QL queries with spatial buffers around monitoring stations.
* **API Key / Account Requirement:** **None**.
* **Rate Limits:** Polite usage (typically <10 queries per ingestion run; caching responses locally).
* **Licensing:** Open Database License (ODbL). Attribution required: "© OpenStreetMap contributors".
* **Evaluation for MVP:** **SELECTED**. It provides high-precision, reproducible, and verifiable physical road infrastructure data directly surrounding each air quality monitoring station without any credentials or financial requirements.

---

### 2.2 Government & Open Data Portals (PMC, PCMC, data.gov.in, OpenCity)
* **Official URLs:**
  * Pune Municipal Corporation: [https://www.punecorporation.org/](https://www.punecorporation.org/)
  * OpenCity Pune Repository: [https://opencity.in/category/pune/](https://opencity.in/category/pune/)
  * Government of India Open Government Data (OGD): [https://data.gov.in/](https://data.gov.in/)
* **Dataset Name:** Pune Urban Transport, PMPML Public Transit, and Vehicle Registration Records
* **Data Classification:** `OBSERVED` (Coarse Administrative Aggregates) / `STATIC_REPORT`
* **Findings of Government Data Investigation:**
  1. **Absence of Open Continuous Sensor Feeds:** While Pune Smart City Development Corporation Limited (PSCDCL) and Pune Traffic Police operate an Adaptive Traffic Control System (ATCS) and Integrated Traffic Management System (ITMS) with loop detectors and ANPR cameras, **raw continuous telemetry feeds are not published on any open public portal**.
  2. **Available Datasets on OpenCity.in:** Datasets consist of historical annual vehicle registration totals by category (e.g. 2-wheelers, 4-wheelers from 2002–2020), annual PMPML bus performance statistics, and infrastructure surveys (e.g. Outer Ring Road Western Alignment traffic study PDF).
  3. **Absence of Hourly Feeds:** There are no open hourly traffic counts, segment travel speeds, or intersection volume datasets for 2025–2026.
* **Evaluation for MVP:** **REJECTED**. The available open government data lacks the hourly temporal resolution and continuous station-level proximity required to explain dynamic variations in ambient PM2.5.

---

### 2.3 TomTom Traffic Services
* **Official URLs:** [TomTom Developer Portal](https://developer.tomtom.com/) | [TomTom Move](https://move.tomtom.com/)
* **Dataset Names:** TomTom Traffic Stats (Historical Analysis) & TomTom Traffic Flow API (Real-Time)
* **Data Classification:** `OBSERVED` (Probe-derived GPS telemetry aggregation)
* **Findings on TomTom Services:**
  1. **Historical Traffic (TomTom Traffic Stats):** Provides historical average speed, free-flow speed, travel times, and congestion index. However, it is an **enterprise-only commercial product**. Access requires initiating a corporate sales procurement process, executing non-disclosure and licensing contracts, and paying commercial per-region fees.
  2. **Real-Time Traffic (TomTom Traffic Flow API):** Offers a free developer tier (2,500 requests/day) returning current speeds and delays. However, it **does not archive past historical traffic**. Historical queries for past dates (e.g., February 2025) return HTTP 400/403 or are unsupported.
* **Evaluation for MVP:** **REJECTED**. Directly violates the project rules against purchasing datasets, submitting commercial requests, and creating accounts using the user's identity.

---

### 2.4 Google Maps Platform (Routes / Distance Matrix API)
* **Official URL:** [Google Maps Platform Routes API](https://developers.google.com/maps/documentation/routes)
* **Dataset Name:** Distance Matrix & Compute Routes with Traffic
* **Data Classification:** `DERIVED` (Probe model)
* **Findings on Google Maps:**
  1. Google Maps APIs only accept `departure_time` values set to the current time or a future time.
  2. Historical queries for past dates (such as February 2025 – September 2026) are rejected by the API schema.
  3. Access requires an authenticated Google Cloud Platform (GCP) billing account and proprietary API keys.
* **Evaluation for MVP:** **REJECTED**. Lacks historical archive capability and requires active credit card/billing credentials.

---

### 2.5 Empirical Pune Diurnal Traffic Intensity Index
* **Source Reference:** Pune Comprehensive Mobility Plan (CMP), IITM SAFAR High-Resolution Urban Emission Inventory Studies for Pune Metropolitan Region.
* **Data Classification:** `TRAFFIC_PROXY`
* **Methodology:**
  - Urban traffic volume in Indian metropolitan areas displays distinct, highly regularized diurnal cycles.
  - Published Pune traffic surveys demonstrate:
    - **Morning Peak:** 08:30 to 11:30 (commute to commercial and industrial zones, index ~0.85–1.00).
    - **Midday Lull / Secondary Plateau:** 12:00 to 16:30 (index ~0.50–0.65).
    - **Evening Peak:** 17:30 to 21:00 (return commute, peak commercial activity, index ~0.90–1.00).
    - **Late Night Decline:** 21:30 to 00:30 (index ~0.30–0.45).
    - **Nocturnal Trough:** 01:00 to 05:30 (minimum freight and passenger movement, index ~0.05–0.15).
    - **Weekend Attenuation:** ~15–25% reduction in morning peak sharp intensity with shifted weekend shopping peaks.
* **Legitimate Use:** When coupled with spatial road density from OpenStreetMap, this provides a mathematically defensible and reproducible hourly dynamic proxy feature for modeling emissions without fabricating individual vehicle counts.
* **Evaluation for MVP:** **SELECTED AS SECONDARY PROXY**. Explicitly labeled as `TRAFFIC_PROXY`.

---

## 3. Critical Historical Availability Finding

| Question | Factual Finding | Technical Consequence |
|---|---|---|
| **Can we obtain open, reliable, historical observed hourly traffic counts for Pune (2025–2026)?** | **NO.** Government open-data portals do not publish continuous sensor telemetry, and commercial providers gate historical archives behind paid enterprise contracts. | **We must NOT fabricate traffic observations.** Fabricating fake vehicle counts is strictly prohibited. |
| **What is the most defensible, reproducible, and truthful alternative?** | **OpenStreetMap Static Road Network Topology (`STATIC_ROAD_NETWORK`) + Empirical Urban Diurnal Traffic Intensity Index (`TRAFFIC_PROXY`).** | Accurately captures spatial road capacity and proximity around each monitoring station, alongside hourly temporal emission cycles. |

---

## 4. Final Source Selection for MVP

The MVP traffic data strategy combines:
1. **Primary Dataset:** **OpenStreetMap Pune Station Road Network (`osm_pune_road_network`)**
   - Classification: `STATIC_ROAD_NETWORK`
   - Content: Road segments, functional classifications, lane counts, and connectivity within 500 m, 1000 m, and 2000 m spatial radii around the 6 core Pune OpenAQ monitoring stations.
   - Purpose: Explains spatial baseline differences in PM2.5 across stations (e.g. Bhosari industrial highways vs Shivajinagar urban core vs Pashan suburban background).
2. **Complementary Feature:** **Pune Diurnal Traffic Proxy Index (`pune_traffic_proxy`)**
   - Classification: `TRAFFIC_PROXY`
   - Purpose: Captures hourly temporal variations (morning/evening rush hour peaks vs nocturnal troughs).
   - Strict Governance: Never called "observed traffic counts"; clearly documented as a proxy feature in model explainability.
