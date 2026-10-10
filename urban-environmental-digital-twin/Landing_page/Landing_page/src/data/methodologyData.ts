/**
 * Documented Dataset, Sources & Feature Engineering Methodology Specifications
 * Source of Truth: docs/dataset/integration_schema.md and docs/ml/feature_engineering_report.md
 */

export interface DataSourceClassification {
  sourceName: string;
  classification: 'OBSERVED' | 'REANALYSIS' | 'STATIC_ROAD_NETWORK' | 'TRAFFIC_PROXY' | 'STATIC_INDUSTRIAL' | 'CONSTRUCTION_PROXY' | 'STATIC_LAND_USE' | 'ACTIVITY_PROXY';
  role: string;
  updateFrequency: string;
  coverage: string;
}

export const DATA_SOURCE_CLASSIFICATIONS: DataSourceClassification[] = [
  {
    sourceName: 'OpenAQ REST API v3 / CPCB CAAQMN',
    classification: 'OBSERVED',
    role: 'Hourly in-situ ground truth ambient PM2.5 measurements',
    updateFrequency: 'Hourly (continuous ground monitors)',
    coverage: '6 Continuous Ambient Air Quality Monitoring Stations',
  },
  {
    sourceName: 'Open-Meteo / ECMWF ERA5-Land',
    classification: 'REANALYSIS',
    role: 'Hourly atmospheric meteorology (temp, humidity, pressure, solar radiation, PBL height, wind vectors)',
    updateFrequency: 'Hourly (assimilated numerical weather model)',
    coverage: '0.1° grid (~9 km spatial resolution) matched to station coordinates',
  },
  {
    sourceName: 'OpenStreetMap (OSM) Highway Network',
    classification: 'STATIC_ROAD_NETWORK',
    role: 'Major and local road segment lengths and spatial network densities within 1.5 km buffer',
    updateFrequency: 'Static (geospatial baseline snapshot)',
    coverage: '1.5 km circular spatial buffer per station',
  },
  {
    sourceName: 'Diurnal Mobility Index & Dispersion Ratios',
    classification: 'TRAFFIC_PROXY',
    role: 'Normalized hourly traffic intensity index [0.0, 1.0] and traffic-stagnation/ventilation interactions',
    updateFrequency: 'Hourly (derived empirical diurnal profile)',
    coverage: 'Metropolitan corridor diurnal proxy',
  },
  {
    sourceName: 'OpenStreetMap (OSM) Industrial Footprints',
    classification: 'STATIC_INDUSTRIAL',
    role: 'Active industrial facility count within 2.0 km and Euclidean distance to nearest industrial site',
    updateFrequency: 'Static (geospatial baseline snapshot)',
    coverage: '2.0 km circular spatial buffer per station',
  },
  {
    sourceName: 'OpenStreetMap (OSM) Construction Clusters',
    classification: 'CONSTRUCTION_PROXY',
    role: 'Identified major construction and civil infrastructure footprints within 1.5 km buffer',
    updateFrequency: 'Static (geospatial baseline snapshot)',
    coverage: '1.5 km circular spatial buffer per station',
  },
  {
    sourceName: 'OpenStreetMap (OSM) Land Use Polygons',
    classification: 'STATIC_LAND_USE',
    role: 'Zoning context (residential, commercial, industrial, green space) and dominant land-use category',
    updateFrequency: 'Static (geospatial baseline snapshot)',
    coverage: 'Station neighborhood parcel classification',
  },
  {
    sourceName: 'OpenStreetMap (OSM) POI Density',
    classification: 'ACTIVITY_PROXY',
    role: 'Commercial, institutional, and public transit POI counts and spatial density per km²',
    updateFrequency: 'Static (geospatial baseline snapshot)',
    coverage: '1.5 km circular spatial buffer per station',
  },
];

export interface FeatureDomainInfo {
  domain: string;
  columnCount: number;
  description: string;
  examples: string[];
}

