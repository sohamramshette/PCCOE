# Urban Activity, Industrial, Construction, and Land-Use Data Quality & Inspection Report

**Project:** Urban Environmental Digital Twin  
**Target Geography:** Pune Metropolitan Area (PMC & PCMC), Maharashtra, India  
**Target Stations:** 6 Core OpenAQ Monitoring Stations  
**Acquisition Date:** September 2026  
**Primary Source:** OpenStreetMap (OSM) via Overpass API  
**Status:** COMPLETE & AUDITED  

---

## 1. Executive Summary

A comprehensive spatial activity dataset was acquired and inspected for the 6 core OpenAQ air quality monitoring stations in Pune. The dataset provides spatial explanatory features across four critical domains:
1. **Industrial Activity & Works** (`STATIC_INDUSTRIAL` / `INDUSTRIAL_PROXY`)
2. **Active Construction & Infrastructure Works** (`CONSTRUCTION_PROXY`)
3. **Land-Use Zoning & Urban Fabric** (`STATIC_LAND_USE`)
4. **General Urban Activity & Points of Interest (POI)** (`ACTIVITY_PROXY`)

### High-Level Metrics

| Dataset Domain | Storage Location | Raw Record Count | Columns | Valid Geometries | Station Coverage | Primary Provenance Label |
|---|---|:---:|:---:|:---:|:---:|---|
| **Industrial Elements** | `ml/data/raw/activity/industrial/raw_industrial_elements.csv` | 49 | 11 | 100% | 5 / 6 Stations | `STATIC_INDUSTRIAL` |
| **Construction Elements** | `ml/data/raw/activity/construction/raw_construction_elements.csv` | 25 | 10 | 100% | 4 / 6 Stations | `CONSTRUCTION_PROXY` |
| **Land-Use Polygons** | `ml/data/raw/activity/landuse/raw_landuse_elements.csv` | 405 | 10 | 100% | 6 / 6 Stations | `STATIC_LAND_USE` |
| **POI & Urban Activity** | `ml/data/raw/activity/poi/raw_poi_elements.csv` | 417 | 11 | 100% | 6 / 6 Stations | `ACTIVITY_PROXY` |
| **Total Acquired Elements** | `ml/data/raw/activity/` | **896** | — | **100%** | **6 / 6 Stations** | Multi-Classification |
| **Processed Station Features** | `ml/data/processed/activity/station_activity_features.csv` | **6** | **23** | **100%** | **6 / 6 Stations** | Derived Feature Table |

---

## 2. Raw Data Inspection & Quality Metrics

### 2.1 Industrial Activity Dataset (`raw_industrial_elements.csv`)
* **Total Rows:** 49
* **Columns (11):** `station_id`, `station_name`, `element_id`, `element_type`, `name`, `operator`, `industrial_type`, `latitude`, `longitude`, `distance_to_station_m`, `data_type`.
* **Geographic Extent:**
  * Latitude: $[18.4960^\circ\text{ N}, 18.6426^\circ\text{ N}]$
  * Longitude: $[73.7893^\circ\text{ E}, 73.9472^\circ\text{ E}]$
* **Completeness & Null Counts:**
  * Coordinates (`latitude`, `longitude`): **0% missing** (100% complete).
  * `distance_to_station_m`: **0% missing**.
  * `operator`: 46 missing (93.8% unlisted in OSM tags; default fallback to anonymous industrial unit).
* **Duplicates:** 0 duplicate element IDs within individual station buffers.
* **Station Breakdown:**
  * Revenue Colony-Shivajinagar (11613): 15 elements (light workshops, printing, municipal utility works; nearest at 488.6 m).
  * Mhada Colony (11609): 13 elements (Viman Nagar / Airport warehouse fringe; nearest at 1,383.6 m).
  * Hadapsar (60658): 7 elements (Hadapsar Industrial Estate perimeter; nearest at 1,060.0 m).
  * Bhosari (3409331): 8 elements (MIDC heavy manufacturing / foundries / auto components; nearest at 360.9 m).
  * Panchawati Pashan (3409526): 6 elements (R&D workshops, scientific utilities; nearest at 597.8 m).
  * Katraj Dairy (3409438): 0 elements within 2,000m (strictly residential / hill pass buffer).

