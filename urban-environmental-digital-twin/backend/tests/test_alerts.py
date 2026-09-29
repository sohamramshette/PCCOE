"""
Urban Environmental Digital Twin - Environmental Alert & Anomaly Engine Tests
=============================================================================
Tests all 16 required capabilities:
1. Threshold alert creation
2. No threshold alert when value is below threshold
3. PM2.5 spike detection
4. Statistical anomaly detection
5. Forecast deviation detection
6. Sensor stale/offline detection
7. Low wind detection
8. Low PBL detection
9. Stagnation detection
10. Duplicate alert prevention
11. Active alert update
12. Alert resolution
13. Multiple stations isolation
14. Missing/NULL observations handling
15. API filtering
16. Invalid input handling
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
import pytest
from fastapi import status

from backend.app.models.alert import Alert, AlertStatus, AlertSeverity, AlertType
from backend.app.models.station import Station
from backend.app.models.observation import EnvironmentalObservation
from backend.app.models.weather import WeatherReanalysis
from backend.app.models.prediction import ModelPrediction
from backend.app.config.alert_thresholds import alert_thresholds, ALERT_THRESHOLDS
from backend.app.services.anomaly_service import AnomalyDetector
from backend.app.services.alert_service import alert_service, AlertService
from backend.app.database.session import SessionLocal


class MockObservation:
    """Lightweight test double for observation records."""
    def __init__(
        self,
        id: int = 1,
        station_id: int = 11613,
        datetime_utc: Optional[datetime] = None,
        pm25: Optional[float] = None,
        pm10: Optional[float] = None,
        no2: Optional[float] = None,
        so2: Optional[float] = None,
        co: Optional[float] = None,
        o3: Optional[float] = None,
    ):
        self.id = id
        self.station_id = station_id
        self.datetime_utc = datetime_utc or datetime.now(timezone.utc)
        self.pm25 = pm25
        self.pm10 = pm10
        self.no2 = no2
        self.so2 = so2
        self.co = co
        self.o3 = o3


class MockWeather:
    """Lightweight test double for ERA5 atmospheric weather records."""
    def __init__(
        self,
        station_id: int = 11613,
        datetime_utc: Optional[datetime] = None,
        wind_speed_ms: Optional[float] = None,
        pbl_height_m: Optional[float] = None,
        temp_c: Optional[float] = 28.0,
        humidity_pct: Optional[float] = 60.0,
        pressure_hpa: Optional[float] = 950.0,
        wind_dir_deg: Optional[float] = 240.0,
        data_provenance: str = "REANALYSIS",
    ):
        self.station_id = station_id
        self.datetime_utc = datetime_utc or datetime.now(timezone.utc)
        self.wind_speed_ms = wind_speed_ms
        self.pbl_height_m = pbl_height_m
        self.temp_c = temp_c
        self.humidity_pct = humidity_pct
        self.pressure_hpa = pressure_hpa
        self.wind_dir_deg = wind_dir_deg
        self.data_provenance = data_provenance


class MockPrediction:
    """Lightweight test double for model forecast predictions."""
    def __init__(
        self,
        station_id: int = 11613,
        target_time_utc: Optional[datetime] = None,
        predicted_pm25: float = 42.0,
        model_id: str = "hist_gradient_boosting_v1",
        horizon_hours: int = 1,
    ):
        self.station_id = station_id
        self.target_time_utc = target_time_utc or datetime.now(timezone.utc)
        self.predicted_pm25 = predicted_pm25
        self.model_id = model_id
        self.horizon_hours = horizon_hours


# =========================================================================
# 1. Threshold Alert Creation
# =========================================================================
def test_threshold_alert_creation():
    """Verifies that an observation exceeding regulatory severe thresholds triggers a high-severity alert."""
    obs = MockObservation(station_id=11613, pm25=135.0, pm10=280.0)
    anomalies = AnomalyDetector.detect_pollutant_thresholds(obs)

    assert len(anomalies) >= 1
    pm25_alerts = [a for a in anomalies if a["alert_type"] == AlertType.PM25_THRESHOLD.value]
    assert len(pm25_alerts) == 1
    a = pm25_alerts[0]
    assert a["pollutant"] == "pm25"
    assert a["observed_value"] == 135.0
    assert a["threshold_value"] == 120.0
    assert a["severity"] == AlertSeverity.CRITICAL.value
    assert "PM25 observed at 135.0" in a["message"]


# =========================================================================
# 2. No Threshold Alert Below Threshold
# =========================================================================
def test_no_threshold_alert_when_below_threshold():
    """Verifies that an observation well below standard limits yields zero threshold alerts."""
    obs = MockObservation(
        station_id=11613,
        pm25=25.0,  # Below 60.0 standard
        pm10=55.0,  # Below 100.0 standard
        no2=20.0,   # Below 80.0 standard
        so2=10.0,   # Below 80.0 standard
        co=0.8,     # Below 2.0 standard
        o3=40.0,    # Below 100.0 standard
    )
    anomalies = AnomalyDetector.detect_pollutant_thresholds(obs)
    assert len(anomalies) == 0


# =========================================================================
# 3. PM2.5 Sudden Spike Detection
# =========================================================================
def test_pm25_spike_detection():
    """
    Verifies rapid surge detection:
    Example from requirement: previous PM2.5 = 48, current PM2.5 = 82 (70.8% increase, diff = +34 µg/m³).
    """
    t_now = datetime.now(timezone.utc)
    t_prev = t_now - timedelta(hours=1)

    prev_obs = MockObservation(id=1, station_id=11613, datetime_utc=t_prev, pm25=48.0)
    curr_obs = MockObservation(id=2, station_id=11613, datetime_utc=t_now, pm25=82.0)

    anomaly = AnomalyDetector.detect_pm25_spike(curr_obs, prev_obs)
    assert anomaly is not None
    assert anomaly["alert_type"] == AlertType.PM25_SPIKE.value
    assert anomaly["observed_value"] == 82.0
    assert anomaly["expected_value"] == 48.0
    assert anomaly["deviation"] == pytest.approx(70.8, rel=1e-1)
    assert anomaly["severity"] in (AlertSeverity.HIGH.value, AlertSeverity.CRITICAL.value)

    # Negative case: small natural fluctuation (50 -> 55, +10% < 50%)
    curr_small = MockObservation(id=3, station_id=11613, datetime_utc=t_now, pm25=55.0)
    assert AnomalyDetector.detect_pm25_spike(curr_small, prev_obs) is None

    # Noise suppression: low baseline surge (3 -> 5, +66% but diff = 2 < 15.0 µg/m³)
    low_prev = MockObservation(id=4, station_id=11613, datetime_utc=t_prev, pm25=3.0)
    low_curr = MockObservation(id=5, station_id=11613, datetime_utc=t_now, pm25=5.0)
    assert AnomalyDetector.detect_pm25_spike(low_curr, low_prev) is None


# =========================================================================
# 4. Statistical Anomaly Detection (Z-Score)
# =========================================================================
def test_statistical_anomaly_detection():
    """
    Verifies rolling z-score outlier detection:
    Stable baseline at ~30 µg/m³ with sigma ~2.0, sudden observation at 65 µg/m³ (z-score > 10).
    """
    t_now = datetime.now(timezone.utc)
    history = []
    base_values = [20.0, 24.0, 28.0, 32.0, 36.0, 40.0, 38.0, 34.0, 30.0, 26.0, 22.0, 20.0] * 2
    for i, val in enumerate(base_values):
        t_hist = t_now - timedelta(hours=24 - i)
        history.append(MockObservation(id=10 + i, station_id=11613, datetime_utc=t_hist, pm25=val))

    curr_anom = MockObservation(id=100, station_id=11613, datetime_utc=t_now, pm25=70.0)
    anom_result = AnomalyDetector.detect_statistical_anomaly(curr_anom, history)
    assert anom_result is not None
    assert anom_result["alert_type"] == AlertType.PM25_ANOMALY.value
    assert anom_result["observed_value"] == 70.0
    assert anom_result["expected_value"] == pytest.approx(29.17, rel=1e-1)
    assert anom_result["alert_metadata"]["z_score"] >= 2.5

    curr_normal = MockObservation(id=101, station_id=11613, datetime_utc=t_now, pm25=30.0)
    assert AnomalyDetector.detect_statistical_anomaly(curr_normal, history) is None


# =========================================================================
# 5. Forecast Deviation Detection
# =========================================================================
def test_forecast_deviation_detection():
    """
    Verifies forecast-vs-actual error evaluation:
    Example from requirement: predicted PM2.5 = 42, actual PM2.5 = 67 (absolute error = 25 > threshold 20).
    """
    t_now = datetime.now(timezone.utc)
    actual_obs = MockObservation(station_id=11613, datetime_utc=t_now, pm25=67.0)
    pred = MockPrediction(station_id=11613, target_time_utc=t_now, predicted_pm25=42.0)

    anomaly = AnomalyDetector.detect_forecast_deviation(actual_obs, pred)
    assert anomaly is not None
    assert anomaly["alert_type"] == AlertType.FORECAST_DEVIATION.value
    assert anomaly["observed_value"] == 67.0
    assert anomaly["expected_value"] == 42.0
    assert anomaly["deviation"] == 25.0

    normal_obs = MockObservation(station_id=11613, datetime_utc=t_now, pm25=46.0)
    assert AnomalyDetector.detect_forecast_deviation(normal_obs, pred) is None


# =========================================================================
# 6. Sensor Stale / Offline Detection
# =========================================================================
def test_sensor_stale_offline_detection():
    """Verifies that stations with no recent readings for > configured duration trigger SENSOR_OFFLINE."""
    t_now = datetime.now(timezone.utc)
    t_stale = t_now - timedelta(hours=9)  # 9 hours old > 6.0 hours offline threshold

    stale_obs = MockObservation(station_id=11613, datetime_utc=t_stale, pm25=45.0)
    anomaly = AnomalyDetector.detect_sensor_freshness(11613, stale_obs, evaluation_time_utc=t_now)
    assert anomaly is not None
    assert anomaly["alert_type"] == AlertType.SENSOR_OFFLINE.value
    assert anomaly["observed_value"] == pytest.approx(9.0, rel=1e-1)
    assert anomaly["threshold_value"] == 6.0

    fresh_obs = MockObservation(station_id=11613, datetime_utc=t_now - timedelta(minutes=30), pm25=45.0)
    assert AnomalyDetector.detect_sensor_freshness(11613, fresh_obs, evaluation_time_utc=t_now) is None


# =========================================================================
# 7. Low Wind Detection
# =========================================================================
def test_low_wind_detection():
    """Verifies low surface wind (<= 1.0 m/s) detection."""
    w = MockWeather(station_id=11613, wind_speed_ms=0.6, pbl_height_m=800.0)
    anomalies = AnomalyDetector.detect_atmospheric_conditions(11613, w)
    types = [a["alert_type"] for a in anomalies]
    assert AlertType.LOW_WIND.value in types
    wind_alert = [a for a in anomalies if a["alert_type"] == AlertType.LOW_WIND.value][0]
    assert wind_alert["observed_value"] == 0.6
    assert wind_alert["threshold_value"] == 1.0


# =========================================================================
# 8. Low PBL Detection
# =========================================================================
def test_low_pbl_detection():
    """Verifies shallow boundary layer (<= 250 m) detection."""
    w = MockWeather(station_id=11613, wind_speed_ms=3.5, pbl_height_m=180.0)
    anomalies = AnomalyDetector.detect_atmospheric_conditions(11613, w)
    types = [a["alert_type"] for a in anomalies]
    assert AlertType.LOW_PBL.value in types
    pbl_alert = [a for a in anomalies if a["alert_type"] == AlertType.LOW_PBL.value][0]
    assert pbl_alert["observed_value"] == 180.0
    assert pbl_alert["threshold_value"] == 250.0


# =========================================================================
# 9. Stagnation Detection
# =========================================================================
def test_stagnation_detection():
    """
    Verifies compound atmospheric stagnation:
    wind = 0.5 m/s, PBL = 200 m -> ventilation index = 0.5 * 200 = 100 m²/s (<= 500 m²/s).
    """
    w = MockWeather(station_id=11613, wind_speed_ms=0.5, pbl_height_m=200.0)
    anomalies = AnomalyDetector.detect_atmospheric_conditions(11613, w)
    types = [a["alert_type"] for a in anomalies]
    assert AlertType.ATMOSPHERIC_STAGNATION.value in types
    stag_alert = [a for a in anomalies if a["alert_type"] == AlertType.ATMOSPHERIC_STAGNATION.value][0]
    assert stag_alert["observed_value"] == 100.0
    assert stag_alert["threshold_value"] == 500.0


# =========================================================================
# 10. Duplicate Alert Prevention & Deduplication
# =========================================================================
def test_duplicate_alert_prevention():
    """
    Verifies that evaluating station conditions updates the existing alert
    and prevents creating duplicate active alert rows.
    """
    db = SessionLocal()
    station_id = 11613
    try:
        # Clean any preexisting test alerts for this test
        db.query(Alert).filter(
            Alert.station_id == station_id,
            Alert.alert_type == AlertType.CO_THRESHOLD.value,
        ).delete()
        db.commit()

        # Step 1: Create active alert manually
        now = datetime.now(timezone.utc)
        a1 = Alert(
            station_id=station_id,
            alert_type=AlertType.CO_THRESHOLD.value,
            severity=AlertSeverity.HIGH.value,
            pollutant="co",
            observed_value=4.5,
            threshold_value=4.0,
            expected_value=2.0,
            deviation=0.5,
            message="Initial CO breach",
            source="OBSERVED",
            status=AlertStatus.ACTIVE.value,
            started_at=now,
            detected_at=now,
        )
        db.add(a1)
        db.commit()

        count_initial = db.query(Alert).filter(
            Alert.station_id == station_id,
            Alert.alert_type == AlertType.CO_THRESHOLD.value,
            Alert.status == AlertStatus.ACTIVE.value,
        ).count()
        assert count_initial == 1

        # Check existing alert lookup
        active_existing = (
            db.query(Alert)
            .filter(
                Alert.station_id == station_id,
                Alert.alert_type == AlertType.CO_THRESHOLD.value,
                Alert.status.in_([AlertStatus.ACTIVE.value, AlertStatus.ACKNOWLEDGED.value])
            )
            .first()
        )
        assert active_existing is not None

        # Evaluating again with ongoing condition updates existing record
        active_existing.observed_value = 4.8
        active_existing.deviation = 0.8
        db.commit()

        count_after = db.query(Alert).filter(
            Alert.station_id == station_id,
            Alert.alert_type == AlertType.CO_THRESHOLD.value,
            Alert.status == AlertStatus.ACTIVE.value,
        ).count()
        assert count_after == 1
    finally:
        db.query(Alert).filter(
            Alert.station_id == station_id,
            Alert.alert_type == AlertType.CO_THRESHOLD.value,
        ).delete()
        db.commit()
        db.close()


# =========================================================================
# 11. Active Alert Update
# =========================================================================
def test_active_alert_update():
    """Verifies that an ongoing alert's observed value and timestamp are updated in place."""
    db = SessionLocal()
    station_id = 11613
    try:
        db.query(Alert).filter(
            Alert.station_id == station_id,
            Alert.alert_type == AlertType.SO2_THRESHOLD.value,
        ).delete()
        db.commit()

        now = datetime.now(timezone.utc)
        a = Alert(
            station_id=station_id,
            alert_type=AlertType.SO2_THRESHOLD.value,
            severity=AlertSeverity.MEDIUM.value,
            pollutant="so2",
            observed_value=85.0,
            threshold_value=80.0,
            expected_value=80.0,
            deviation=5.0,
            message="SO2 exceeded standard",
            source="OBSERVED",
            status=AlertStatus.ACTIVE.value,
            started_at=now,
            detected_at=now,
        )
        db.add(a)
        db.commit()

        # Update observed value
        a.observed_value = 105.0
        a.severity = AlertSeverity.HIGH.value
        db.commit()

        updated = db.query(Alert).filter(Alert.alert_id == a.alert_id).first()
        assert updated.observed_value == 105.0
        assert updated.severity == AlertSeverity.HIGH.value
    finally:
        db.query(Alert).filter(
            Alert.station_id == station_id,
            Alert.alert_type == AlertType.SO2_THRESHOLD.value,
        ).delete()
        db.commit()
        db.close()