export const FEATURE_DOMAINS: FeatureDomainInfo[] = [
  {
    domain: 'Domain A: Primary Target & Indicators',
    columnCount: 2,
    description: 'Next-hour forecast target and observed indicator flag.',
    examples: ['target_pm25_t_plus_1', 'target_available'],
  },
  {
    domain: 'Domain B: Temporal & Cyclical Encodings',
    columnCount: 14,
    description: 'Trigonometric sine/cosine harmonics and calendar temporal features.',
    examples: ['hour_sin', 'hour_cos', 'month_sin', 'month_cos', 'is_monsoon', 'is_weekend'],
  },
  {
    domain: 'Domain C: Wind Vectors & Dispersion',
    columnCount: 8,
    description: 'Orthogonal wind decomposition and planetary boundary layer ventilation.',
    examples: ['wind_u', 'wind_v', 'ventilation_index', 'temp_dewpoint_spread', 'atmospheric_stagnation_flag'],
  },
  {
    domain: 'Domain D: Contemporaneous Weather',
    columnCount: 14,
    description: 'ECMWF ERA5-Land surface temperature, moisture, radiation, and pressure.',
    examples: ['temp_c', 'humidity_pct', 'solar_rad_wm2', 'pbl_height_m', 'pressure_hpa'],
  },
  {
    domain: 'Domain E: Autoregressive PM2.5 Lags',
    columnCount: 7,
    description: 'Historical particulate momentum within station time series.',
    examples: ['pm25', 'pm25_lag_1h', 'pm25_lag_2h', 'pm25_lag_3h', 'pm25_lag_6h', 'pm25_lag_24h'],
  },
  {
    domain: 'Domain F: Weather Dynamic Lags',
    columnCount: 10,
    description: 'Atmospheric memory across multi-hour thermal and ventilation cycles.',
    examples: ['temp_c_lag_1h', 'wind_speed_ms_lag_3h', 'pbl_height_m_lag_1h', 'ventilation_index_lag_1h'],
  },
  {
    domain: 'Domain G: Historical Rolling Statistics',
    columnCount: 11,
    description: 'Leakage-safe rolling means, standard deviations, and antecedent rainfall sums.',
    examples: ['pm25_rolling_mean_3h', 'pm25_rolling_mean_24h', 'pm25_rolling_std_6h', 'precip_rolling_sum_24h'],
  },
  {
    domain: 'Domain H: Traffic Exposure & Interactions',
    columnCount: 9,
    description: 'Static road densities and dynamic emission-dispersion interaction ratios.',
    examples: ['total_road_length_km', 'traffic_proxy_index', 'traffic_stagnation_ratio', 'traffic_ventilation_ratio'],
  },
  {
    domain: 'Domain I: Urban Activity & Land Use',
    columnCount: 20,
    description: 'Industrial facilities, construction indicators, and POI density interactions.',
    examples: ['has_industrial_within_1km', 'industrial_dispersion_ratio', 'poi_traffic_interaction', 'dominant_landuse'],
  },
  {
    domain: 'Domain J: Spatial Metadata & Quality Flags',
    columnCount: 23,
    description: 'Station spatial IDs, regulatory completeness tags, and provenance audit markers.',
    examples: ['station_id', 'zone_type', 'pm25_completeness_flag', 'pollution_data_type'],
  },
];

export interface PipelineStage {
  id: number;
  name: string;
  description: string;
  outputArtifact: string;
}

export const DATA_PROCESSING_PIPELINE: PipelineStage[] = [
  {
    id: 1,
    name: 'Raw Sources',
    description: 'Acquire raw data from OpenAQ v3 API, Open-Meteo ERA5-Land, and OpenStreetMap Overpass.',
    outputArtifact: 'data/raw/',
  },
  {
    id: 2,
    name: 'Quality Checks',
    description: 'Perform range bounds audit, station deduplication, and coordinate geometry validation.',
    outputArtifact: 'data/interim/quality_audited/',
  },
  {
    id: 3,
    name: 'Hourly Alignment',
    description: 'Resample sporadic sensor readings into an unbroken UTC hourly analytical grid.',
    outputArtifact: 'data/interim/hourly_aligned/',
  },
  {
    id: 4,
    name: 'Station-Time Integration',
    description: 'Cross-join 6 monitoring stations × 14,016 hourly timestamps into 84,096 canonical rows.',
    outputArtifact: 'data/processed/integrated_master.csv (70 cols)',
  },
  {
    id: 5,
    name: 'Feature Engineering',
    description: 'Compute autoregressive lags, rolling statistics, wind vectors, and dispersion interaction ratios.',
    outputArtifact: 'data/processed/features/ (118 cols)',
  },
  {
    id: 6,
    name: 'Temporal Partitioning',
    description: 'Split into contiguous blocks: Train (69.7%), Validation (15.6%), and Test Holdout (14.7%).',
    outputArtifact: 'Zero look-ahead leakage assertion suite (5/5 passed)',
  },
  {
    id: 7,
    name: 'Model Training',
    description: 'Fit frozen preprocessor and train 4 benchmark models (Persistence, Ridge, RF, HistGBoost).',
    outputArtifact: 'ml/models/*.joblib',
  },
  {
    id: 8,
    name: 'Prediction Serving',
    description: 'Serve t+1 hour forecast inferences with input feature verification and median fallback.',
    outputArtifact: 'FastAPI /api/v1/forecast',
  },
  {
    id: 9,
    name: 'Scenario Counterfactuals',
    description: 'Execute ceteris paribus feature scaling (e.g. traffic 30% reduction -> x0.70) without modifying canonical rows.',
    outputArtifact: 'FastAPI /api/v1/scenarios/{id}/run',
  },
];
