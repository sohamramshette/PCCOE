# Phase 10: What-If / Counterfactual Simulation Engine — Scientific & Technical Report

> **System Component:** Digital Twin What-If Intervention Simulation Engine  
> **Status:** Completed, Verified, and 100% Tested (50/50 Tests Passed)  
> **Core Pollutant:** Particulate Matter PM2.5 ($\mu\text{g/m}^3$)  
> **Target Geography:** Pune Metropolitan Region & PCMC (6 Continuous CAAQMN Stations)  
> **Underlying Baseline Model:** In-memory cached estimators (`gradient_boosting_baseline`, `random_forest_baseline`, `ridge_baseline`, `persistence_baseline`)  

---

## 1. Executive Summary & Objective

The **What-If / Counterfactual Simulation Engine** empowers environmental planners, policymakers, and researchers to explore hypothetical interventions—such as traffic restrictions or industrial curbs—and observe the estimated response of the trained PM2.5 forecasting model.

Given a verified historical baseline state for a Pune monitoring station $(s, t)$ and an intervention specification, the engine:
1. Reconstructs the complete 98-feature multi-domain representation from verified database records.
2. Derives an isolated, decoupled counterfactual feature row where **only intervention-controlled features are adjusted**.
3. Passes both feature sets through the identical, fitted preprocessor and in-memory model artifact.
4. Computes absolute changes, estimated reductions, and relative percentage changes.
5. Persists the scenario and simulation result while **guaranteeing complete immutability of raw observational and weather data**.

---

## 2. Core Epistemological & Scientific Principles

### 2.1 Model-Based Counterfactual Estimate vs. Causal Inference
Every scenario response explicitly carries:
```json
"uncertainty_available": false,
"uncertainty_note": "Point estimate only; the current baseline model does not provide calibrated uncertainty.",
"interpretation_note": "Counterfactual model estimate; not a causal measurement.",
"data_classification": "MODEL_COUNTERFACTUAL_ESTIMATE"
```

**What this simulation IS:**
- A quantitative estimate of how the statistical associations learned by the machine learning model from historical observational and reanalysis data evaluate a modified input vector.

**What this simulation IS NOT:**
- **Not a causal inference model:** The underlying estimators are predictive gradient boosted trees and regularized linear regressions, not structural causal models (SCMs) or do-calculus engines.
- **Not a measured pollution reduction:** The model does not guarantee that implementing a 30% traffic reduction in the physical city will yield the exact predicted reduction.
- **Not fabricated environmental data:** The simulation does not overwrite historical records, nor does it create fictitious weather or pollution observations.

### 2.2 Database Immutability Guarantee
The simulation engine enforces strict database immutability:
- Original tables (`environmental_observations`, `weather_reanalysis`, `traffic_proxy`, `station_traffic_exposure`, `station_activity_exposure`) are **strictly read-only**.
- All hypothetical modifications exist solely in temporary memory within a deep-copied feature DataFrame.
- Scenario runs persist exclusively to `scenarios` and `scenario_results` tables.

---

## 3. Supported Interventions & Feature Safety

To prevent synthetic hallucinations or pipeline corruption, interventions are strictly constrained to features present in the verified 98 core feature manifest (`ml/models/feature_names.json`) and trained feature pipeline (`ml/src/features/build_features.py`).

### 3.1 Supported Policy Levers

| Intervention Code | Target Levers | Allowed Range | Modeled Domain |
| :--- | :--- | :--- | :--- |
| `TRAFFIC_REDUCTION` | `traffic_reduction_percent` | $0.0\% \le p_t \le 100.0\%$ | Diurnal traffic proxy intensity & dispersion ratios |
| `INDUSTRIAL_ACTIVITY_REDUCTION` | `industrial_activity_reduction_percent` | $0.0\% \le p_i \le 100.0\%$ | Industrial buffer presence proxy & dispersion ratios |
| `COMBINED_INTERVENTION` | `traffic_reduction_percent`<br>`industrial_activity_reduction_percent` | $0.0\% \le p_t, p_i \le 100.0\%$ | Simultaneous independent traffic & industrial modifications |

