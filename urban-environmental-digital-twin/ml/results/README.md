# Baseline ML Models Evaluation Results

**Project:** Urban Environmental Digital Twin  
**Target Variable:** Next-Hour Ambient PM2.5 (`target_pm25_t_plus_1` in $\mu\text{g/m}^3$)  
**Evaluation Grain:** Station $\times$ Hour Holdout (`target_available == 1`)  
**Status:** Evaluation Completed Successfully  

---

## 1. Executive Summary of Results

### Overall Performance Matrix

| Model | Split | MAE ($\mu\text{g/m}^3$) | RMSE ($\mu\text{g/m}^3$) | $R^2$ | MedAE ($\mu\text{g/m}^3$) | $\Delta$ MAE vs. Persist |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Model 0: Persistence Baseline** | Validation | 4.941 | 7.772 | 0.673 | 3.532 | 0.000 |
| **Model 1: Standardized Ridge** | Validation | 5.722 | 8.418 | 0.616 | 4.279 | +0.781 |
| **Model 2: Random Forest** | Validation | 4.736 | 7.206 | 0.719 | 3.546 | -0.205 |
| **Model 3: HistGradientBoosting** | Validation | **4.669** | **7.129** | **0.725** | **3.463** | **-0.272** |
| **Model 0: Persistence Baseline** | Test (Holdout) | 4.184 | 9.878 | 0.363 | 2.828 | 0.000 |
| **Model 1: Standardized Ridge** | Test (Holdout) | 4.682 | 9.946 | 0.354 | 3.162 | +0.498 |
| **Model 2: Random Forest** | Test (Holdout) | 4.048 | 9.117 | 0.457 | 2.910 | -0.136 |
| **Model 3: HistGradientBoosting** | Test (Holdout) | **4.103** | **9.109** | **0.458** | **2.968** | **-0.080** |

---

## 2. Directory Contents

* `model_comparison.csv`: Summary of primary and secondary metrics across splits and baselines.
* `station_metrics.csv`: Station-wise breakdown comparing Persistence vs. Tree Models across all 6 monitoring stations.
* `subgroup_metrics.csv`: Environmental and diurnal regime performance (Day/Night, Monsoon/Non-monsoon, Low/High PM2.5).
* `feature_importance.csv`: Complete ranking of predictive importance across 114 preprocessed features.
* `validation_predictions.csv`: Row-level predictions for all valid validation observations across all baselines.
* `test_predictions.csv`: Row-level predictions for all valid test observations across all baselines.
* `evaluation_report.json`: Machine-readable consolidated JSON evaluation report.
* `figures/`:
  - `actual_vs_predicted.png`: Figure 1 - Actual vs Predicted PM2.5 scatter plot.
  - `residual_distribution.png`: Figure 2 - Error distribution comparison.
  - `residual_vs_predicted.png`: Figure 3 - Heteroscedasticity inspection.
  - `model_comparison.png`: Figure 4 - MAE and RMSE across validation and test holdout.
  - `per_station_mae.png`: Figure 5 - Station-wise MAE comparison.
  - `time_series_forecast_sample.png`: Figure 6 - Dynamic 7-day tracking plot.
  - `feature_importance.png`: Figure 7 - Top 20 predictive features grouped by domain.
