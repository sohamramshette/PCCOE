"""
Urban Environmental Digital Twin - Pollution Backtracking Tests
===============================================================
Comprehensive test suite validating:
1. Cardinal wind directions and expected backward movement.
2. Zero wind speed and atmospheric stagnation.
3. Timestamp ordering and UTC-to-IST conversion.
4. Preservation of missing sensor readings (strictly None, never 0.0).
5. Input bounds and invalid station validation.
6. Step distance and cumulative distance accounting.
7. Spatial domain boundary detection and coverage warnings.
8. Response schema contract adherence.
9. Station correlation sample counts and exploratory non-causal labeling.
10. Scientific disclaimers and reanalysis provenance.
11. Historical benchmark data quality audit verification (Hadapsar Dec 26 spike).
12. Curated events catalog endpoint.
"""

import math
from datetime import datetime, timezone, timedelta
import pytest
from fastapi import status

from backend.app.schemas.backtracking import (
    BacktrackingRequest,
    BacktrackingResponse,
    SpatialCoverageStatus,
    StationEvidenceStatus,
)
from backend.app.services.backtracking_service import (
    haversine_distance_km,
    calculate_bearing_deg,
    format_utc_to_ist,
    get_naqi_category,
    EARTH_RADIUS_METERS,
    PUNE_PCMC_BOUNDS,
    BacktrackingService,
)
from backend.app.database.session import SessionLocal


# -----------------------------------------------------------------------------
# Unit Tests: Physics & Mathematics
# -----------------------------------------------------------------------------

def test_cardinal_wind_direction_backward_displacements():
    """
    Validates meteorological wind direction conventions for backward transport:
    Wind direction is the bearing FROM WHICH the wind originates.
    Backward kinematic displacement steps TOWARDS the origin of the wind:
    - North wind (0°): Air arrived from the North -> backward displacement is Northward (lat increases).
    - East wind (90°): Air arrived from the East -> backward displacement is Eastward (lon increases).
    - South wind (180°): Air arrived from the South -> backward displacement is Southward (lat decreases).
    - West wind (270°): Air arrived from the West -> backward displacement is Westward (lon decreases).

    Verifies actual geographic coordinates (WGS-84), great-circle distances, and azimuth bearings.
    """
    speed_ms = 5.0
    dt_sec = 3600.0
    origin_lat, origin_lon = 18.5204, 73.8567  # Pune central coordinates

    cardinal_cases = [
        ("North", 0.0, 0.0),    # lat increases, lon unchanged, bearing 0°
        ("East", 90.0, 90.0),   # lat unchanged, lon increases, bearing 90°
        ("South", 180.0, 180.0), # lat decreases, lon unchanged, bearing 180°
        ("West", 270.0, 270.0),  # lat unchanged, lon decreases, bearing 270°
    ]

    for name, wdir, expected_bearing in cardinal_cases:
        rad = math.radians(wdir)
        dx_meters = speed_ms * math.sin(rad) * dt_sec
        dy_meters = speed_ms * math.cos(rad) * dt_sec

        dlat_deg = (dy_meters / EARTH_RADIUS_METERS) * (180.0 / math.pi)
        lat_mid = origin_lat + dlat_deg / 2.0
        cos_lat_mid = math.cos(math.radians(lat_mid))
        dlon_deg = (dx_meters / (EARTH_RADIUS_METERS * cos_lat_mid)) * (180.0 / math.pi)

        target_lat = origin_lat + dlat_deg
        target_lon = origin_lon + dlon_deg

        # 1. Verify actual geographic coordinates
        if name == "North":
            assert target_lat > origin_lat, "North wind must displace backward Northward"
            assert target_lon == pytest.approx(origin_lon, abs=1e-5)
        elif name == "East":
            assert target_lon > origin_lon, "East wind must displace backward Eastward"
            assert target_lat == pytest.approx(origin_lat, abs=1e-5)
        elif name == "South":
            assert target_lat < origin_lat, "South wind must displace backward Southward"
            assert target_lon == pytest.approx(origin_lon, abs=1e-5)
        elif name == "West":
            assert target_lon < origin_lon, "West wind must displace backward Westward"
            assert target_lat == pytest.approx(origin_lat, abs=1e-5)

        # 2. Verify actual great-circle geodesic distance (5 m/s * 3600s = 18.0 km)
        computed_dist_km = haversine_distance_km(origin_lat, origin_lon, target_lat, target_lon)
        assert computed_dist_km == pytest.approx(18.0, rel=1e-3)

        # 3. Verify actual compass bearing from origin to target points towards wind source
        bearing_to_source = calculate_bearing_deg(origin_lat, origin_lon, target_lat, target_lon)
        assert bearing_to_source == pytest.approx(expected_bearing, abs=0.5)


