"""
Urban Environmental Digital Twin - Canonical Alert & Anomaly Seeder
====================================================================
Populates the alerts table with realistic, scientifically grounded environmental
alerts across all 6 Pune CAAQMS monitoring stations, all 10 anomaly types,
and all lifecycle states (ACTIVE, ACKNOWLEDGED, RESOLVED).

Adheres to:
- CPCB NAAQS thresholds (PM2.5: 60/90/120 ug/m3, PM10: 100/250/350 ug/m3)
- WMO atmospheric ventilation stagnation bounds (< 500 m2/s)
- Rolling z-score statistical anomalies (> 2.5 sigma)
- Sudden PM2.5 surge criteria (> 50% / > 15 ug/m3)
- Model forecast deviation criteria (> 25 ug/m3 divergence)
"""

import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database.session import SessionLocal
from backend.app.models.station import Station
from backend.app.models.alert import Alert, AlertStatus, AlertSeverity, AlertType
from backend.app.config.alert_thresholds import alert_thresholds


def seed_alerts(db, clean: bool = False) -> int:
    """Seeds canonical and historical alerts across all stations and factors."""
    if clean:
        deleted = db.query(Alert).delete()
        db.commit()
        print(f"Cleared {deleted} existing alert records.")

    existing_count = db.query(Alert).count()
    if existing_count > 0 and not clean:
        print(f"Alerts table already contains {existing_count} records. Skipping seed (use clean=True to reset).")
        return existing_count

    stations = db.query(Station).all()
    if not stations:
        print("Error: No stations found in database. Please run load_reference_data.py first.")
        return 0

    station_dict = {s.station_id: s.station_name for s in stations}
    now_utc = datetime.now(timezone.utc)

    alerts_to_create: List[Dict[str, Any]] = [
        # =========================================================================
        # 1. STATION: BHOSARI (3409331) - Industrial & Commercial Belt
        # =========================================================================
        {
            "station_id": 3409331,
            "alert_type": AlertType.PM25_THRESHOLD.value,
            "severity": AlertSeverity.HIGH.value,
            "pollutant": "pm25",
            "observed_value": 94.6,
            "threshold_value": 90.0,
            "expected_value": 90.0,
            "deviation": 4.6,
            "message": "PM2.5 observed at 94.6 µg/m³, exceeding NAQI Poor threshold (90.0 µg/m³) by +4.6 µg/m³ in Bhosari MIDC industrial zone.",
            "source": "OBSERVED",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=3, minutes=15),
            "detected_at": now_utc - timedelta(hours=3, minutes=15),
            "alert_metadata": {
                "regulatory_standard": "CPCB NAAQS 24-hr standard (60 µg/m³), NAQI Poor (90 µg/m³)",
                "unit": "µg/m³",
                "industrial_zone": "PCMC Bhosari MIDC Sector 7",
                "recommended_action": "Issue industrial boiler stack emission inspection notice"
            }
        },
        {
            "station_id": 3409331,
            "alert_type": AlertType.ATMOSPHERIC_STAGNATION.value,
            "severity": AlertSeverity.MEDIUM.value,
            "pollutant": None,
            "observed_value": 342.0,
            "threshold_value": 500.0,
            "expected_value": 1500.0,
            "deviation": 158.0,
            "message": "Atmospheric stagnation detected: Ventilation coefficient is 342.0 m²/s (Wind: 0.9 m/s, PBL: 380 m), severely impeding pollution dispersal.",
            "source": "REANALYSIS",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=2),
            "detected_at": now_utc - timedelta(hours=2),
            "alert_metadata": {
                "ventilation_coefficient_m2s": 342.0,
                "wind_speed_ms": 0.9,
                "pbl_height_m": 380.0,
                "dispersion_status": "CRITICAL_INVERSION_OR_STAGNATION"
            }
        },
        {
            "station_id": 3409331,
            "alert_type": AlertType.PM10_THRESHOLD.value,
            "severity": AlertSeverity.CRITICAL.value,
            "pollutant": "pm10",
            "observed_value": 362.4,
            "threshold_value": 350.0,
            "expected_value": 100.0,
            "deviation": 12.4,
            "message": "PM10 observed at 362.4 µg/m³, exceeding CPCB Severe/Critical tier threshold (350.0 µg/m³) during heavy transit loading.",
            "source": "OBSERVED",
            "status": AlertStatus.RESOLVED.value,
            "started_at": now_utc - timedelta(days=5, hours=8),
            "detected_at": now_utc - timedelta(days=5, hours=8),
            "ended_at": now_utc - timedelta(days=5, hours=2),
            "alert_metadata": {
                "regulatory_standard": "CPCB NAAQS 24-hr standard (100 µg/m³), NAQI Severe (350 µg/m³)",
                "unit": "µg/m³",
                "resolution_notes": "Dust suppression water canons activated along Spine Road corridor; concentrations dropped to 142 µg/m³"
            }
        },

        # =========================================================================
        # 2. STATION: HADAPSAR (60658) - Transit Hub & Mixed Industrial / Highway
        # =========================================================================
        {
            "station_id": 60658,
            "alert_type": AlertType.PM25_SPIKE.value,
            "severity": AlertSeverity.HIGH.value,
            "pollutant": "pm25",
            "observed_value": 73.3,
            "threshold_value": 63.0,
            "expected_value": 42.0,
            "deviation": 74.5,
            "message": "PM2.5 surged by +74.5% (+31.3 µg/m³) from 42.0 to 73.3 µg/m³ within consecutive hourly observations.",
            "source": "OBSERVED",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=1, minutes=45),
            "detected_at": now_utc - timedelta(hours=1, minutes=45),
            "alert_metadata": {
                "previous_value": 42.0,
                "absolute_surge_ugm3": 31.3,
                "percent_surge": 74.5,
                "suspected_cause": "Localized vehicular bottleneck on Pune-Solapur highway"
            }
        },
        {
            "station_id": 60658,
            "alert_type": AlertType.LOW_WIND.value,
            "severity": AlertSeverity.LOW.value,
            "pollutant": None,
            "observed_value": 0.85,
            "threshold_value": 1.0,
            "expected_value": 3.0,
            "deviation": 0.15,
            "message": "Sub-critical surface wind speed (0.85 m/s <= 1.0 m/s) preventing horizontal advection in Hadapsar valley basin.",
            "source": "REANALYSIS",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=4),
            "detected_at": now_utc - timedelta(hours=4),
            "alert_metadata": {
                "wind_speed_ms": 0.85,
                "wind_direction_deg": 115.0,
                "dispersion_risk": "ELEVATED"
            }
        },
        {
            "station_id": 60658,
            "alert_type": AlertType.PM25_THRESHOLD.value,
            "severity": AlertSeverity.CRITICAL.value,
            "pollutant": "pm25",
            "observed_value": 184.2,
            "threshold_value": 120.0,
            "expected_value": 60.0,
            "deviation": 64.2,
            "message": "PM2.5 observed at 184.2 µg/m³, exceeding critical emergency threshold (120.0 µg/m³) during nocturnal ground inversion.",
            "source": "OBSERVED",
            "status": AlertStatus.ACKNOWLEDGED.value,
            "started_at": now_utc - timedelta(days=1, hours=6),
            "detected_at": now_utc - timedelta(days=1, hours=6),
            "alert_metadata": {
                "acknowledged_by": "Senior Environmental Operations Officer",
                "operational_note": "Field verification underway; heavy diesel freight diverted to outer ring bypass",
                "unit": "µg/m³"
            }
        },

        # =========================================================================
        # 3. STATION: KATRAJ DAIRY (3409438) - Southern Valley Highway Terminal
        # =========================================================================
        {
            "station_id": 3409438,
            "alert_type": AlertType.PM25_ANOMALY.value,
            "severity": AlertSeverity.HIGH.value,
            "pollutant": "pm25",
            "observed_value": 85.0,
            "threshold_value": 72.4,
            "expected_value": 38.2,
            "deviation": 2.95,
            "message": "Statistical PM2.5 anomaly detected: 85.0 µg/m³ is 2.95 standard deviations elevated above rolling 24h baseline mean of 38.2 µg/m³ (σ=15.9).",
            "source": "DERIVED",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=2, minutes=30),
            "detected_at": now_utc - timedelta(hours=2, minutes=30),
            "alert_metadata": {
                "baseline_mean": 38.2,
                "baseline_std": 15.9,
                "z_score": 2.95,
                "statistical_method": "rolling_two_sided_z_score"
            }
        },
        {
            "station_id": 3409438,
            "alert_type": AlertType.FORECAST_DEVIATION.value,
            "severity": AlertSeverity.MEDIUM.value,
            "pollutant": "pm25",
            "observed_value": 85.0,
            "threshold_value": 25.0,
            "expected_value": 52.0,
            "deviation": 33.0,
            "message": "Forecast deviation alert: Model 'gradient_boosting_baseline' underpredicted PM2.5 by 33.0 µg/m³ (Predicted: 52.0, Actual: 85.0 µg/m³).",
            "source": "DERIVED",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=2),
            "detected_at": now_utc - timedelta(hours=2),
            "alert_metadata": {
                "model_id": "gradient_boosting_baseline",
                "predicted_pm25": 52.0,
                "actual_pm25": 85.0,
                "absolute_error": 33.0,
                "prediction_horizon_hours": 1
            }
        },
        {
            "station_id": 3409438,
            "alert_type": AlertType.PM25_SPIKE.value,
            "severity": AlertSeverity.CRITICAL.value,
            "pollutant": "pm25",
            "observed_value": 375.1,
            "threshold_value": 180.0,
            "expected_value": 92.0,
            "deviation": 307.7,
            "message": "PM2.5 surged by +307.7% (+283.1 µg/m³) from 92.0 to 375.1 µg/m³ during ghat pass freight backlog.",
            "source": "OBSERVED",
            "status": AlertStatus.RESOLVED.value,
            "started_at": now_utc - timedelta(days=15, hours=9),
            "detected_at": now_utc - timedelta(days=15, hours=9),
            "ended_at": now_utc - timedelta(days=15, hours=3),
            "alert_metadata": {
                "previous_value": 92.0,
                "absolute_surge_ugm3": 283.1,
                "percent_surge": 307.7,
                "resolution_notes": "Traffic clearance and wind picking up to 4.2 m/s restored normal air quality."
            }
        },

        # =========================================================================
        # 4. STATION: REVENUE COLONY-SHIVAJINAGAR (11613) - Urban Core Center
        # =========================================================================
        {
            "station_id": 11613,
            "alert_type": AlertType.PM10_THRESHOLD.value,
            "severity": AlertSeverity.MEDIUM.value,
            "pollutant": "pm10",
            "observed_value": 114.5,
            "threshold_value": 100.0,
            "expected_value": 100.0,
            "deviation": 14.5,
            "message": "PM10 observed at 114.5 µg/m³, exceeding CPCB Moderate/Warning tier threshold (100.0 µg/m³) by +14.5 µg/m³.",
            "source": "OBSERVED",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=5),
            "detected_at": now_utc - timedelta(hours=5),
            "alert_metadata": {
                "regulatory_standard": "CPCB NAAQS 24-hr standard (100 µg/m³)",
                "unit": "µg/m³",
                "urban_context": "Shivajinagar Commercial / JM Road intersection"
            }
        },
        {
            "station_id": 11613,
            "alert_type": AlertType.LOW_PBL.value,
            "severity": AlertSeverity.MEDIUM.value,
            "pollutant": None,
            "observed_value": 185.0,
            "threshold_value": 200.0,
            "expected_value": 800.0,
            "deviation": 15.0,
            "message": "Shallow planetary boundary layer (185 m <= 200 m) compressing atmospheric dilution volume above urban canopy.",
            "source": "REANALYSIS",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=3, minutes=45),
            "detected_at": now_utc - timedelta(hours=3, minutes=45),
            "alert_metadata": {
                "pbl_height_m": 185.0,
                "data_classification": "ERA5_REANALYSIS"
            }
        },
        {
            "station_id": 11613,
            "alert_type": AlertType.PM25_THRESHOLD.value,
            "severity": AlertSeverity.HIGH.value,
            "pollutant": "pm25",
            "observed_value": 92.4,
            "threshold_value": 90.0,
            "expected_value": 60.0,
            "deviation": 2.4,
            "message": "PM2.5 observed at 92.4 µg/m³, exceeding alert threshold (90.0 µg/m³) during festival evening traffic rush.",
            "source": "OBSERVED",
            "status": AlertStatus.ACKNOWLEDGED.value,
            "started_at": now_utc - timedelta(days=2, hours=10),
            "detected_at": now_utc - timedelta(days=2, hours=10),
            "alert_metadata": {
                "acknowledged_by": "PMC Air Quality Cell",
                "operational_note": "Advisory issued for JM Road traffic rerouting via riverside road"
            }
        },

        # =========================================================================
        # 5. STATION: MHADA COLONY (11609) - North-Eastern Airport Corridor
        # =========================================================================
        {
            "station_id": 11609,
            "alert_type": AlertType.PM25_THRESHOLD.value,
            "severity": AlertSeverity.MEDIUM.value,
            "pollutant": "pm25",
            "observed_value": 68.7,
            "threshold_value": 60.0,
            "expected_value": 60.0,
            "deviation": 8.7,
            "message": "PM2.5 observed at 68.7 µg/m³, exceeding CPCB Moderate/Warning tier threshold (60.0 µg/m³) by +8.7 µg/m³.",
            "source": "OBSERVED",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=4, minutes=10),
            "detected_at": now_utc - timedelta(hours=4, minutes=10),
            "alert_metadata": {
                "regulatory_standard": "CPCB NAAQS 24-hr standard (60 µg/m³)",
                "unit": "µg/m³"
            }
        },
        {
            "station_id": 11609,
            "alert_type": AlertType.ATMOSPHERIC_STAGNATION.value,
            "severity": AlertSeverity.HIGH.value,
            "pollutant": None,
            "observed_value": 245.0,
            "threshold_value": 500.0,
            "expected_value": 1500.0,
            "deviation": 255.0,
            "message": "Critical atmospheric stagnation detected: Ventilation coefficient is 245.0 m²/s (Wind: 0.7 m/s, PBL: 350 m), severely impeding pollution dispersal near airport runway.",
            "source": "REANALYSIS",
            "status": AlertStatus.RESOLVED.value,
            "started_at": now_utc - timedelta(days=3, hours=12),
            "detected_at": now_utc - timedelta(days=3, hours=12),
            "ended_at": now_utc - timedelta(days=3, hours=5),
            "alert_metadata": {
                "ventilation_coefficient_m2s": 245.0,
                "wind_speed_ms": 0.7,
                "pbl_height_m": 350.0,
                "resolution_notes": "Afternoon convection deepened PBL to 1250 m, restoring rapid atmospheric venting."
            }
        },

        # =========================================================================
        # 6. STATION: PANCHAWATI_PASHAN (3409526) - Western Foothills & Educational
        # =========================================================================
        {
            "station_id": 3409526,
            "alert_type": AlertType.DATA_GAP.value,
            "severity": AlertSeverity.LOW.value,
            "pollutant": None,
            "observed_value": 2.5,
            "threshold_value": 2.0,
            "expected_value": 1.0,
            "deviation": 0.5,
            "message": "Telemetry transmission latency exceeded 2.5 hours since last verified packet reception.",
            "source": "DERIVED",
            "status": AlertStatus.ACTIVE.value,
            "started_at": now_utc - timedelta(hours=2, minutes=30),
            "detected_at": now_utc - timedelta(hours=2, minutes=30),
            "alert_metadata": {
                "last_packet_age_hours": 2.5,
                "telemetry_protocol": "OpenAQ MQTT/REST gateway"
            }
        },
        {
            "station_id": 3409526,
            "alert_type": AlertType.SENSOR_OFFLINE.value,
            "severity": AlertSeverity.CRITICAL.value,
            "pollutant": None,
            "observed_value": 14.0,
            "threshold_value": 6.0,
            "expected_value": 0.0,
            "deviation": 8.0,
            "message": "CAAQMS sensor offline: Station telemetry gap exceeded 14 consecutive hours without valid optical observation.",
            "source": "DERIVED",
            "status": AlertStatus.RESOLVED.value,
            "started_at": now_utc - timedelta(days=7, hours=18),
            "detected_at": now_utc - timedelta(days=7, hours=18),
            "ended_at": now_utc - timedelta(days=7, hours=4),
            "alert_metadata": {
                "offline_duration_hours": 14.0,
                "resolution_notes": "Power supply unit replaced by IITM maintenance crew; optical laser particle counter recalibrated."
            }
        },
        {
            "station_id": 3409526,
            "alert_type": AlertType.FORECAST_DEVIATION.value,
            "severity": AlertSeverity.MEDIUM.value,
            "pollutant": "pm25",
            "observed_value": 64.2,
            "threshold_value": 25.0,
            "expected_value": 36.0,
            "deviation": 28.2,
            "message": "Forecast deviation alert: Model 'gradient_boosting_baseline' underpredicted PM2.5 by 28.2 µg/m³ (Predicted: 36.0, Actual: 64.2 µg/m³).",
            "source": "DERIVED",
            "status": AlertStatus.RESOLVED.value,
            "started_at": now_utc - timedelta(days=4, hours=6),
            "detected_at": now_utc - timedelta(days=4, hours=6),
            "ended_at": now_utc - timedelta(days=4, hours=2),
            "alert_metadata": {
                "model_id": "gradient_boosting_baseline",
                "predicted_pm25": 36.0,
                "actual_pm25": 64.2,
                "absolute_error": 28.2
            }
        },

        # =========================================================================
        # 7. HISTORICAL SEVERE WINTER SMOG & INVERSION EPISODES (RESOLVED)
        # =========================================================================
        {
            "station_id": 60658,
            "alert_type": AlertType.ATMOSPHERIC_STAGNATION.value,
            "severity": AlertSeverity.CRITICAL.value,
            "pollutant": None,
            "observed_value": 182.0,
            "threshold_value": 500.0,
            "expected_value": 1500.0,
            "deviation": 318.0,
            "message": "Severe nocturnal ground thermal inversion: Ventilation coefficient 182.0 m²/s with sub-meter wind (0.5 m/s) and compressed 364m PBL.",
            "source": "REANALYSIS",
            "status": AlertStatus.RESOLVED.value,
            "started_at": datetime(2025, 12, 26, 16, 0, tzinfo=timezone.utc),
            "detected_at": datetime(2025, 12, 26, 16, 0, tzinfo=timezone.utc),
            "ended_at": datetime(2025, 12, 27, 8, 0, tzinfo=timezone.utc),
            "alert_metadata": {
                "canonical_scenario": "Winter Smog Inversion",
                "peak_pm25_observed": 570.8,
                "resolution_notes": "Daytime radiative solar heating broke inversion cap by 09:00 UTC."
            }
        },
        {
            "station_id": 3409438,
            "alert_type": AlertType.PM25_THRESHOLD.value,
            "severity": AlertSeverity.CRITICAL.value,
            "pollutant": "pm25",
            "observed_value": 306.9,
            "threshold_value": 120.0,
            "expected_value": 60.0,
            "deviation": 186.9,
            "message": "PM2.5 observed at 306.9 µg/m³, exceeding critical threshold (120.0 µg/m³) during severe winter morning commute.",
            "source": "OBSERVED",
            "status": AlertStatus.RESOLVED.value,
            "started_at": datetime(2026, 1, 6, 7, 0, tzinfo=timezone.utc),
            "detected_at": datetime(2026, 1, 6, 7, 0, tzinfo=timezone.utc),
            "ended_at": datetime(2026, 1, 6, 14, 0, tzinfo=timezone.utc),
            "alert_metadata": {
                "canonical_scenario": "Winter Traffic Morning Peak",
                "traffic_congestion_index": 0.88,
                "resolution_notes": "Post-commute traffic dispersion restored PM2.5 to 58.4 µg/m³."
            }
        },
        {
            "station_id": 11613,
            "alert_type": AlertType.PM25_SPIKE.value,
            "severity": AlertSeverity.HIGH.value,
            "pollutant": "pm25",
            "observed_value": 118.5,
            "threshold_value": 82.5,
            "expected_value": 55.0,
            "deviation": 115.5,
            "message": "PM2.5 surged by +115.5% (+63.5 µg/m³) from 55.0 to 118.5 µg/m³ within consecutive hourly observations.",
            "source": "OBSERVED",
            "status": AlertStatus.RESOLVED.value,
            "started_at": datetime(2026, 2, 14, 18, 0, tzinfo=timezone.utc),
            "detected_at": datetime(2026, 2, 14, 18, 0, tzinfo=timezone.utc),
            "ended_at": datetime(2026, 2, 15, 2, 0, tzinfo=timezone.utc),
            "alert_metadata": {
                "previous_value": 55.0,
                "surge_magnitude_pct": 115.5,
                "resolution_notes": "Rapid evening gust dispersed localized fireworks smoke."
            }
        },
        {
            "station_id": 11609,
            "alert_type": AlertType.LOW_WIND.value,
            "severity": AlertSeverity.LOW.value,
            "pollutant": None,
            "observed_value": 0.6,
            "threshold_value": 1.0,
            "expected_value": 3.0,
            "deviation": 0.4,
            "message": "Sub-critical surface wind speed (0.6 m/s <= 1.0 m/s) preventing horizontal advection across eastern corridor.",
            "source": "REANALYSIS",
            "status": AlertStatus.RESOLVED.value,
            "started_at": datetime(2026, 3, 10, 22, 0, tzinfo=timezone.utc),
            "detected_at": datetime(2026, 3, 10, 22, 0, tzinfo=timezone.utc),
            "ended_at": datetime(2026, 3, 11, 6, 0, tzinfo=timezone.utc),
            "alert_metadata": {
                "wind_speed_ms": 0.6,
                "resolution_notes": "Morning easterly breeze resumed at 3.4 m/s."
            }
        },
        {
            "station_id": 3409331,
            "alert_type": AlertType.PM25_ANOMALY.value,
            "severity": AlertSeverity.HIGH.value,
            "pollutant": "pm25",
            "observed_value": 145.2,
            "threshold_value": 98.0,
            "expected_value": 48.0,
            "deviation": 3.4,
            "message": "Statistical PM2.5 anomaly detected: 145.2 µg/m³ is 3.40 standard deviations elevated above rolling baseline mean of 48.0 µg/m³.",
            "source": "DERIVED",
            "status": AlertStatus.RESOLVED.value,
            "started_at": datetime(2026, 4, 18, 14, 0, tzinfo=timezone.utc),
            "detected_at": datetime(2026, 4, 18, 14, 0, tzinfo=timezone.utc),
            "ended_at": datetime(2026, 4, 18, 22, 0, tzinfo=timezone.utc),
            "alert_metadata": {
                "z_score": 3.4,
                "resolution_notes": "Normalized back to seasonal baseline."
            }
        }
    ]

    for item in alerts_to_create:
        alert_obj = Alert(
            station_id=item["station_id"],
            alert_type=item["alert_type"],
            severity=item["severity"],
            pollutant=item.get("pollutant"),
            observed_value=item.get("observed_value"),
            threshold_value=item.get("threshold_value"),
            expected_value=item.get("expected_value"),
            deviation=item.get("deviation"),
            message=item["message"],
            source=item.get("source", "OBSERVED"),
            status=item["status"],
            started_at=item["started_at"],
            detected_at=item["detected_at"],
            ended_at=item.get("ended_at"),
            alert_metadata=item.get("alert_metadata"),
        )
        db.add(alert_obj)

    try:
        db.commit()
        print(f"Successfully seeded {len(alerts_to_create)} environmental alerts into database.")
        print(f"Stations covered: {len(set(a['station_id'] for a in alerts_to_create))}")
        print(f"Alert types covered: {len(set(a['alert_type'] for a in alerts_to_create))}")
        print(f"Active: {sum(1 for a in alerts_to_create if a['status'] == AlertStatus.ACTIVE.value)}")
        print(f"Acknowledged: {sum(1 for a in alerts_to_create if a['status'] == AlertStatus.ACKNOWLEDGED.value)}")
        print(f"Resolved: {sum(1 for a in alerts_to_create if a['status'] == AlertStatus.RESOLVED.value)}")
        return len(alerts_to_create)
    except Exception as e:
        db.rollback()
        print(f"Error seeding alerts: {e}")
        raise


if __name__ == "__main__":
    db = SessionLocal()
    try:
        clean_flag = "--clean" in sys.argv or "--force" in sys.argv
        seed_alerts(db, clean=clean_flag)
    finally:
        db.close()