---

## 4. Exact Feature Mappings & Mathematical Transformations

### 4.1 Traffic Reduction (`TRAFFIC_REDUCTION`)
When a traffic reduction percentage $p_t$ is applied, the multiplier is defined as:
$$m_t = 1.0 - \frac{p_t}{100.0} \quad \text{where } m_t \in [0.0, 1.0]$$

The following 4 features are updated consistently:

1. **`traffic_proxy_index` (Classification: `TRAFFIC_PROXY`)**
   $$X_{\text{cf}} = X_{\text{base}} \times m_t$$
   *Rationale:* Directly scales the normalized diurnal traffic intensity curve for the hour.

2. **`traffic_stagnation_ratio` (Classification: `DERIVED_INTERACTION`)**
   $$\text{Definition: } \frac{\text{traffic\_proxy\_index}}{\text{wind\_speed\_ms} + 0.2}$$
   $$X_{\text{cf}} = X_{\text{base}} \times m_t$$
   *Rationale:* Traffic emissions accumulating during low-wind stagnation scale proportionally with traffic volume.

3. **`traffic_ventilation_ratio` (Classification: `DERIVED_INTERACTION`)**
   $$\text{Definition: } \frac{\text{traffic\_proxy\_index}}{(\text{ventilation\_index} / 1000.0) + 0.1}$$
   $$X_{\text{cf}} = X_{\text{base}} \times m_t$$
   *Rationale:* Scales the ratio of traffic source intensity to the atmospheric boundary layer ventilation volume.

4. **`poi_traffic_interaction` (Classification: `DERIVED_INTERACTION`)**
   $$\text{Definition: } \text{poi\_density\_per\_km2} \times \text{traffic\_proxy\_index}$$
   $$X_{\text{cf}} = X_{\text{base}} \times m_t$$
   *Rationale:* Commercial and transit point-of-interest traffic generation scales proportionally with the general traffic curb.

*Safety Constraint:* Static OpenStreetMap infrastructure metrics (`total_road_length_km`, `major_road_length_km`, `major_road_density_km_per_km2`, `distance_to_nearest_major_road_m`) represent physical roads and are **never modified**.

---

### 4.2 Industrial Activity Reduction (`INDUSTRIAL_ACTIVITY_REDUCTION`)
When an industrial activity reduction percentage $p_i$ is applied, the multiplier is defined as:
$$m_i = 1.0 - \frac{p_i}{100.0} \quad \text{where } m_i \in [0.0, 1.0]$$

The following 2 features are updated:

1. **`has_industrial_within_1km` (Classification: `STATIC_SPATIAL_PROXY`)**
   $$X_{\text{cf}} = X_{\text{base}} \times m_i$$
   *Rationale:* Modeled proxy reduction in local industrial influence within the 1 km buffer. If $p_i = 100.0\%$, the presence flag becomes $0.0$.

2. **`industrial_dispersion_ratio` (Classification: `DERIVED_INTERACTION`)**
   $$\text{Definition: } \frac{\text{has\_industrial\_within\_1km}}{\text{wind\_speed\_ms} + 0.2}$$
   $$X_{\text{cf}} = X_{\text{base}} \times m_i$$
   *Rationale:* Scales the atmospheric dispersion pressure exerted by nearby industrial activity under local wind speed.

*Safety Constraint:* Static element counts and physical distances (`industrial_elements_2km`, `dist_nearest_industrial_m`) are immutable geographic properties and are not modified.

---

### 4.3 Combined Intervention (`COMBINED_INTERVENTION`)
Applies both traffic and industrial transformations independently to their respective features. No unverified cross-interaction terms are introduced.

---

## 5. End-to-End Simulation Pipeline

