"""
Urban Environmental Digital Twin - Anomaly & Environmental Conditions Detector
==============================================================================
Pure, deterministic, testable anomaly detection functions:
1. Multi-pollutant threshold breach detection (NAAQS/NAQI criteria)
2. Sudden PM2.5 surge/spike detection
3. Statistical PM2.5 anomaly detection (two-sided z-score against rolling window)
4. Model forecast-vs-actual observation deviation detection
5. Telemetry latency & sensor freshness assessment
6. Atmospheric ventilation and thermal stagnation detection
"""

import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.config.alert_thresholds import alert_thresholds, AlertThresholdSettings
from backend.app.models.alert import AlertType, AlertSeverity
from backend.app.models.observation import EnvironmentalObservation
from backend.app.models.weather import WeatherReanalysis
from backend.app.models.prediction import ModelPrediction


class AnomalyDetector:
    """Deterministic scientific anomaly detection algorithms."""

    @staticmethod
    def detect_pollutant_thresholds(
        obs: EnvironmentalObservation,
        thresholds: AlertThresholdSettings = alert_thresholds
    ) -> List[Dict[str, Any]]:
        """
        Evaluates physical pollutant observations against regulatory/epidemiological thresholds.
        Only evaluates non-null physical values. Never fabricates missing values.
        """
        candidates: List[Dict[str, Any]] = []
        pollutant_fields = [
            ("pm25", AlertType.PM25_THRESHOLD),
            ("pm10", AlertType.PM10_THRESHOLD),
            ("no2", AlertType.NO2_THRESHOLD),
            ("so2", AlertType.SO2_THRESHOLD),
            ("co", AlertType.CO_THRESHOLD),
            ("o3", AlertType.O3_THRESHOLD),
        ]

        for attr, alert_type in pollutant_fields:
            val = getattr(obs, attr, None)
            if val is None:
                continue

            config = thresholds.pollutants.get(attr)
            if not config:
                continue

            severity: Optional[AlertSeverity] = None
            threshold_breached: Optional[float] = None

            if val >= config.critical:
                severity = AlertSeverity.CRITICAL
                threshold_breached = config.critical
            elif val >= config.alert:
                severity = AlertSeverity.HIGH
                threshold_breached = config.alert
            elif val >= config.warning:
                severity = AlertSeverity.MEDIUM
                threshold_breached = config.warning

            if severity and threshold_breached is not None:
                excess = round(val - threshold_breached, 2)
                candidates.append({
                    "station_id": obs.station_id,
                    "alert_type": alert_type.value,
                    "severity": severity.value,
                    "pollutant": attr,
                    "observed_value": round(float(val), 2),
                    "threshold_value": threshold_breached,
                    "expected_value": threshold_breached,
                    "deviation": excess,
                    "message": (
                        f"{attr.upper()} observed at {val:.1f} {config.unit}, "
                        f"exceeding {severity.value.lower()} threshold ({threshold_breached} {config.unit}) by +{excess} {config.unit}."
                    ),
                    "source": "OBSERVED",
                    "started_at": obs.datetime_utc,
                    "alert_metadata": {
                        "regulatory_standard": config.regulatory_standard,
                        "unit": config.unit,
                        "observation_time_utc": obs.datetime_utc.isoformat() if obs.datetime_utc else None
                    }
                })

        return candidates

    @staticmethod
    def detect_pm25_spike(
        current_obs: EnvironmentalObservation,
        previous_obs: Optional[EnvironmentalObservation],
        thresholds: AlertThresholdSettings = alert_thresholds
    ) -> Optional[Dict[str, Any]]:
        """
        Detects sudden short-term PM2.5 surges between contiguous hourly observations.
        Requires previous valid observation with pm25 > 0.
        """
        if current_obs.pm25 is None:
            return None
        if not previous_obs or previous_obs.pm25 is None or previous_obs.pm25 <= 0:
            return None

        curr = float(current_obs.pm25)
        prev = float(previous_obs.pm25)
        diff = curr - prev

        if diff < thresholds.pm25_spike_min_absolute_diff:
            return None

        pct_surge = (diff / prev) * 100.0
        if pct_surge >= thresholds.pm25_spike_percent_threshold:
            severity = AlertSeverity.CRITICAL if (pct_surge >= 100.0 or curr >= 150.0) else (
                AlertSeverity.HIGH if pct_surge >= 70.0 else AlertSeverity.MEDIUM
            )
            return {
                "station_id": current_obs.station_id,
                "alert_type": AlertType.PM25_SPIKE.value,
                "severity": severity.value,
                "pollutant": "pm25",
                "observed_value": round(curr, 2),
                "threshold_value": round(prev * (1.0 + thresholds.pm25_spike_percent_threshold / 100.0), 2),
                "expected_value": round(prev, 2),
                "deviation": round(pct_surge, 1),
                "message": (
                    f"PM2.5 surged by +{pct_surge:.1f}% (+{diff:.1f} µg/m³) from {prev:.1f} to {curr:.1f} µg/m³ "
                    f"within consecutive hourly observations."
                ),
                "source": "OBSERVED",
                "started_at": current_obs.datetime_utc,
                "alert_metadata": {
                    "previous_value": round(prev, 2),
                    "previous_timestamp": previous_obs.datetime_utc.isoformat() if previous_obs.datetime_utc else None,
                    "absolute_surge_ugm3": round(diff, 2),
                    "percent_surge": round(pct_surge, 1)
                }
            }
        return None

    @staticmethod
    def detect_statistical_anomaly(
        current_obs: EnvironmentalObservation,
        recent_history: List[EnvironmentalObservation],
        thresholds: AlertThresholdSettings = alert_thresholds
    ) -> Optional[Dict[str, Any]]:
        """
        Deterministic rolling baseline z-score test on station PM2.5.
        Uses only non-null historical observations without artificial imputation.
        """
        if current_obs.pm25 is None:
            return None

        # Filter valid historical values excluding the current observation itself
        valid_history = [
            float(h.pm25) for h in recent_history
            if h.pm25 is not None and h.id != current_obs.id and h.datetime_utc != current_obs.datetime_utc
        ]

        if len(valid_history) < thresholds.anomaly_min_valid_observations:
            return None

        mean = sum(valid_history) / len(valid_history)
        variance = sum((x - mean) ** 2 for x in valid_history) / len(valid_history)
        std_dev = math.sqrt(variance)

        if std_dev < thresholds.anomaly_min_standard_deviation:
            return None

        curr = float(current_obs.pm25)
        z_score = (curr - mean) / std_dev

        if abs(z_score) >= thresholds.anomaly_z_score_threshold:
            severity = AlertSeverity.HIGH if abs(z_score) >= 3.5 else AlertSeverity.MEDIUM
            direction = "elevated above" if z_score > 0 else "depressed below"
            return {
                "station_id": current_obs.station_id,
                "alert_type": AlertType.PM25_ANOMALY.value,
                "severity": severity.value,
                "pollutant": "pm25",
                "observed_value": round(curr, 2),
                "threshold_value": round(mean + (thresholds.anomaly_z_score_threshold * std_dev), 2),
                "expected_value": round(mean, 2),
                "deviation": round(z_score, 2),
                "message": (
                    f"Statistical PM2.5 anomaly detected: {curr:.1f} µg/m³ is {abs(z_score):.2f} standard deviations "
                    f"{direction} rolling 24h baseline mean of {mean:.1f} µg/m³ (σ={std_dev:.1f})."
                ),
                "source": "DERIVED",
                "started_at": current_obs.datetime_utc,
                "alert_metadata": {
                    "baseline_mean": round(mean, 2),
                    "baseline_std": round(std_dev, 2),
                    "z_score": round(z_score, 2),
                    "window_sample_size": len(valid_history),
                    "statistical_method": "rolling_two_sided_z_score"
                }
            }
        return None

    @staticmethod
    def detect_forecast_deviation(
        current_obs: EnvironmentalObservation,
        prediction: Optional[ModelPrediction],
        thresholds: AlertThresholdSettings = alert_thresholds
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluates forecast divergence when actual observation becomes available.
        Compares observed ground truth vs model prediction for target hour.
        """
        if current_obs.pm25 is None or not prediction or prediction.predicted_pm25 is None:
            return None

        actual = float(current_obs.pm25)
        pred = float(prediction.predicted_pm25)
        abs_err = abs(actual - pred)

        if abs_err >= thresholds.forecast_deviation_threshold:
            severity = AlertSeverity.HIGH if abs_err >= thresholds.forecast_deviation_critical_threshold else AlertSeverity.MEDIUM
            direction = "underpredicted" if actual > pred else "overpredicted"
            return {
                "station_id": current_obs.station_id,
                "alert_type": AlertType.FORECAST_DEVIATION.value,
                "severity": severity.value,
                "pollutant": "pm25",
                "observed_value": round(actual, 2),
                "threshold_value": thresholds.forecast_deviation_threshold,
                "expected_value": round(pred, 2),
                "deviation": round(abs_err, 2),
                "message": (
                    f"Forecast deviation alert: Model '{prediction.model_id}' {direction} PM2.5 by {abs_err:.1f} µg/m³ "
                    f"(Predicted: {pred:.1f}, Actual: {actual:.1f} µg/m³)."
                ),
                "source": "DERIVED",
                "started_at": current_obs.datetime_utc,
                "alert_metadata": {
                    "model_id": prediction.model_id,
                    "predicted_pm25": round(pred, 2),
                    "actual_pm25": round(actual, 2),
                    "absolute_error": round(abs_err, 2),
                    "prediction_horizon_hours": prediction.horizon_hours
                }
            }
        return None

    @staticmethod
    def detect_atmospheric_conditions(
        station_id: int,
        weather: Optional[WeatherReanalysis],
        thresholds: AlertThresholdSettings = alert_thresholds
    ) -> List[Dict[str, Any]]:
        """
        Evaluates meteorological variables for atmospheric stagnation and poor dispersion.
        """
        candidates: List[Dict[str, Any]] = []
        if not weather:
            return candidates

        wind_speed = float(weather.wind_speed_ms)
        pbl_height = float(weather.pbl_height_m)
        ventilation_idx = wind_speed * pbl_height
        timestamp = weather.datetime_utc

        # 1. Low wind condition
        if wind_speed <= thresholds.low_wind_speed_ms:
            candidates.append({
                "station_id": station_id,
                "alert_type": AlertType.LOW_WIND.value,
                "severity": AlertSeverity.LOW.value,
                "pollutant": None,
                "observed_value": round(wind_speed, 2),
                "threshold_value": thresholds.low_wind_speed_ms,
                "expected_value": 3.0,
                "deviation": round(thresholds.low_wind_speed_ms - wind_speed, 2),
                "message": (
                    f"Near-calm surface winds ({wind_speed:.1f} m/s <= {thresholds.low_wind_speed_ms} m/s) "
                    f"substantially constraining lateral dispersion of surface emissions."
                ),
                "source": "REANALYSIS",
                "started_at": timestamp,
                "alert_metadata": {
                    "wind_speed_ms": round(wind_speed, 2),
                    "wind_direction_deg": weather.wind_dir_deg,
                    "data_classification": weather.data_provenance
                }
            })

        # 2. Shallow boundary layer condition
        if pbl_height <= thresholds.low_pbl_height_m:
            candidates.append({
                "station_id": station_id,
                "alert_type": AlertType.LOW_PBL.value,
                "severity": AlertSeverity.LOW.value,
                "pollutant": None,
                "observed_value": round(pbl_height, 1),
                "threshold_value": thresholds.low_pbl_height_m,
                "expected_value": 800.0,
                "deviation": round(thresholds.low_pbl_height_m - pbl_height, 1),
                "message": (
                    f"Shallow planetary boundary layer ({pbl_height:.0f} m <= {thresholds.low_pbl_height_m:.0f} m) "
                    f"compressing atmospheric dilution volume above urban canopy."
                ),
                "source": "REANALYSIS",
                "started_at": timestamp,
                "alert_metadata": {
                    "pbl_height_m": round(pbl_height, 1),
                    "temperature_c": weather.temp_c,
                    "data_classification": weather.data_provenance
                }
            })

        # 3. Compound atmospheric stagnation
        is_stagnant = (
            ventilation_idx <= thresholds.stagnation_ventilation_index_m2s
            or (wind_speed <= thresholds.stagnation_wind_speed_ms and pbl_height <= thresholds.stagnation_pbl_height_m)
        )
        if is_stagnant:
            severity = AlertSeverity.HIGH if (ventilation_idx <= 250.0 or wind_speed <= 0.8) else AlertSeverity.MEDIUM
            candidates.append({
                "station_id": station_id,
                "alert_type": AlertType.ATMOSPHERIC_STAGNATION.value,
                "severity": severity.value,
                "pollutant": None,
                "observed_value": round(ventilation_idx, 1),
                "threshold_value": thresholds.stagnation_ventilation_index_m2s,
                "expected_value": 1500.0,
                "deviation": round(thresholds.stagnation_ventilation_index_m2s - ventilation_idx, 1),
                "message": (
                    f"Atmospheric stagnation detected: Ventilation coefficient is {ventilation_idx:.1f} m²/s "
                    f"(Wind: {wind_speed:.1f} m/s, PBL: {pbl_height:.0f} m), severely impeding pollution dispersal."
                ),
                "source": "REANALYSIS",
                "started_at": timestamp,
                "alert_metadata": {
                    "ventilation_coefficient_m2s": round(ventilation_idx, 1),
                    "wind_speed_ms": round(wind_speed, 2),
                    "pbl_height_m": round(pbl_height, 1),
                    "humidity_pct": weather.humidity_pct,
                    "dispersion_status": "CRITICAL_INVERSION_OR_STAGNATION"
                }
            })

        return candidates

    @staticmethod
    def detect_sensor_freshness(
        station_id: int,
        latest_obs: Optional[EnvironmentalObservation],
        evaluation_time_utc: datetime,
        thresholds: AlertThresholdSettings = alert_thresholds
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluates sensor feed latency. If no valid observation is recorded within
        the configured freshness horizon, raises DATA_GAP or SENSOR_OFFLINE alerts.
        """
        if evaluation_time_utc.tzinfo is None:
            evaluation_time_utc = evaluation_time_utc.replace(tzinfo=timezone.utc)

        if not latest_obs or not latest_obs.datetime_utc:
            return {
                "station_id": station_id,
                "alert_type": AlertType.SENSOR_OFFLINE.value,
                "severity": AlertSeverity.CRITICAL.value,
                "pollutant": None,
                "observed_value": None,
                "threshold_value": thresholds.sensor_stale_hours_offline,
                "expected_value": 0.0,
                "deviation": None,
                "message": f"Station {station_id} has no recorded physical observations in persistence store.",
                "source": "DERIVED",
                "started_at": evaluation_time_utc,
                "alert_metadata": {
                    "status": "NO_RECORDS_FOUND",
                    "evaluation_time": evaluation_time_utc.isoformat()
                }
            }

        last_time = latest_obs.datetime_utc
        if last_time.tzinfo is None:
            last_time = last_time.replace(tzinfo=timezone.utc)

        elapsed_hours = (evaluation_time_utc - last_time).total_seconds() / 3600.0

        if elapsed_hours >= thresholds.sensor_stale_hours_offline:
            return {
                "station_id": station_id,
                "alert_type": AlertType.SENSOR_OFFLINE.value,
                "severity": AlertSeverity.HIGH.value,
                "pollutant": None,
                "observed_value": round(elapsed_hours, 1),
                "threshold_value": thresholds.sensor_stale_hours_offline,
                "expected_value": 1.0,
                "deviation": round(elapsed_hours - thresholds.sensor_stale_hours_offline, 1),
                "message": (
                    f"Station {station_id} sensor feed is offline: No telemetry received for {elapsed_hours:.1f} hours "
                    f"(Threshold: {thresholds.sensor_stale_hours_offline:.0f} hours)."
                ),
                "source": "DERIVED",
                "started_at": last_time,
                "alert_metadata": {
                    "last_seen_utc": last_time.isoformat(),
                    "elapsed_hours": round(elapsed_hours, 1),
                    "telemetry_state": "OFFLINE"
                }
            }
        elif elapsed_hours >= thresholds.sensor_stale_hours_data_gap:
            return {
                "station_id": station_id,
                "alert_type": AlertType.DATA_GAP.value,
                "severity": AlertSeverity.LOW.value,
                "pollutant": None,
                "observed_value": round(elapsed_hours, 1),
                "threshold_value": thresholds.sensor_stale_hours_data_gap,
                "expected_value": 1.0,
                "deviation": round(elapsed_hours - thresholds.sensor_stale_hours_data_gap, 1),
                "message": (
                    f"Station {station_id} telemetry gap: {elapsed_hours:.1f} hours have elapsed since the last observation."
                ),
                "source": "DERIVED",
                "started_at": last_time,
                "alert_metadata": {
                    "last_seen_utc": last_time.isoformat(),
                    "elapsed_hours": round(elapsed_hours, 1),
                    "telemetry_state": "DATA_GAP"
                }
            }

        return None


# Module-level convenience functions
detect_pollutant_thresholds = AnomalyDetector.detect_pollutant_thresholds
detect_pm25_spike = AnomalyDetector.detect_pm25_spike
detect_statistical_anomaly = AnomalyDetector.detect_statistical_anomaly
detect_forecast_deviation = AnomalyDetector.detect_forecast_deviation
detect_atmospheric_conditions = AnomalyDetector.detect_atmospheric_conditions
detect_sensor_freshness = AnomalyDetector.detect_sensor_freshness
