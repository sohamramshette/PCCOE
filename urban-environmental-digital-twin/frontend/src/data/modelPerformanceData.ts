/**
 * Documented Model Performance & Architecture Specifications
 * Source of Truth: docs/ml/baseline_model_report.md
 */

export interface ModelBenchmarkEntry {
  modelId: string;
  modelName: string;
  architecture: string;
  inductiveBias: string;
  pipeline: string;
  valMae: number;
  valRmse: number;
  valR2: number;
  testMae: number;
  testRmse: number;
  testR2: number;
  valMedAe?: number;
  testMedAe?: number;
}

export const BASELINE_MODELS_BENCHMARK: ModelBenchmarkEntry[] = [
  {
    modelId: 'persistence_baseline',
    modelName: 'Persistence Baseline',
    architecture: 'Heuristic y(t+1) = y(t)',
    inductiveBias: 'Non-parametric autocorrelation anchor. Assumes atmospheric inertia over 1 hour.',
    pipeline: 'Contemporaneous observation lag-1 fallback (y_t, y_t-1, y_t-2, training median).',
    valMae: 4.9410,
    valRmse: 7.7725,
    valR2: 0.6727,
    testMae: 4.1837,
    testRmse: 9.8782,
    testR2: 0.3628,
    valMedAe: 3.5317,
    testMedAe: 2.8275,
  },
  {
    modelId: 'ridge_baseline',
    modelName: 'Standardized Ridge Regression',
    architecture: 'L2 Regularized Linear Regression (alpha = 100.0)',
    inductiveBias: 'Linear additive relationship across scaled multi-domain predictors.',
    pipeline: 'Median imputation, StandardScaler (z-score), One-Hot categorical encoding.',
    valMae: 5.7222,
    valRmse: 8.4181,
    valR2: 0.6161,
    testMae: 4.6819,
    testRmse: 9.9457,
    testR2: 0.3540,
    valMedAe: 4.2793,
    testMedAe: 3.1623,
  },
  {
    modelId: 'random_forest_baseline',
    modelName: 'Random Forest Regressor',
    architecture: 'Bagged Ensemble of 100 Trees (depth=15, split=5, max_features=0.3)',
    inductiveBias: 'Non-linear hierarchical recursive partitioning with variance reduction via bagging.',
    pipeline: 'Median numerical imputation, StandardScaler, One-Hot categorical encoding.',
    valMae: 4.7360,
    valRmse: 7.2059,
    valR2: 0.7187,
    testMae: 4.0475,
    testRmse: 9.1171,
    testR2: 0.4572,
    valMedAe: 3.5465,
    testMedAe: 2.9102,
  },
  {
    modelId: 'gradient_boosting_baseline',
    modelName: 'HistGradientBoosting Regressor',
    architecture: 'Histogram-based Gradient Boosted Decision Trees (max_iter=150, lr=0.08, depth=10)',
    inductiveBias: 'Sequential gradient-guided additive tree boosting over 256-bin integer feature histograms.',
    pipeline: 'Scikit-learn native histogram binning, One-Hot categorical encoding.',
    valMae: 4.6686,
    valRmse: 7.1287,
    valR2: 0.7247,
    testMae: 4.1034,
    testRmse: 9.1094,
    testR2: 0.4581,
    valMedAe: 3.4632,
    testMedAe: 2.9682,
  },
];

export interface ExtendedBenchmarkEntry {
  modelConfig: string;
  scope: string;
  valN: number;
  valMae: number;
  valRmse: number;
  valR2: number;
  testN: number;
  testMae: number;
  testRmse: number;
  testR2: number;
}

export const EXTENDED_BENCHMARK_11613: ExtendedBenchmarkEntry[] = [
  {
    modelConfig: 'Universal Network HGB (Core 98 Features)',
    scope: 'Trained on 42,796 samples across all 6 stations',
    valN: 1864,
    valMae: 4.9618,
    valRmse: 6.5213,
    valR2: 0.7004,
    testN: 1675,
    testMae: 4.5857,
    testRmse: 6.0140,
    testR2: 0.5065,
  },
  {
    modelConfig: 'Extended Benchmark HGB (with PM10, NO2 & In-situ Weather)',
    scope: 'Trained on Station 11613 only (7,535 training samples)',
    valN: 1864,
    valMae: 5.9332,
    valRmse: 7.9701,
    valR2: 0.5525,
    testN: 1675,
    testMae: 7.0194,
    testRmse: 9.3760,
    testR2: -0.1994,
  },
];

export interface FeatureImportanceItem {
  rank: number;
  featureName: string;
  domain: string;
  giniImportance: number;
  permutationMaeLoss: number;
  role: string;
}

