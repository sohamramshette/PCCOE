# Urban Activity, Industrial, and Construction Source Inventory & Evaluation Report

**Project:** Urban Environmental Digital Twin  
**Target Geography:** Pune Metropolitan Area (PMC & PCMC), Maharashtra, India  
**Target Period:** February 18, 2025 to September 24, 2026 (matching OpenAQ, Weather, and Traffic)  
**Evaluation Date:** September 2026  
**Primary Goal:** Identify reliable, reproducible, and legally accessible activity, industrial, and construction datasets to explain spatial and temporal variations in ambient PM2.5 concentrations.

---

## 1. Executive Summary Table

| Source | Dataset Name | Category | Pune Coverage | Date Range Evaluated | Resolution | Key Variables | Data Classification | Access Protocol | API Key / Account | License | Status for MVP |
|---|---|---|---|---|---|---|---|---|---|---|:---:|
| **OpenStreetMap (OSM)** | Overpass API Activity & Land-Use Extract | Industrial, Construction, Land Use, POI | 1,500m – 3,000m buffer around all 6 core stations | Contemporary Infrastructure Snapshot (2025–2026) | Vector Polygon / Point | `landuse=industrial|construction|commercial|residential`, `amenity=*`, `shop=*`, `man_made=works` | `STATIC_LAND_USE` / `STATIC_INDUSTRIAL` / `CONSTRUCTION_PROXY` / `ACTIVITY_PROXY` | REST API (Overpass QL) | **None** (Open access) | Open Database License (ODbL) | **SELECTED** |
| **MIDC & MPCB** | Industrial Estates & Red/Orange Category Consents | Industrial Activity | Pune Industrial Zones (Bhosari, Hadapsar, Chakan, Pimpri) | Historical annual statistics & portal layouts | Zonal / Regional Office (SRO) | Industrial estate boundaries, count of Red/Orange/Green category manufacturing units | `STATIC_INDUSTRIAL` / `OBSERVED` (Aggregates) | Web Portal (`gis.midcindia.org`, `mpcb.gov.in`) | None (public web) | Government Open Data Policy | **SELECTED (REFERENCE)** |
| **MahaRERA** | Registered Real Estate Construction Projects | Construction Activity | Citywide Pune & PCMC | 2017 to present (Project start/completion dates) | Project-level (Address / Geocode) | Proposed completion date, commencement certificate date, built-up area | `OBSERVED` (Administrative Records) | Search Portal (`maharera.maharashtra.gov.in`) | None (Web UI with CAPTCHA; **no open API**) | Government Portal Terms | **REJECTED (MVP)** (No open bulk API; manual scraping required) |
| **Pune Development Plan (PMC / DP)** | City Land-Use Zoning Maps (2007–2027) | Land Use / Planning | PMC Municipal Limits (243.5 km²) | 2007–2027 statutory plan | Zonal Planning Sectors (Vector/PDF) | Residential, commercial, industrial, agricultural/no-development, public/semi-public zones | `STATIC_LAND_USE` | PMC Town Planning / OpenCity.in | None (PDF / raster download) | Government Public Record | **REJECTED (MVP)** (Static non-machine-readable PDFs; OSM provides vector geometry) |
| **Copernicus Global Human Settlement (GHSL)** | Built-up Surface & Settlement Grid (GHS-BUILT-S) | Urbanization / Built Environment | Global 100m grid | 1975–2030 (multitemporal epochs) | 100m raster grid | Built-up surface area fraction (0–100%) | `SATELLITE_DERIVED_PROXY` | HTTP / FTP download | None (Open access) | Creative Commons Attribution 4.0 (CC BY 4.0) | **CANDIDATE (FUTURE)** (Coarse raster; OSM provides semantic vectors) |
| **NASA / NOAA VIIRS** | Black Marble Nighttime Lights (VNP46A2) | Urban Activity Proxy | Global 500m grid | Daily / Monthly composite (2012 to present) | 500m pixel | Cloud-free nocturnal radiance (nW/cm²/sr) | `SATELLITE_DERIVED_PROXY` | NASA Earthdata API | **Mandatory** NASA Earthdata Login | Open Access (NASA) | **CANDIDATE (FUTURE)** (Cloud gaps during monsoon; heavy raster overhead) |