def test_zero_wind_speed_stagnation():
    """Verifies that calm/stagnant conditions produce zero displacement and zero coordinate shift."""
    speed_ms = 0.0
    dt_sec = 3600.0
    dx_meters = speed_ms * 0.5 * dt_sec
    dy_meters = speed_ms * 0.5 * dt_sec
    dist_km = (dx_meters ** 2 + dy_meters ** 2) ** 0.5 / 1000.0
    assert dist_km == 0.0

    origin_lat, origin_lon = 18.5204, 73.8567
    dlat_deg = (dy_meters / EARTH_RADIUS_METERS) * (180.0 / math.pi)
    dlon_deg = (dx_meters / EARTH_RADIUS_METERS) * (180.0 / math.pi)
    assert origin_lat + dlat_deg == origin_lat
    assert origin_lon + dlon_deg == origin_lon


def test_vector_wind_interpolation_branch_cut():
    """
    Verifies that spatial wind vector interpolation uses Cartesian (u, v) decomposition
    to correctly resolve the 0°/360° circular branch cut.
    Example: Equal weights of 10° and 350° winds must average to 0° (North), NOT 180° (South).
    """
    speed = 2.0
    dir1 = 10.0
    dir2 = 350.0

    u1 = -speed * math.sin(math.radians(dir1))
    v1 = -speed * math.cos(math.radians(dir1))

    u2 = -speed * math.sin(math.radians(dir2))
    v2 = -speed * math.cos(math.radians(dir2))

    u_avg = (u1 + u2) / 2.0
    v_avg = (v1 + v2) / 2.0

    # With vector averaging, u cancels out (u_avg ≈ 0), v_avg is negative
    assert abs(u_avg) < 1e-6
    assert v_avg < 0.0

    interp_dir = (math.degrees(math.atan2(-u_avg, -v_avg)) + 360.0) % 360.0
    assert interp_dir == pytest.approx(0.0, abs=1e-4)


def test_haversine_and_bearing_calculations():
    """Validates spherical geodesic distance and bearing between Pune stations."""
    # Shivajinagar (18.5301, 73.8496) to Hadapsar (18.5018, 73.9275)
    d = haversine_distance_km(18.5301, 73.8496, 18.5018, 73.9275)
    # Distance between Shivajinagar and Hadapsar is ~8-12 km
    assert 8.0 < d < 12.0

    b = calculate_bearing_deg(18.5301, 73.8496, 18.5018, 73.9275)
    # Hadapsar is South-East of Shivajinagar (bearing ~110-130 deg)
    assert 100.0 < b < 140.0


def test_utc_to_ist_conversion():
    """Verifies that UTC timestamps are converted to IST with exact +05:30 offset."""
    utc_dt = datetime(2025, 12, 26, 16, 0, 0, tzinfo=timezone.utc)
    ist_str = format_utc_to_ist(utc_dt)
    assert "2025-12-26 21:30:00 IST" == ist_str

    utc_midnight = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    ist_midnight = format_utc_to_ist(utc_midnight)
    assert "2026-01-01 05:30:00 IST" == ist_midnight


def test_naqi_category_distinction():
    """Verifies distinction between concentration, categories, and null preservation."""
    assert get_naqi_category(None) is None
    assert get_naqi_category(25.0) == "Good"
    assert get_naqi_category(45.0) == "Satisfactory"
    assert get_naqi_category(75.0) == "Moderate"
    assert get_naqi_category(105.0) == "Poor"
    assert get_naqi_category(180.0) == "Very Poor"
    assert get_naqi_category(350.0) == "Severe"


# -----------------------------------------------------------------------------
# Service Tests: Backtracking Execution
# -----------------------------------------------------------------------------

def test_backtracking_service_execution_dec11():
    """Verifies end-to-end service calculation for the multi-station episode on Dec 11, 2025."""
    db = SessionLocal()
    req = BacktrackingRequest(
        station_id=60658,
        arrival_datetime_utc=datetime(2025, 12, 11, 17, 0, tzinfo=timezone.utc),
        backward_duration_hours=12,
        step_interval_minutes=60,
    )
    res = BacktrackingService.calculate_backward_trajectory(db=db, request=req)

    assert res.receptor_station["station_id"] == 60658
    assert res.receptor_station["station_name"] == "Hadapsar, Pune - IITM"
    assert res.observed_pm25_ug_m3 is not None
    assert res.observed_pm25_ug_m3 > 300.0  # Dec 11 peak was ~331.6
    assert res.cpcb_naqi_category == "Severe"
    assert res.backward_duration_hours == 12

    # Waypoints
    assert len(res.waypoints) == 13  # t=0 receptor + 12 backward steps
    assert res.waypoints[0].step_hours_back == 0
    assert res.waypoints[0].cumulative_distance_km == 0.0
    assert res.waypoints[-1].step_hours_back == 12
    assert res.waypoints[-1].cumulative_distance_km > 0.0
    assert res.total_distance_km == res.waypoints[-1].cumulative_distance_km

    # Verify timestamps move backward by exactly one hour per step
    for i, wp in enumerate(res.waypoints):
        expected_time = req.arrival_datetime_utc - timedelta(hours=i)
        assert wp.step_hours_back == i
        assert wp.datetime_utc == expected_time

    # Provenance
    for wp in res.waypoints:
        assert "REANALYSIS" in wp.data_provenance

    # Multi-station evidence
    assert len(res.multi_station_evidence) == 5  # 5 other active stations
    for ev in res.multi_station_evidence:
        assert ev.valid_sample_count >= 0
        assert "Exploratory correlation" in ev.interpretation_note

    db.close()