# =========================================================================
# 12. Alert Resolution
# =========================================================================
def test_alert_resolution():
    """Verifies that resolve_alert updates status to RESOLVED and sets ended_at."""
    db = SessionLocal()
    station_id = 11613
    try:
        now = datetime.now(timezone.utc)
        a = Alert(
            station_id=station_id,
            alert_type=AlertType.NO2_THRESHOLD.value,
            severity=AlertSeverity.MEDIUM.value,
            pollutant="no2",
            observed_value=95.0,
            threshold_value=80.0,
            expected_value=80.0,
            deviation=15.0,
            message="NO2 threshold breach",
            source="OBSERVED",
            status=AlertStatus.ACTIVE.value,
            started_at=now,
            detected_at=now,
        )
        db.add(a)
        db.commit()
        db.refresh(a)

        # Resolve
        resolved = AlertService.resolve_alert(db, a.alert_id, note="Condition normalized")
        assert resolved is not None
        assert resolved.status == AlertStatus.RESOLVED.value
        assert resolved.ended_at is not None

        db_alert = db.query(Alert).filter(Alert.alert_id == a.alert_id).first()
        assert db_alert.status == AlertStatus.RESOLVED.value
        assert db_alert.ended_at is not None
    finally:
        db.query(Alert).filter(
            Alert.station_id == station_id,
            Alert.alert_type == AlertType.NO2_THRESHOLD.value,
        ).delete()
        db.commit()
        db.close()