```
                 +-------------------------------------------------------------+
                 |       Incoming Request: station_id, baseline_t, intervention |
                 +-------------------------------------------------------------+
                                                |
                                                v
                 +-------------------------------------------------------------+
                 | 1. Validate Station, Model Registry & Baseline Timestamp    |
                 +-------------------------------------------------------------+
                                                |
                                                v
                 +-------------------------------------------------------------+
                 | 2. ForecastService.construct_features(db, station, t)       |
                 |    - Checks complete obs & ERA5-Land weather at t           |
                 |    - Extracts 24h lags & rolling windows                    |
                 |    - Assembles 98-column baseline_features DataFrame        |
                 +-------------------------------------------------------------+
                                                |
                                                v
                 +-------------------------------------------------------------+
                 | 3. Baseline Prediction                                      |
                 |    baseline_pm25 = model_serving.predict(model_id, baseline)|
                 +-------------------------------------------------------------+
                                                |
                                                v
                 +-------------------------------------------------------------+
                 | 4. Counterfactual Transformation                            |
                 |    cf_features = baseline_features.copy(deep=True)          |
                 |    Apply m_traffic and/or m_industrial multipliers          |
                 |    Generate structured FeatureAuditItem list                |
                 +-------------------------------------------------------------+
                                                |
                                                v
                 +-------------------------------------------------------------+
                 | 5. Counterfactual Prediction                                |
                 |    cf_pm25 = model_serving.predict(model_id, cf_features)   |
                 +-------------------------------------------------------------+
                                                |
                                                v
                 +-------------------------------------------------------------+
                 | 6. Compute Differences & Safe Relative Change               |
                 |    delta = round(cf_pm25 - baseline_pm25, 2)                |
                 |    reduction = round(baseline_pm25 - cf_pm25, 2)            |
                 |    pct = round((delta / baseline_pm25) * 100, 2) if >0 else 0|
                 +-------------------------------------------------------------+
                                                |
                                                v
                 +-------------------------------------------------------------+
                 | 7. Persist to Database & Return Structured Response         |
                 |    - Insert into scenario_results                           |
                 |    - Update scenarios.simulation_status = "COMPLETED"       |
                 +-------------------------------------------------------------+
```

---

## 6. Mathematical Result Calculations

For any simulation run:

1. **Absolute Change:**
   $$\Delta_{\text{PM2.5}} = \hat{y}_{\text{counterfactual}} - \hat{y}_{\text{baseline}}$$
   *(Negative values indicate a decrease in pollutant concentration).*

2. **Estimated Reduction:**
   $$\text{Reduction}_{\text{PM2.5}} = \hat{y}_{\text{baseline}} - \hat{y}_{\text{counterfactual}} = -\Delta_{\text{PM2.5}}$$

3. **Percentage Change:**
   $$\% \Delta = \begin{cases} 
   \left( \frac{\hat{y}_{\text{counterfactual}} - \hat{y}_{\text{baseline}}}{\hat{y}_{\text{baseline}}} \right) \times 100.0, & \text{if } \hat{y}_{\text{baseline}} > 0 \\
   0.0, & \text{if } \hat{y}_{\text{baseline}} = 0 
   \end{cases}$$
   *Guarantees zero division errors, NaNs, or infinite outputs.*

4. **Concentration Floor:**
   Predictions are clamped at $\ge 0.0\,\mu\text{g/m}^3$ to prevent physically impossible negative atmospheric mass concentrations.

---

## 7. Model Serving Integration & Artifact Reuse

Predictions are served exclusively via the existing `ModelServingManager` singleton initialized once during application startup:
- **No disk I/O per request:** Serialized scikit-learn models (`joblib`) and `preprocessor.joblib` reside in memory.
- **Identical Pipeline:** Features pass through the same fitted `ColumnTransformer` (median imputer, standard scaler, one-hot encoder) used during Phase 7 training and Phase 9 forecast serving.
- **Model Options:**
  - `gradient_boosting_baseline` (Default production model, Test MAE $4.10\,\mu\text{g/m}^3$)
  - `random_forest_baseline` (100-tree ensemble, Test MAE $4.05\,\mu\text{g/m}^3$)
  - `ridge_baseline` (Standardized linear model)
  - `persistence_baseline` (Non-parametric heuristic)

