"""
Urban Environmental Digital Twin - AI / LLM Explanation Endpoint Tests
======================================================================
Tests LLM-synthesized narrative explanations for forecasts and What-If scenarios,
including real Gemini responses and resilient deterministic rule-based fallbacks.
"""

from fastapi import status
from backend.app.services.llm_service import LLMExplanationService


def test_forecast_explain_endpoint(client):
    """
    Verifies that GET /api/v1/stations/11613/forecast/explain returns
    a comprehensive narrative explanation with NAQI tier, atmospheric drivers,
    and public health advisories.
    """
    response = client.get("/api/v1/stations/11613/forecast/explain")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["station_id"] == 11613
    assert "Revenue Colony" in data["station_name"]
    assert "predicted_pm25" in data
    assert data["predicted_pm25"] >= 0.0
    assert "aqi_category" in data
    assert len(data["executive_summary"]) > 10
    assert isinstance(data["atmospheric_drivers"], list)
    assert len(data["atmospheric_drivers"]) >= 1
    assert len(data["health_advisory"]) > 10
    assert isinstance(data["recommended_actions"], list)
    assert len(data["recommended_actions"]) >= 1
    assert "epistemological_note" in data
    assert "generated_at" in data


def test_forecast_explain_fallback_resilience(monkeypatch, client):
    """
    Simulates external API unavailability (e.g. quota exceeded or network failure)
    and verifies that the system gracefully produces deterministic, scientifically
    grounded fallbacks without throwing 500 errors.
    """
    monkeypatch.setattr(LLMExplanationService, "_call_gemini_json", lambda prompt: None)

    response = client.get("/api/v1/stations/11613/forecast/explain")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["station_id"] == 11613
    assert len(data["executive_summary"]) > 10
    assert isinstance(data["atmospheric_drivers"], list)
    assert len(data["atmospheric_drivers"]) >= 3
    assert len(data["health_advisory"]) > 10
    assert len(data["recommended_actions"]) >= 2


def test_scenario_explain_workflow(client):
    """
    End-to-end test of scenario creation, simulation, and LLM policy explanation.
    """
    # 1. Create a test scenario
    create_payload = {
        "scenario_name": "Test LLM Traffic Curb",
        "description": "Counterfactual test for AI explanation generation",
        "station_id": 11613,
        "baseline_timestamp_utc": "2026-09-24T17:00:00Z",
        "model_id": "gradient_boosting_baseline",
        "intervention": {
            "type": "TRAFFIC_REDUCTION",
            "traffic_reduction_percent": 35.0
        }
    }
    create_resp = client.post("/api/v1/scenarios", json=create_payload)
    assert create_resp.status_code == status.HTTP_201_CREATED
    sc_data = create_resp.json()
    scenario_id = sc_data["scenario_id"]

    # 2. Run simulation
    run_resp = client.post(f"/api/v1/scenarios/{scenario_id}/run")
    assert run_resp.status_code == status.HTTP_200_OK

    # 3. Call AI explanation
    explain_resp = client.post(f"/api/v1/scenarios/{scenario_id}/explain")
    assert explain_resp.status_code == status.HTTP_200_OK
    exp_data = explain_resp.json()

    assert exp_data["scenario_id"] == scenario_id
    assert exp_data["station_id"] == 11613
    assert "baseline_pm25" in exp_data
    assert "counterfactual_pm25" in exp_data
    assert "delta_pm25" in exp_data
    assert "percent_change" in exp_data
    assert len(exp_data["executive_summary"]) > 10
    assert len(exp_data["mechanism_explanation"]) > 10
    assert exp_data["policy_effectiveness"] in ["HIGH", "MODERATE", "LOW", "CONDITIONAL"]
    assert isinstance(exp_data["municipal_recommendations"], list)
    assert len(exp_data["municipal_recommendations"]) >= 1