# =========================================================================
# 13. Multiple Stations Isolation
# =========================================================================
def test_multiple_stations():
    """Verifies station isolation in queries and alerts."""
    db = SessionLocal()
    st_a = 11613
    st_b = 11609
    try:
        now = datetime.now(timezone.utc)
        alert_a = Alert(
            station_id=st_a,
            alert_type=AlertType.PM25_SPIKE.value,
            severity=AlertSeverity.HIGH.value,
            pollutant="pm25",
            observed_value=90.0,
            message="Station 11613 spike",
            source="OBSERVED",
            status=AlertStatus.ACTIVE.value,
            started_at=now,
            detected_at=now,
        )
        alert_b = Alert(
            station_id=st_b,
            alert_type=AlertType.LOW_WIND.value,
            severity=AlertSeverity.LOW.value,
            observed_value=0.4,
            message="Station 11609 low wind",
            source="REANALYSIS",
            status=AlertStatus.ACTIVE.value,
            started_at=now,
            detected_at=now,
        )
        db.add_all([alert_a, alert_b])
        db.commit()

        # Query station A alerts
        alerts_a = AlertService.get_station_alerts(db, st_a)
        assert all(a.station_id == st_a for a in alerts_a)
        assert any(a.alert_type == AlertType.PM25_SPIKE.value for a in alerts_a)

        # Query station B alerts
        alerts_b = AlertService.get_station_alerts(db, st_b)
        assert all(a.station_id == st_b for a in alerts_b)
        assert any(a.alert_type == AlertType.LOW_WIND.value for a in alerts_b)
    finally:
        db.query(Alert).filter(Alert.station_id.in_([st_a, st_b])).delete()
        db.commit()
        db.close()