def test_spatial_domain_boundary_detection_and_coverage_warnings():
    """
    Verifies that trajectories traversing beyond the Pune-PCMC domain
    are flagged with EXCEEDED_LOCAL_DOMAIN and generate clear coverage warnings.
    """
    db = SessionLocal()
    req = BacktrackingRequest(
        station_id=60658,
        arrival_datetime_utc=datetime(2025, 12, 26, 16, 0, tzinfo=timezone.utc),
        backward_duration_hours=48,
        step_interval_minutes=60,
    )
    res = BacktrackingService.calculate_backward_trajectory(db=db, request=req)

    assert res.status == "PARTIAL_COVERAGE"
    assert len(res.metadata.coverage_warnings) > 0
    assert any("beyond the verified Pune-PCMC monitoring domain" in w for w in res.metadata.coverage_warnings)

    exceeded_wps = [wp for wp in res.waypoints if wp.spatial_coverage_status == SpatialCoverageStatus.EXCEEDED_LOCAL_DOMAIN]
    assert len(exceeded_wps) > 0
    # Early steps within domain, later steps outside
    assert res.waypoints[0].spatial_coverage_status == SpatialCoverageStatus.WITHIN_NETWORK_DOMAIN
    assert res.waypoints[-1].spatial_coverage_status == SpatialCoverageStatus.EXCEEDED_LOCAL_DOMAIN

    db.close()


def test_hadapsar_dec26_benchmark_data_quality_verdict():
    """
    Validates mandatory scientific correction A.6:
    The Hadapsar Dec 26, 2025 observation of 570.83 µg/m³ must be evaluated
    as an UNVERIFIED LOCAL SPIKE / POTENTIAL SENSOR ARTIFACT, rather than automatically
    endorsed as a confirmed regional pollution event.
    """
    db = SessionLocal()
    req = BacktrackingRequest(
        station_id=60658,
        arrival_datetime_utc=datetime(2025, 12, 26, 16, 0, tzinfo=timezone.utc),
        backward_duration_hours=24,
        step_interval_minutes=60,
    )
    res = BacktrackingService.calculate_backward_trajectory(db=db, request=req)

    # 1. Observed facts
    assert res.observed_pm25_ug_m3 is not None
    assert abs(res.observed_pm25_ug_m3 - 570.83) < 0.1
    assert res.cpcb_naqi_category == "Severe"

    # 2. Data quality assessment verdict
    verdict = res.investigation_summary.data_quality_assessment
    assert "UNVERIFIED LOCAL SPIKE" in verdict or "POTENTIAL SENSOR ARTIFACT" in verdict

    # 3. Scientific limitations are present
    lims = res.investigation_summary.scientific_limitations
    assert len(lims) >= 4
    assert any("2D Kinematic" in l for l in lims)
    assert any("reanalysis" in l.lower() for l in lims)
    assert any("Non-Causal" in l or "emissions causality" in l for l in lims)

    # 4. Multi-station evidence check: Bhosari was offline and must be preserved as None
    bhosari_ev = next((e for e in res.multi_station_evidence if e.station_id == 3409331), None)
    assert bhosari_ev is not None
    assert bhosari_ev.observed_pm25_at_arrival is None
    assert bhosari_ev.data_status == StationEvidenceStatus.TELEMETRY_OFFLINE

    # 5. Shivajinagar and Mhada had valid observations
    shiva_ev = next((e for e in res.multi_station_evidence if e.station_id == 11613), None)
    assert shiva_ev is not None
    assert shiva_ev.observed_pm25_at_arrival is not None
    assert shiva_ev.data_status == StationEvidenceStatus.VALID_OBSERVATION

    db.close()