def test_scenario_explain_unrun_error(client):
    """
    Verifies that attempting to explain an unsimulated scenario returns 400 Bad Request.
    """
    create_payload = {
        "scenario_name": "Unrun Test Scenario",
        "station_id": 11613,
        "baseline_timestamp_utc": "2026-09-24T17:00:00Z",
        "model_id": "gradient_boosting_baseline",
        "intervention": {
            "type": "TRAFFIC_REDUCTION",
            "traffic_reduction_percent": 20.0
        }
    }
    create_resp = client.post("/api/v1/scenarios", json=create_payload)
    assert create_resp.status_code == status.HTTP_201_CREATED
    scenario_id = create_resp.json()["scenario_id"]

    # Attempt explanation without running
    explain_resp = client.post(f"/api/v1/scenarios/{scenario_id}/explain")
    assert explain_resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "has not been simulated yet" in explain_resp.json()["detail"]


def test_scenario_policy_report_workflow(client):
    """
    Validates end-to-end generation of an AI Executive Policy Decision Brief
    with health risk projections, feasibility analysis, phased action roadmap,
    and downloadable Markdown content.
    """
    # 1. Create multi-lever scenario
    create_payload = {
        "scenario_name": "Executive Clean Air Taskforce 2026",
        "description": "Multi-lever clean air trial for municipal policymaking",
        "station_id": 11613,
        "baseline_timestamp_utc": "2026-09-24T17:00:00Z",
        "model_id": "gradient_boosting_baseline",
        "intervention": {
            "type": "COMPREHENSIVE_POLICY",
            "traffic_reduction_percent": 30.0,
            "industrial_activity_reduction_percent": 25.0,
            "ev_fleet_transition_percent": 40.0,
            "green_buffer_increase_percent": 20.0,
            "construction_dust_suppression": True
        }
    }
    create_resp = client.post("/api/v1/scenarios", json=create_payload)
    assert create_resp.status_code == status.HTTP_201_CREATED
    scenario_id = create_resp.json()["scenario_id"]

    # 2. Run simulation
    run_resp = client.post(f"/api/v1/scenarios/{scenario_id}/run")
    assert run_resp.status_code == status.HTTP_200_OK

    # 3. Request executive policy report
    report_resp = client.post(f"/api/v1/scenarios/{scenario_id}/report")
    assert report_resp.status_code == status.HTTP_200_OK
    rep_data = report_resp.json()

    assert "report_title" in rep_data
    assert rep_data["verdict"] in [
        "HIGHLY_RECOMMENDED",
        "FEASIBLE_WITH_TARGETING",
        "MODERATE_IMPACT",
        "LOW_RETURN",
        "RECOMMENDED_WITH_CONDITIONS",
        "MODERATE_EFFICACY",
        "LOW_FEASIBILITY_HIGH_COST",
    ]
    assert len(rep_data["executive_summary"]) > 20
    assert len(rep_data["health_benefit_projection"]) > 20
    assert len(rep_data["economic_and_feasibility_analysis"]) > 20
    assert isinstance(rep_data["action_plan"], list)
    assert len(rep_data["action_plan"]) >= 3
    for item in rep_data["action_plan"]:
        assert "phase" in item
        assert "action" in item
        assert "responsible_agency" in item
        assert "target_metric" in item

    assert "# " in rep_data["markdown_content"]
    assert "## 1. Impact Matrix" in rep_data["markdown_content"]
    assert "## 5. Phased Municipal Action Roadmap" in rep_data["markdown_content"]


def test_scenario_policy_report_unrun_error(client):
    """
    Verifies that requesting a policy report for an unsimulated scenario returns 400.
    """
    create_payload = {
        "scenario_name": "Unrun Report Scenario",
        "station_id": 11613,
        "baseline_timestamp_utc": "2026-09-24T17:00:00Z",
        "model_id": "gradient_boosting_baseline",
        "intervention": {
            "type": "EV_FLEET_TRANSITION",
            "ev_fleet_transition_percent": 30.0
        }
    }
    create_resp = client.post("/api/v1/scenarios", json=create_payload)
    assert create_resp.status_code == status.HTTP_201_CREATED
    scenario_id = create_resp.json()["scenario_id"]

    report_resp = client.post(f"/api/v1/scenarios/{scenario_id}/report")
    assert report_resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "has not been simulated yet" in report_resp.json()["detail"]