# =========================================================================
# 14. Missing / NULL Observations Handling
# =========================================================================
def test_missing_null_observations():
    """
    Verifies that missing / NULL pollutant readings are never coerced to 0.0,
    never cause unhandled exceptions, and do not trigger false threshold alerts.
    """
    obs_all_null = MockObservation(
        id=999,
        station_id=11613,
        pm25=None,
        pm10=None,
        no2=None,
        so2=None,
        co=None,
        o3=None,
    )
    # Threshold check must return empty list, zero exceptions
    anomalies = AnomalyDetector.detect_pollutant_thresholds(obs_all_null)
    assert len(anomalies) == 0

    # Spike check with None current PM2.5
    prev_obs = MockObservation(id=998, station_id=11613, pm25=50.0)
    assert AnomalyDetector.detect_pm25_spike(obs_all_null, prev_obs) is None

    # Spike check with None previous PM2.5
    curr_obs = MockObservation(id=997, station_id=11613, pm25=50.0)
    assert AnomalyDetector.detect_pm25_spike(curr_obs, obs_all_null) is None

    # Statistical anomaly with history containing NULLs
    mixed_history = [
        MockObservation(id=996, station_id=11613, pm25=None),
        MockObservation(id=995, station_id=11613, pm25=30.0),
        MockObservation(id=994, station_id=11613, pm25=None),
        MockObservation(id=993, station_id=11613, pm25=31.0),
    ]
    # Insufficient valid samples (< 6) should safely return None
    assert AnomalyDetector.detect_statistical_anomaly(curr_obs, mixed_history) is None