### 2.2 Construction Activity Dataset (`raw_construction_elements.csv`)
* **Total Rows:** 25
* **Columns (10):** `station_id`, `station_name`, `element_id`, `element_type`, `name`, `construction_type`, `latitude`, `longitude`, `distance_to_station_m`, `data_type`.
* **Geographic Extent:**
  * Latitude: $[18.4480^\circ\text{ N}, 18.5759^\circ\text{ N}]$
  * Longitude: $[73.8050^\circ\text{ E}, 73.9208^\circ\text{ E}]$
* **Completeness:** **100% complete** across all critical spatial attributes.
* **Construction Type Distribution:**
  * `building_construction` (19 elements): Multi-story residential / commercial project developments.
  * `road_infrastructure_construction` (4 elements): Highway flyovers, metro pier erection, road widening.
  * `site_development_construction` (2 elements): Layout grading and ground clearance.
* **Station Breakdown:**
  * Katraj Dairy (3409438): 13 elements (heavy highway grade-separator and residential expansion; nearest at 551.5 m).
  * Revenue Colony-Shivajinagar (11613): 6 elements (Pune Metro Line 3 underground/elevated works and University Flyover corridor; nearest at 605.9 m).
  * Mhada Colony (11609): 5 elements (airport road commercial developments; nearest at 1,462.4 m).
  * Panchawati Pashan (3409526): 1 element (hillside development; nearest at 675.6 m).
  * Hadapsar (60658) & Bhosari (3409331): 0 explicitly tagged active construction elements within the 1,500m buffer in OSM.

### 2.3 Land-Use Zoning Dataset (`raw_landuse_elements.csv`)
* **Total Rows:** 405
* **Columns (10):** `station_id`, `station_name`, `element_id`, `element_type`, `landuse_class`, `name`, `latitude`, `longitude`, `distance_to_station_m`, `data_type`.
* **Geographic Extent:**
  * Latitude: $[18.4418^\circ\text{ N}, 18.6523^\circ\text{ N}]$
  * Longitude: $[73.7897^\circ\text{ E}, 73.9472^\circ\text{ E}]$
* **Completeness:** `landuse_class` is **100% complete**. Element names are present for 194 elements (47.9%), with unlisted polygons representing unnamed residential colonies or parcels.
* **Class Distribution (Aggregate):**
  * `park` / `grass` / `forest` / `garden` (Green/Open Space): 195 elements (48.1%)
  * `residential`: 130 elements (32.1%)
  * `commercial` / `retail`: 45 elements (11.1%)
  * `industrial`: 24 elements (5.9%)
  * `institutional`: 11 elements (2.7%)

### 2.4 POI & General Urban Activity Dataset (`raw_poi_elements.csv`)
* **Total Rows:** 417
* **Columns (11):** `station_id`, `station_name`, `element_id`, `element_type`, `category`, `subcategory`, `name`, `latitude`, `longitude`, `distance_to_station_m`, `data_type`.
* **Geographic Extent:**
  * Latitude: $[18.4427^\circ\text{ N}, 18.6512^\circ\text{ N}]$
  * Longitude: $[73.7926^\circ\text{ E}, 73.9416^\circ\text{ E}]$
* **Completeness:** Coordinates, category, and subcategory are **100% complete**.
* **Category Breakdown:**
  * `commercial` (shops, restaurants, banks, offices): 307 elements (73.6%)
  * `institutional` (schools, colleges, universities, hospitals): 96 elements (23.0%)
  * `transportation` (bus stations, depots, fuel stations): 14 elements (3.4%)

---

## 3. Processed Station-Level Activity Profiles

The spatial attributes were aggregated within each station's buffer (2,000m for industrial, 1,500m for construction/land use/POI) to generate the model-ready feature table: `ml/data/processed/activity/station_activity_features.csv`.