---

## 8. API Specifications & Example Payloads

### 8.1 Create Scenario (`POST /api/v1/scenarios`)
**Request:**
```json
{
  "scenario_name": "Shivajinagar Evening Traffic Curb",
  "station_id": 11613,
  "baseline_timestamp_utc": "2026-09-24T17:00:00Z",
  "model_id": "gradient_boosting_baseline",
  "intervention": {
    "type": "TRAFFIC_REDUCTION",
    "traffic_reduction_percent": 30.0
  },
  "description": "Evaluate impact of hypothetical 30% traffic reduction during evening peak"
}
```

**Response (`201 Created`):**
```json
{
  "scenario_id": "scen_8f3a9d2c1b4e",
  "scenario_name": "Shivajinagar Evening Traffic Curb",
  "description": "Evaluate impact of hypothetical 30% traffic reduction during evening peak",
  "station_id": 11613,
  "model_id": "gradient_boosting_baseline",
  "baseline_timestamp_utc": "2026-09-24T17:00:00Z",
  "traffic_reduction_pct": 30.0,
  "industrial_reduction_pct": 0.0,
  "construction_halt": false,
  "simulation_status": "DRAFT",
  "is_modeled_scenario": true,
  "created_by": "system",
  "created_at": "2026-09-26T15:10:00Z",
  "intervention": {
    "type": "TRAFFIC_REDUCTION",
    "traffic_reduction_percent": 30.0
  }
}
```

---

### 8.2 Run Simulation (`POST /api/v1/scenarios/{scenario_id}/run`)
**Response (`200 OK`):**
```json
{
  "scenario_id": "scen_8f3a9d2c1b4e",
  "station_id": 11613,
  "station_name": "Revenue Colony-Shivajinagar, Pune - IITM",
  "baseline_timestamp_utc": "2026-09-24T17:00:00Z",
  "target_timestamp_utc": "2026-09-24T18:00:00Z",
  "model_id": "gradient_boosting_baseline",
  "model_type": "GRADIENT_BOOSTING",
  "intervention": {
    "type": "TRAFFIC_REDUCTION",
    "traffic_reduction_percent": 30.0
  },
  "baseline_prediction_pm25": 43.69,
  "counterfactual_prediction_pm25": 43.51,
  "absolute_change_pm25": -0.18,
  "estimated_reduction_pm25": 0.18,
  "percentage_change": -0.41,
  "unit": "ug/m3",
  "uncertainty_available": false,
  "uncertainty_note": "Point estimate only; the current baseline model does not provide calibrated uncertainty.",
  "interpretation_note": "Counterfactual model estimate; not a causal measurement.",
  "data_classification": "MODEL_COUNTERFACTUAL_ESTIMATE",
  "affected_features_audit": [
    {
      "feature_name": "traffic_proxy_index",
      "baseline_value": 0.78,
      "counterfactual_value": 0.546,
      "delta": -0.234,
      "transformation": "30.0% reduction (x0.7000)",
      "classification": "TRAFFIC_PROXY"
    },
    {
      "feature_name": "traffic_stagnation_ratio",
      "baseline_value": 0.2847,
      "counterfactual_value": 0.1993,
      "delta": -0.0854,
      "transformation": "30.0% reduction (x0.7000)",
      "classification": "DERIVED_INTERACTION"
    },
    {
      "feature_name": "traffic_ventilation_ratio",
      "baseline_value": 0.3541,
      "counterfactual_value": 0.2479,
      "delta": -0.1062,
      "transformation": "30.0% reduction (x0.7000)",
      "classification": "DERIVED_INTERACTION"
    },
    {
      "feature_name": "poi_traffic_interaction",
      "baseline_value": 15.6702,
      "counterfactual_value": 10.9691,
      "delta": -4.7011,
      "transformation": "30.0% reduction (x0.7000)",
      "classification": "DERIVED_INTERACTION"
    }
  ],
  "created_at": "2026-09-26T15:10:05Z"
}
```

