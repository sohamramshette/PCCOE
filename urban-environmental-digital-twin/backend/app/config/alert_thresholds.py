"""
Urban Environmental Digital Twin - Alert Threshold Configuration
==================================================================
Centralizes scientific thresholds, epidemiological benchmarks, and anomaly
detection hyperparameters for the Environmental Alert & Anomaly Engine.

Documentation of Standards:
- Pollutant Thresholds: Aligned with Central Pollution Control Board (CPCB)
  National Ambient Air Quality Standards (NAAQS) and National AQI (NAQI) breakpoints.
  Reference: CPCB Notification No. B-29016/20/90/PCI-L (2009) & NAQI Technical Bulletin.
- Dispersion & Meteorology: Atmospheric stagnation defined using World Meteorological
  Organization (WMO) / EPA ventilation coefficient standards (< 500 m²/s = critical stagnation).
- Statistical Anomalies: Deterministic two-sided z-score against rolling station history.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class PollutantThresholdConfig(BaseModel):
    """Multi-tier thresholds for individual pollutants."""
    warning: float = Field(description="Moderate/Warning tier threshold")
    alert: float = Field(description="Poor/Alert tier threshold")
    critical: float = Field(description="Severe/Critical tier threshold")
    unit: str = Field(description="Measurement unit: µg/m³ or mg/m³")
    regulatory_standard: str = Field(default="CPCB NAAQS 24-hr standard", description="Authoritative standard reference")


class AlertThresholdSettings(BaseModel):
    """Centralized configurable rules and hyperparameters for anomaly and alert detection."""

    # 1. Multi-Pollutant Thresholds (NAAQS / NAQI Breakpoints)
    pollutants: Dict[str, PollutantThresholdConfig] = Field(
        default={
            "pm25": PollutantThresholdConfig(
                warning=60.0,
                alert=90.0,
                critical=120.0,
                unit="µg/m³",
                regulatory_standard="CPCB NAAQS 24-hr standard (60 µg/m³), NAQI Poor (90 µg/m³), Very Poor (120 µg/m³)"
            ),
            "pm10": PollutantThresholdConfig(
                warning=100.0,
                alert=250.0,
                critical=350.0,
                unit="µg/m³",
                regulatory_standard="CPCB NAAQS 24-hr standard (100 µg/m³), NAQI Poor (250 µg/m³), Very Poor (350 µg/m³)"
            ),
            "no2": PollutantThresholdConfig(
                warning=80.0,
                alert=180.0,
                critical=280.0,
                unit="µg/m³",
                regulatory_standard="CPCB NAAQS 24-hr standard (80 µg/m³), NAQI Poor (180 µg/m³)"
            ),
            "so2": PollutantThresholdConfig(
                warning=80.0,
                alert=380.0,
                critical=800.0,
                unit="µg/m³",
                regulatory_standard="CPCB NAAQS 24-hr standard (80 µg/m³), NAQI Poor (380 µg/m³)"
            ),
            "co": PollutantThresholdConfig(
                warning=2.0,
                alert=4.0,
                critical=10.0,
                unit="mg/m³",
                regulatory_standard="CPCB NAAQS 8-hr standard (2.0 mg/m³), NAQI Poor (4.0 mg/m³)"
            ),
            "o3": PollutantThresholdConfig(
                warning=100.0,
                alert=168.0,
                critical=208.0,
                unit="µg/m³",
                regulatory_standard="CPCB NAAQS 8-hr standard (100 µg/m³), NAQI Poor (168 µg/m³)"
            ),
        }
    )

    # 2. PM2.5 Sudden Spike Detection
    # Detects rapid physical concentration surges between consecutive hourly observations
    pm25_spike_percent_threshold: float = Field(
        default=50.0,
        description="Percentage surge over previous valid hourly observation required to trigger PM25_SPIKE (e.g. 50%)"
    )
    pm25_spike_min_absolute_diff: float = Field(
        default=15.0,
        description="Minimum absolute increase (µg/m³) required to prevent false alarms on low-concentration sensor noise"
    )

    # 3. Statistical PM2.5 Anomaly Detection (Z-Score Rolling Baseline)
    # Detects unusual deviations from station's recent temporal baseline without imputing missing values
    anomaly_window_hours: int = Field(
        default=24,
        description="Historical rolling window in hours to compute station baseline mean and standard deviation"
    )
    anomaly_z_score_threshold: float = Field(
        default=2.5,
        description="Two-sided z-score magnitude (|z| >= 2.5) above which observation is classified as statistical anomaly"
    )
    anomaly_min_valid_observations: int = Field(
        default=6,
        description="Minimum non-null valid observations in window required for statistical stability"
    )
    anomaly_min_standard_deviation: float = Field(
        default=2.0,
        description="Minimum standard deviation (µg/m³) to avoid division-by-zero or over-triggering in ultra-stable conditions"
    )

    # 4. Forecast-vs-Actual Deviation Detection
    # Compares ground-truth observed PM2.5 against previously generated model forecast for target hour
    forecast_deviation_threshold: float = Field(
        default=20.0,
        description="Absolute error (|actual - predicted|) in µg/m³ indicating model prediction divergence (MEDIUM severity)"
    )
    forecast_deviation_critical_threshold: float = Field(
        default=40.0,
        description="Severe forecast error threshold in µg/m³ (HIGH severity)"
    )

    # 5. Sensor Freshness & Telemetry Health
    # Flags latency or outages in station sensor feeds without confusing missing values with zero concentrations
    sensor_stale_hours_data_gap: float = Field(
        default=3.0,
        description="Elapsed hours since latest valid observation before raising DATA_GAP alert (LOW severity)"
    )
    sensor_stale_hours_offline: float = Field(
        default=6.0,
        description="Elapsed hours since latest valid observation before raising SENSOR_OFFLINE alert (HIGH severity)"
    )

    # 6. Atmospheric Dispersion & Stagnation Detection
    # Meteorological conditions that inhibit pollutant dilution and trapping surface emissions
    low_wind_speed_ms: float = Field(
        default=1.0,
        description="10m wind speed threshold (m/s) below which lateral advection is severely limited"
    )
    low_pbl_height_m: float = Field(
        default=250.0,
        description="Planetary boundary layer height (m) below which vertical mixing is constrained"
    )
    stagnation_wind_speed_ms: float = Field(
        default=1.5,
        description="Wind speed criterion for atmospheric stagnation compound check (m/s)"
    )
    stagnation_pbl_height_m: float = Field(
        default=350.0,
        description="PBL height criterion for atmospheric stagnation compound check (m)"
    )
    stagnation_ventilation_index_m2s: float = Field(
        default=500.0,
        description="Ventilation coefficient threshold (wind speed * PBL height, m²/s) representing critical air trapping"
    )


# Singleton instance
alert_thresholds = AlertThresholdSettings()
ALERT_THRESHOLDS = alert_thresholds