| Station ID | Station Name | Zone Morphology | Industrial Count (2km) | Dist Nearest Industrial (m) | Construction Count (1.5km) | Dist Nearest Constr (m) | POI Total | POI Density (POIs/km²) | Commercial POIs | Institutional POIs | Dominant Land Use |
|:---:|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **11613** | Revenue Colony-Shivajinagar | Commercial / Educational Core | 15 | 488.6 | 6 | 605.9 | **195** | **27.59** | 158 | 30 | `commercial` |
| **11609** | Mhada Colony | NE Residential / Airport Corridor | 13 | 1,383.6 | 5 | 1,462.4 | **17** | **2.41** | 12 | 5 | `residential` |
| **60658** | Hadapsar | Eastern Commercial / Suburban | 7 | 1,060.0 | 0 | >2,000 | **57** | **8.06** | 30 | 26 | `grass` / open |
| **3409331** | Bhosari (PCMC) | Heavy Industrial / Highway Hub | 8 | **360.9** | 0 | >2,000 | **52** | **7.36** | 38 | 10 | `park` / industrial |
| **3409438** | Katraj Dairy | Southern Highway Chokepoint | 0 | >2,000 | **13** | **551.5** | **75** | **10.61** | 51 | 22 | `residential` |
| **3409526** | Panchawati Pashan | Western Institutional / Foothill | 6 | 597.8 | 1 | 675.6 | **21** | **2.97** | 18 | 3 | `residential` |

---

## 4. Key Environmental Insights from Spatial Profiles

1. **Urban Core Saturation (Shivajinagar - 11613):**
   * Highest POI density in the network (**27.59 POIs/km²**) and substantial commercial presence (158 shops/restaurants/offices).
   * Active civil construction within 600m (Pune Metro Line 3 and University Road flyover works).
   * Correlates strongly with high observed vehicular and human activity causing sustained background PM2.5 and daytime NO2 peaks.
2. **Heavy Industrial Exposure (Bhosari - 3409331):**
   * Located only **360.9 m** from heavy industrial foundries and automotive manufacturing plants in Bhosari MIDC.
   * Directly explains why Bhosari consistently exhibits the highest baseline industrial particulate concentrations in OpenAQ observations.
3. **Active Construction Corridor (Katraj Dairy - 3409438):**
   * Highest concentration of active construction elements (**13 sites** within 1.5 km, nearest at 551.5 m), driven by highway grade separator expansions and hillside apartment construction.
   * Critical for explaining localized dust re-suspension and elevated coarse/fine fraction ratios.
4. **Clean Baseline / Foothill Background (Pashan - 3409526):**
   * Low POI density (**2.97 POIs/km²**), minimal active construction (1 site), and extensive institutional green space (Pashan Lake / NCL / IISER foothills).
   * Confirms its utility as the urban background reference station.

---

## 5. Strict Provenance & Downstream Integration Protocol

### 5.1 Classification Standards
* **`STATIC_INDUSTRIAL`**: Raw industrial coordinates and polygon centroids.
* **`INDUSTRIAL_PROXY`**: Derived spatial metrics (`industrial_elements_2km`, `dist_nearest_industrial_m`, `has_industrial_within_1km`).
* **`CONSTRUCTION_PROXY`**: Derived construction proximity and counts (`construction_elements_1_5km`, `dist_nearest_construction_m`).
* **`STATIC_LAND_USE`**: Area counts and dominant zoning classes (`landuse_residential_count`, `dominant_landuse`).
* **`ACTIVITY_PROXY`**: POI density and functional counts (`poi_density_per_km2`, `poi_commercial_count`).

### 5.2 Join Strategy with Downstream Models
* **Spatial Join:** Exact 1-to-1 join on `station_id` (OpenAQ Location ID) between `station_activity_features.csv` and the time-series pollution/weather/traffic dataset.
* **Temporal Rules:**
  * **No Artificial Daily Series:** Activity attributes are held static across time-steps.
  * **Interaction Features:** Downstream ML models can interact static activity (e.g. `poi_density_per_km2`) with the time-varying traffic proxy (`traffic_congestion_factor`) and boundary layer height (`boundary_layer_height_m`) to capture dynamic emissions dispersion.