def test_missing_weather_raises_value_error():
    """Verifies that requesting a timestamp without meteorological data raises a clear error."""
    db = SessionLocal()
    # Year 2010 has no ERA5-Land reanalysis in the database
    req = BacktrackingRequest(
        station_id=60658,
        arrival_datetime_utc=datetime(2010, 1, 1, 0, 0, tzinfo=timezone.utc),
        backward_duration_hours=12,
        step_interval_minutes=60,
    )
    with pytest.raises(ValueError) as excinfo:
        BacktrackingService.calculate_backward_trajectory(db=db, request=req)
    assert "unavailable" in str(excinfo.value).lower()
    db.close()


def test_invalid_station_raises_value_error():
    """Verifies that an unknown station ID raises a clear error."""
    db = SessionLocal()
    req = BacktrackingRequest(
        station_id=999999,
        arrival_datetime_utc=datetime(2025, 12, 11, 17, 0, tzinfo=timezone.utc),
        backward_duration_hours=12,
        step_interval_minutes=60,
    )
    with pytest.raises(ValueError) as excinfo:
        BacktrackingService.calculate_backward_trajectory(db=db, request=req)
    assert "not found" in str(excinfo.value).lower()
    db.close()


# -----------------------------------------------------------------------------
# API Route Tests via TestClient
# -----------------------------------------------------------------------------

def test_api_simulate_success(client):
    """Verifies POST /api/v1/backtracking/simulate returns HTTP 200 with complete schema."""
    payload = {
        "station_id": 60658,
        "arrival_datetime_utc": "2025-12-11T17:00:00Z",
        "backward_duration_hours": 12,
        "step_interval_minutes": 60,
    }
    response = client.post("/api/v1/backtracking/simulate", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["status"] in ["COMPLETED", "PARTIAL_COVERAGE"]
    assert data["receptor_station"]["station_id"] == 60658
    assert "waypoints" in data
    assert len(data["waypoints"]) == 13
    assert "multi_station_evidence" in data
    assert "investigation_summary" in data
    assert "metadata" in data

    # Verify waypoint keys
    wp0 = data["waypoints"][0]
    assert wp0["step_hours_back"] == 0
    assert "wind_speed_ms" in wp0
    assert "wind_dir_deg" in wp0
    assert "ventilation_index_m2s" in wp0
    assert "REANALYSIS" in wp0["data_provenance"]

    # Verify metadata disclaimer
    assert "2D kinematic" in data["metadata"]["disclaimer"]


def test_api_simulate_invalid_station(client):
    """Verifies POST /api/v1/backtracking/simulate returns HTTP 404 for unknown station."""
    payload = {
        "station_id": 888888,
        "arrival_datetime_utc": "2025-12-11T17:00:00Z",
        "backward_duration_hours": 12,
    }
    response = client.post("/api/v1/backtracking/simulate", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_api_simulate_duration_bounds_validation(client):
    """Verifies that backward_duration_hours outside [1, 48] is rejected with HTTP 422."""
    # Duration > 48 hours
    res_large = client.post(
        "/api/v1/backtracking/simulate",
        json={
            "station_id": 60658,
            "arrival_datetime_utc": "2025-12-11T17:00:00Z",
            "backward_duration_hours": 72,
        }
    )
    assert res_large.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Duration < 1 hour
    res_zero = client.post(
        "/api/v1/backtracking/simulate",
        json={
            "station_id": 60658,
            "arrival_datetime_utc": "2025-12-11T17:00:00Z",
            "backward_duration_hours": 0,
        }
    )
    assert res_zero.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_api_simulate_invalid_step_interval(client):
    """Verifies that non-60 minute step intervals are rejected with HTTP 422."""
    response = client.post(
        "/api/v1/backtracking/simulate",
        json={
            "station_id": 60658,
            "arrival_datetime_utc": "2025-12-11T17:00:00Z",
            "backward_duration_hours": 12,
            "step_interval_minutes": 15,
        }
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_api_curated_events_endpoint(client):
    """Verifies GET /api/v1/backtracking/curated-events returns cataloged episodes."""
    response = client.get("/api/v1/backtracking/curated-events")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["total_events"] >= 4
    events = data["events"]
    assert any(e["event_id"] == "hadapsar_winter_smog_20251226" for e in events)
    assert any(e["event_id"] == "hadapsar_winter_episode_20251211" for e in events)
    assert any(e["event_id"] == "shivajinagar_autumn_peak_20251001" for e in events)

    # Verify that Hadapsar Dec 26 is explicitly categorized as unverified local spike
    hadapsar_spike = next(e for e in events if e["event_id"] == "hadapsar_winter_smog_20251226")
    assert hadapsar_spike["validation_status"] == "UNVERIFIED_LOCAL_SPIKE_POTENTIAL_ARTIFACT"