---

## 2. Detailed Source Profiles & Critical Findings

### 2.1 Category A: Construction Activity Sources
* **MahaRERA (Maharashtra Real Estate Regulatory Authority):**
  * *Official Portal:* [https://maharera.maharashtra.gov.in/](https://maharera.maharashtra.gov.in/)
  * *Investigation Finding:* MahaRERA legally mandates registration for residential and commercial construction projects exceeding 500 m² or 8 apartments. Each filing includes commencement certificates, sanctioned layout plans, and projected completion dates.
  * *Access Limitation:* **There is no official open API or bulk machine-readable open dataset**. The portal is secured behind interactive search forms and CAPTCHAs. Automated retrieval requires fragile third-party web scraping.
  * *Temporal Continuity:* While approved project dates exist, **they do not record daily excavation, demolition, concrete mixing, or active dust-generating works**.
* **PMC Building Permission & Infrastructure Projects:**
  * *Investigation Finding:* Municipal building approvals (BPAMS) are internal administrative records. Public notices cover major transport infrastructure (e.g., Pune Metro Rail Line 3 Hinjawadi-Shivajinagar, University Flyover reconstruction at Ganeshkhind/Shivajinagar, Chandani Chowk grade separator).
* **OpenStreetMap Construction Feature Tagging:**
  * *Investigation Finding:* OSM mappers actively tag physical construction zones: `landuse=construction` (active building sites), `highway=construction` (new road/flyover works), and `railway=construction` (Pune Metro lines).
  * *Classification:* **`CONSTRUCTION_PROXY`**.
  * *MVP Strategy:* Query and record documented active construction zones within station buffers. In accordance with project rules, **no artificial daily time series of construction dust will be fabricated**; instead, construction proximity is treated as a static spatial exposure factor.

---

### 2.2 Category B: Industrial Activity Sources
* **MIDC (Maharashtra Industrial Development Corporation) & MPCB:**
  * *Official Portals:* [MIDC GIS Portal](https://gis.midcindia.org/MIDCGISPortal/) | [MPCB Industrial Statistics](https://www.mpcb.gov.in/industrial-statistics)
  * *Investigation Finding:* The Pune metropolitan region contains major organized industrial manufacturing clusters:
    1. **Bhosari MIDC / Pimpri-Chinchwad (PCMC):** Heavy engineering, automotive assembly, foundries, and metal fabrication (directly surrounding Station 3409331).
    2. **Hadapsar Industrial Estate:** Ancillary manufacturing, food processing, and plastics (directly surrounding Station 60658).
    3. **Swargate / Gultekdi / Marketyard:** Semi-industrial logistics, agro-processing, and light workshops.
  * *OpenCity MPCB Regional Data:* Records indicate over 3,200 active "Red" (high pollution index) and "Orange" (moderate pollution index) industrial units registered under MPCB Sub-Regional Offices Pune-I, Pune-II, and Pimpri-Chinchwad.
* **OpenStreetMap Industrial Spatial Extraction:**
  * *Investigation Finding:* OSM provides exact physical polygon footprints and points for `landuse=industrial`, `man_made=works`, `building=industrial`, and specific industrial facilities.
  * *Classification:* **`STATIC_INDUSTRIAL`** (facility coordinates) and **`INDUSTRIAL_PROXY`** (derived buffer density and proximity).
  * *MVP Strategy:* Calculate exact distance to nearest industrial cluster and total industrial land-use area within station buffers.

---

### 2.3 Category C: Land Use & Built Environment
* **Pune Municipal Corporation Development Plan (DP):**
  * *Official Portal:* [PMC Town Planning Department](https://punecorporation.org/) | [OpenCity Pune DP](https://opencity.in/category/pune/)
  * *Investigation Finding:* The official DP allocates statutory land use (Residential R1/R2, Commercial C1/C2, Industrial I1/I2/I3, Public/Semi-Public, Hill Top/Hill Slope No-Development Zones). However, the municipal data is distributed primarily as non-georeferenced PDF documents and static raster plans, making automated GIS alignment prone to georeferencing error.
* **OpenStreetMap Land-Use Polygons:**
  * *Investigation Finding:* OSM provides fully digitized, georeferenced vector polygons across Pune for:
    * `residential`: Housing developments, colonies.
    * `commercial` / `retail`: Commercial business districts, markets.
    * `industrial`: Manufacturing plants, warehouses.
    * `institutional`: Universities (SPPU), research institutes (IITM, NCL), government complexes.
    * `green_space` / `leisure=park` / `natural=wood`: Urban tree cover, foothills, parks.
  * *Classification:* **`STATIC_LAND_USE`**.
  * *MVP Strategy:* Compute land-use area fractions ($A_{\text{class}} / A_{\text{buffer}}$) within 1,500m circular buffers around all 6 monitoring stations.

---

### 2.4 Category D: General Urban Activity & Points of Interest (POI)
* **Points of Interest Density (Commercial, Institutional, Transit):**
  * *Source:* OpenStreetMap Amenities & Commercial Nodes.
  * *Variables:*
    * Commercial POIs (`shop=*`, `amenity=restaurant|cafe|fast_food|marketplace`)
    * Transportation Hubs (`amenity=bus_station`, `highway=bus_stop`, `railway=station`, `amenity=fuel`)
    * Institutional POIs (`amenity=school|college|university|hospital`)
  * *Classification:* **`ACTIVITY_PROXY`**.
  * *MVP Strategy:* Compute POI counts and spatial density per km² within station buffers to serve as a proxy for daytime human occupancy and secondary commercial emissions (e.g. diesel generators, commercial cooking, delivery vehicles).

---

### 2.5 Category E: Satellite Earth Observation Proxies
* **Evaluated Products:**
  * *Copernicus Global Human Settlement Layer (GHSL):* 100m raster representing built-up surface percentage.
  * *NASA VIIRS Nighttime Lights (VNP46A2):* 500m nocturnal artificial light radiance.
* **Evaluation for MVP:**
  * While satellite data is valuable for macro-regional modeling, Pune's urban core is already saturated in 500m nocturnal lights (blooming effect over the river basin), and satellite imagery suffers from severe cloud contamination during the 4-month Indian Summer Monsoon (June–September).
  * In contrast, OpenStreetMap provides semantic vector distinctions (distinguishing an industrial foundry from a university campus or park) directly at station level without cloud gaps or raster reprojection error.
  * Therefore, satellite raster archives are documented as **Candidate (Future)**, while vector OSM and empirical profiles are **Selected for the MVP**.

---

## 3. Critical Truthfulness & Provenance Rules

| Question | Factual Finding | Technical Constraint |
|---|---|---|
| **Can we obtain daily time-varying construction permits or active construction dust measurements?** | **NO.** Municipal permits are static approvals; daily on-site activity telemetry does not exist openly. | **Do NOT fabricate daily construction time series.** Construction is treated strictly as a static spatial exposure factor (`CONSTRUCTION_PROXY`). |
| **Can we obtain continuous stack emissions from individual industrial smokestacks?** | **NO.** While MPCB monitors certain continuous emission monitoring systems (OCEMS), the raw telemetry is not openly accessible via a public API. | **Do NOT fabricate industrial emissions.** Industrial impact is modeled strictly as spatial proximity and industrial land-use density (`INDUSTRIAL_PROXY`). |
| **Are land-use classifications equivalent to observed pollution?** | **NO.** Land-use is a physical boundary classification (`STATIC_LAND_USE`). | Clearly separated in feature documentation and metadata. |

---

## 4. Final Source Selection for MVP

The acquired activity dataset suite consists of:
1. **`osm_pune_industrial`** (`STATIC_INDUSTRIAL` / `INDUSTRIAL_PROXY`): Industrial land-use polygons, manufacturing works, and estate proximity.
2. **`osm_pune_construction`** (`CONSTRUCTION_PROXY`): Mapped construction sites, transport infrastructure works, and major development footprints.
3. **`osm_pune_landuse`** (`STATIC_LAND_USE`): Area distribution of residential, commercial, industrial, institutional, and green zones.
4. **`osm_pune_poi_activity`** (`ACTIVITY_PROXY`): Point-of-interest density quantifying commercial, civic, and transit activity hubs.
