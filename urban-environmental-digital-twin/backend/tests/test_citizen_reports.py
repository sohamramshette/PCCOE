"""
Urban Environmental Digital Twin - Citizen Reports Test Suite
=============================================================
Tests report submission via JSON and Multipart form, validation rules
(category, description, coordinates, timestamps), retrieval of personal reports,
and reference code lookup.
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_submit_report_json_success(client: TestClient):
    payload = {
        "category": "SMOKE_EMISSIONS",
        "description": "Thick black smoke billowing from an open burning area near the railway line.",
        "location_name": "Shivajinagar Railway Gate, Pune",
        "latitude": 18.5312,
        "longitude": 73.8481,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "client_device_token": "test-device-uuid-12345"
    }
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "success"
    assert "report_reference" in data
    assert data["report_reference"].startswith("AIR-")
    assert data["report"]["category"] == "SMOKE_EMISSIONS"
    assert data["report"]["status"] == "SUBMITTED"
    assert data["report"]["location_name"] == "Shivajinagar Railway Gate, Pune"


def test_submit_report_invalid_category(client: TestClient):
    payload = {
        "category": "INVALID_CATEGORY_NAME",
        "description": "Visible heavy dust near construction site.",
        "location_name": "Kothrud, Pune",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "client_device_token": "test-device-uuid-12345"
    }
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 422


def test_submit_report_description_too_short(client: TestClient):
    payload = {
        "category": "OPEN_BURNING",
        "description": "Fire",  # less than 5 chars
        "location_name": "Hadapsar, Pune",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "client_device_token": "test-device-uuid-12345"
    }
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 422


def test_submit_report_coordinates_out_of_bounds(client: TestClient):
    payload = {
        "category": "CONSTRUCTION_DUST",
        "description": "Heavy dust clouds from demolition work.",
        "location_name": "Delhi",
        "latitude": 28.6139,  # Outside Pune PMR
        "longitude": 77.2090,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "client_device_token": "test-device-uuid-12345"
    }
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 422


def test_submit_report_future_observation_time(client: TestClient):
    future_time = datetime.now(timezone.utc) + timedelta(hours=2)
    payload = {
        "category": "INDUSTRIAL_EMISSIONS",
        "description": "Yellowish plume from smokestack.",
        "location_name": "Bhosari MIDC, PCMC",
        "observed_at": future_time.isoformat(),
        "client_device_token": "test-device-uuid-12345"
    }
    response = client.post("/api/v1/reports", json=payload)
    assert response.status_code == 422


def test_get_my_reports_and_reference(client: TestClient):
    device_token = "unique-device-token-abcxyz"
    payload = {
        "category": "CONSTRUCTION_DUST",
        "description": "Uncovered sand transport causing excessive road dust.",
        "location_name": "Baner High Street, Pune",
        "latitude": 18.5590,
        "longitude": 73.7868,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "client_device_token": device_token
    }
    create_resp = client.post("/api/v1/reports", json=payload)
    assert create_resp.status_code == 201
    ref = create_resp.json()["report_reference"]

    # Retrieve by client token
    my_reports_resp = client.get(f"/api/v1/reports/my-reports?client_token={device_token}")
    assert my_reports_resp.status_code == 200
    my_reports = my_reports_resp.json()
    assert len(my_reports) >= 1
    assert any(r["report_reference"] == ref for r in my_reports)

    # Retrieve single report by reference
    single_resp = client.get(f"/api/v1/reports/{ref}")
    assert single_resp.status_code == 200
    assert single_resp.json()["report_reference"] == ref


def test_get_nonexistent_report(client: TestClient):
    response = client.get("/api/v1/reports/AIR-99999999-XXXX")
    assert response.status_code == 404


def test_submit_report_with_photo_multipart(client: TestClient):
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    data = {
        "category": "OPEN_BURNING",
        "description": "Leaf and plastic burning generating thick smoke in garden area.",
        "location_name": "Aundh Chest Hospital Corner, Pune",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "latitude": "18.5720",
        "longitude": "73.8050",
        "client_device_token": "device-with-photo-12345"
    }
    files = {
        "file": ("incident_evidence.png", fake_png, "image/png")
    }
    response = client.post("/api/v1/reports/submit-form", data=data, files=files)
    assert response.status_code == 201, response.text
    res_data = response.json()
    assert res_data["status"] == "success"
    assert res_data["report"]["attachment_filename"] == "incident_evidence.png"
    assert res_data["report"]["attachment_path"].startswith("/api/v1/reports/attachments/")


def test_submit_report_invalid_photo_type(client: TestClient):
    bad_file = b"executable code or malware script"
    data = {
        "category": "OTHER",
        "description": "Chemical smell reported along the canal.",
        "location_name": "Hadapsar Canal Road, Pune",
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "client_device_token": "device-bad-file-12345"
    }
    files = {
        "file": ("script.exe", bad_file, "application/x-msdownload")
    }
    response = client.post("/api/v1/reports/submit-form", data=data, files=files)
    assert response.status_code == 400