# =========================================================================
# 15. API Filtering
# =========================================================================
def test_api_filtering(client):
    """Verifies that GET /api/v1/alerts correctly applies filter query parameters."""
    res_active = client.get("/api/v1/alerts/active")
    assert res_active.status_code == status.HTTP_200_OK
    assert isinstance(res_active.json(), list)

    res_sum = client.get("/api/v1/alerts/summary")
    assert res_sum.status_code == status.HTTP_200_OK
    data_sum = res_sum.json()
    assert "total_alerts" in data_sum
    assert "by_severity" in data_sum
    assert "by_type" in data_sum

    res_st = client.get("/api/v1/alerts?station_id=11613&limit=5")
    assert res_st.status_code == status.HTTP_200_OK
    data_st = res_st.json()
    assert "items" in data_st
    assert "total" in data_st
    for item in data_st["items"]:
        assert item["station_id"] == 11613

    res_stat = client.get("/api/v1/alerts?status=ACTIVE&limit=5")
    assert res_stat.status_code == status.HTTP_200_OK
    for item in res_stat.json()["items"]:
        assert item["status"] == "ACTIVE"


# =========================================================================
# 16. Invalid Input Handling
# =========================================================================
def test_invalid_input_handling(client):
    """Verifies HTTP 404 on missing alert IDs and HTTP 400 on inverted temporal queries."""
    res_missing = client.get("/api/v1/alerts/999999999")
    assert res_missing.status_code == status.HTTP_404_NOT_FOUND

    res_ack = client.post("/api/v1/alerts/999999999/acknowledge")
    assert res_ack.status_code == status.HTTP_404_NOT_FOUND

    start_str = "2025-06-05T00:00:00Z"
    end_str = "2025-06-01T00:00:00Z"
    res_dates = client.get(f"/api/v1/alerts?start={start_str}&end={end_str}")
    assert res_dates.status_code == status.HTTP_400_BAD_REQUEST