---

## 9. Verification & Automated Test Suite

A comprehensive test suite of 21 tests covering all Phase 10 requirements was implemented in `backend/tests/test_scenarios.py`. Combined with Phase 9 tests, the total backend suite stands at **50 passing tests**.

| Test Scenario | Verification Condition | Result |
| :--- | :--- | :--- |
| `test_scenario_creation_success` | Valid payload returns 201 with DRAFT status | **PASSED** |
| `test_scenario_invalid_station` | Station ID 999999 returns 404 Not Found | **PASSED** |
| `test_scenario_invalid_model` | Non-existent model returns 404 Not Found | **PASSED** |
| `test_scenario_invalid_intervention_type` | Unsupported intervention type returns 422 | **PASSED** |
| `test_traffic_reduction_zero` | 0% reduction produces identical baseline & cf predictions | **PASSED** |
| `test_traffic_reduction_hundred` | 100% reduction zeroes traffic proxy & stagnation terms | **PASSED** |
| `test_traffic_reduction_below_zero_rejected` | Negative reduction (-15%) rejected with 422 | **PASSED** |
| `test_traffic_reduction_above_hundred_rejected` | Reduction > 100% (125%) rejected with 422 | **PASSED** |
| `test_industrial_reduction_validation` | Industrial bounds [0, 100] validated; negatives/excess rejected | **PASSED** |
| `test_combined_intervention` | Simultaneous traffic & industrial modifications applied cleanly | **PASSED** |
| `test_predictions_exist_and_metrics_calculated` | Validates float predictions, delta, and percentage accuracy | **PASSED** |
| `test_zero_baseline_safety` | Zero baseline forecast returns 0.0% change without ZeroDivisionError | **PASSED** |
| `test_scenario_persistence` | Scenario row persisted in DB with correct initial state | **PASSED** |
| `test_scenario_result_persistence` | ScenarioResult row persisted with COMPLETED status | **PASSED** |
| `test_missing_historical_inputs_rejected` | Future timestamp 2035 returns 422 UNAVAILABLE error | **PASSED** |
| `test_source_database_rows_unchanged` | Snapshot verification proves zero changes to raw DB rows | **PASSED** |
| `test_model_serving_artifacts_reused` | In-memory singleton reused without reloading weights | **PASSED** |
| `test_uncertainty_and_interpretation_disclaimers` | Explicit non-causal disclaimer and uncertainty=False verified | **PASSED** |
| `test_scenario_retrieval` | GET `/api/v1/scenarios/{id}` retrieves scenario details | **PASSED** |
| `test_scenario_results_retrieval` | GET `/api/v1/scenarios/{id}/results` returns persisted run history | **PASSED** |
| `test_list_scenarios_pagination` | GET `/api/v1/scenarios` returns paginated list | **PASSED** |

---

## 10. Limitations & Boundaries

1. **Short-Term Predictive Association:** Next-hour forecasts ($t+1$) in atmospheric models are heavily dominated by recent autoregressive persistence (`pm25_t`, `pm25_rolling_mean_3h`). Consequently, a 30% traffic reduction in a single hour produces a realistic, modest immediate model shift ($\sim -0.2\,\mu\text{g/m}^3$) rather than an exaggerated sudden collapse in ambient concentration.
2. **Proxy Representation:** Traffic volume is represented via diurnal curve proxies and OpenStreetMap topology, not continuous induction loop sensors.
3. **No Uncalibrated Confidence Intervals:** Uncertainty intervals are explicitly marked unavailable until calibrated conformal prediction intervals are trained.