export const TOP_PREDICTIVE_FEATURES: FeatureImportanceItem[] = [
  {
    rank: 1,
    featureName: 'pm25',
    domain: 'PM2.5 History',
    giniImportance: 0.2940,
    permutationMaeLoss: 5.5583,
    role: 'Contemporaneous particulate state; dominant short-term anchor.',
  },
  {
    rank: 2,
    featureName: 'pm25_rolling_mean_3h',
    domain: 'PM2.5 History',
    giniImportance: 0.2419,
    permutationMaeLoss: 1.0261,
    role: 'Short-term smoothed trajectory; filters high-frequency sensor noise.',
  },
  {
    rank: 3,
    featureName: 'pm25_lag_1h',
    domain: 'PM2.5 History',
    giniImportance: 0.1238,
    permutationMaeLoss: 0.0931,
    role: '1-hour autoregressive momentum; captures directional trend (t-1 -> t).',
  },
  {
    rank: 4,
    featureName: 'pm25_rolling_mean_6h',
    domain: 'PM2.5 History',
    giniImportance: 0.1119,
    permutationMaeLoss: 0.0427,
    role: 'Multi-hour background trend; captures mesoscale accumulation.',
  },
  {
    rank: 5,
    featureName: 'pm25_lag_2h',
    domain: 'PM2.5 History',
    giniImportance: 0.0470,
    permutationMaeLoss: 0.0291,
    role: 'Secondary autoregressive lag; confirms trend stability.',
  },
  {
    rank: 6,
    featureName: 'pm25_rolling_mean_12h',
    domain: 'PM2.5 History',
    giniImportance: 0.0372,
    permutationMaeLoss: 0.0143,
    role: 'Half-day rolling baseline; distinguishes episodic spikes from sustained haze.',
  },
  {
    rank: 7,
    featureName: 'pm25_rolling_mean_24h',
    domain: 'PM2.5 History',
    giniImportance: 0.0214,
    permutationMaeLoss: 0.3019,
    role: 'Full diurnal cycle baseline; proxies macro synoptic air mass quality.',
  },
  {
    rank: 8,
    featureName: 'solar_rad_wm2',
    domain: 'Weather',
    giniImportance: 0.0047,
    permutationMaeLoss: 0.0757,
    role: 'Solar insolation driving boundary layer thermal convection and mixing.',
  },
  {
    rank: 9,
    featureName: 'hour_cos',
    domain: 'Temporal',
    giniImportance: 0.0025,
    permutationMaeLoss: 0.0460,
    role: 'Cyclical diurnal harmonic; coordinates rush-hour and nocturnal timing.',
  },
  {
    rank: 10,
    featureName: 'wind_v',
    domain: 'Dispersion',
    giniImportance: 0.0023,
    permutationMaeLoss: 0.0612,
    role: 'Meridional wind vector; captures North-South regional air mass transport.',
  },
];

export interface TemporalSplitInfo {
  split: string;
  range: string;
  totalStationHours: number;
  validObservedTargets: number;
  targetCaptureRate: string;
  role: string;
}

export const TEMPORAL_SPLIT_INFO: TemporalSplitInfo[] = [
  {
    split: 'TRAIN',
    range: '2025-02-18 00:00 UTC → 2026-03-31 23:00 UTC',
    totalStationHours: 58608,
    validObservedTargets: 42796,
    targetCaptureRate: '73.02%',
    role: 'Model training and preprocessor fitting (imputers, scalers, one-hot encoders).',
  },
  {
    split: 'VALIDATION',
    range: '2026-04-01 00:00 UTC → 2026-06-30 23:00 UTC',
    totalStationHours: 13104,
    validObservedTargets: 10454,
    targetCaptureRate: '79.78%',
    role: 'Model selection, early stopping, and hyperparameter tuning.',
  },
  {
    split: 'TEST (Holdout)',
    range: '2026-07-01 00:00 UTC → 2026-09-24 23:00 UTC',
    totalStationHours: 12384,
    validObservedTargets: 9769,
    targetCaptureRate: '78.88%',
    role: 'Unbiased generalization benchmarking on strictly future contiguous time horizon.',
  },
];

export const DOCUMENTED_MODEL_LIMITATIONS: string[] = [
  'PM2.5 observations contain missing periods due to sensor recalibration and power drops; missing targets are preserved as NaN and not imputed.',
  'Traffic intensity inputs are diurnal-spatial mobility proxies rather than direct real-time camera or loop-detector sensor measurements.',
  'Atmospheric weather variables are derived from ECMWF ERA5-Land reanalysis rather than on-site micrometeorological weather towers.',
  'Scenario simulation outputs are model counterfactual estimates under ceteris paribus assumptions, not observed physical measurements.',
  'Current baseline ML models provide deterministic point forecasts; calibrated probabilistic prediction intervals are planned for future phases.',
];
