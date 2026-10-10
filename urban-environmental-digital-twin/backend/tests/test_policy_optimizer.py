"""
Urban Environmental Digital Twin - Policy & Budget Optimizer Tests
===================================================================
Tests validating Addition 1: Budget-Constrained Intervention Planning:
1. Dynamic programmatically calculated costs (Packages A, B, C, D).
2. Budget feasibility under ₹50L default.
3. Operational cap enforcement (Traffic <= 40%, EV <= 50%, Industrial <= 35%, Green <= 30%).
4. Binary construction misting cost (₹4.50L fixed).
5. Dynamic budget reduction recomputation (e.g. ₹50L -> ₹30L).
6. Intervention unavailability handling (e.g. legal dispute on industrial action).
7. Cost shock sensitivity (+20% shock flippable feasibility).
8. Response sensitivity adjustment (e.g. -15% behavioral rebound).
9. Intentionally infeasible package presence & explanations.
10. No feasible package detection & reporting.
11. REST API endpoint integration (/api/v1/scenarios/optimize).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.database.session import SessionLocal
from backend.app.services.policy_optimizer_service import (
    PolicyOptimizerService,
    INTERVENTION_MATRIX,
)
from backend.app.schemas.policy_optimizer import (
    PackageInterventions,
    OptimizeRequest,
)


def test_declared_cost_matrix():
    """Verify single source of truth matrix matches declared hackathon specifications."""
    matrix = PolicyOptimizerService.get_declared_cost_matrix()
    
    # 1. Peak Traffic Rationing
    assert matrix["traffic"].unit_cost_lakh == 0.80
    assert matrix["traffic"].operational_max == 40.0
    assert matrix["traffic"].classification == "variable"
    assert "ANPR" in matrix["traffic"].policy_mapping

    # 2. PMPML Fleet Electrification
    assert matrix["ev_fleet"].unit_cost_lakh == 1.20
    assert matrix["ev_fleet"].operational_max == 50.0
    assert matrix["ev_fleet"].classification == "variable"

    # 3. Industrial Emission Curbs
    assert matrix["industrial"].unit_cost_lakh == 1.50
    assert matrix["industrial"].operational_max == 35.0
    assert matrix["industrial"].classification == "variable"

    # 4. Urban Green Buffer Belts
    assert matrix["green_buffer"].unit_cost_lakh == 0.60
    assert matrix["green_buffer"].operational_max == 30.0
    assert matrix["green_buffer"].classification == "variable"

    # 5. Construction Dust Misting (Binary)
    assert matrix["dust_misting"].unit_cost_lakh == 4.50
    assert matrix["dust_misting"].operational_max == 1.0
    assert matrix["dust_misting"].classification == "binary"


def test_package_cost_calculations_zero_overhead():
    """Verify programmatically calculated package costs match exact values."""
    # Package A: Traffic 25% (20L) + Industrial 20% (30L) + EV Fleet 20% (24L) = 74.0L
    pkg_a = PackageInterventions(traffic=25.0, industrial=20.0, ev_fleet=20.0, green_buffer=0.0, dust_misting=False)
    base_a, shocked_a, _ = PolicyOptimizerService.compute_package_cost(pkg_a)
    assert base_a == 74.0
    assert shocked_a == 74.0

    # Package B: EV Fleet 40% (48L) + Traffic 15% (12L) + Misting True (4.5L) = 64.5L
    pkg_b = PackageInterventions(traffic=15.0, industrial=0.0, ev_fleet=40.0, green_buffer=0.0, dust_misting=True)
    base_b, shocked_b, _ = PolicyOptimizerService.compute_package_cost(pkg_b)
    assert base_b == 64.5
    assert shocked_b == 64.5

    # Package C: Green Buffer 30% (18L) + Industrial 15% (22.5L) + Misting True (4.5L) = 45.0L
    pkg_c = PackageInterventions(traffic=0.0, industrial=15.0, ev_fleet=0.0, green_buffer=30.0, dust_misting=True)
    base_c, shocked_c, _ = PolicyOptimizerService.compute_package_cost(pkg_c)
    assert base_c == 45.0
    assert shocked_c == 45.0

    # Package D: Traffic 40% (32L) + Industrial 35% (52.5L) + EV 50% (60L) + Green 30% (18L) = 162.5L
    pkg_d = PackageInterventions(traffic=40.0, industrial=35.0, ev_fleet=50.0, green_buffer=30.0, dust_misting=False)
    base_d, shocked_d, _ = PolicyOptimizerService.compute_package_cost(pkg_d)
    assert base_d == 162.5
    assert shocked_d == 162.5


def test_budget_feasibility_default_fifty_lakh():
    """Under ₹50L budget, Package C is feasible; Packages A, B, and D are infeasible."""
    db: Session = SessionLocal()
    try:
        req = OptimizeRequest(budget_lakh=50.0)
        res = PolicyOptimizerService.optimize_and_evaluate(db=db, req=req)
        
        pkg_map = {p.package_id: p for p in res.packages}
        
        # Package C must be feasible
        assert pkg_map["pkg_c"].is_feasible is True
        assert pkg_map["pkg_c"].feasibility_status == "FEASIBLE"
        assert pkg_map["pkg_c"].cost_after_shock_lakh == 45.0
        assert pkg_map["pkg_c"].remaining_budget_lakh == 5.0
        assert pkg_map["pkg_c"].budget_utilization_pct == 90.0

        # Package A must be infeasible (over budget by 24L)
        assert pkg_map["pkg_a"].is_feasible is False
        assert pkg_map["pkg_a"].feasibility_status == "INFEASIBLE"
        assert "Over budget: ₹24.0L" in pkg_map["pkg_a"].infeasibility_reason

        # Package B must be infeasible (over budget by 14.5L)
        assert pkg_map["pkg_b"].is_feasible is False
        assert "Over budget: ₹14.5L" in pkg_map["pkg_b"].infeasibility_reason

        # Package D must be infeasible (over budget by 112.5L)
        assert pkg_map["pkg_d"].is_feasible is False
        assert "Over budget: ₹112.5L" in pkg_map["pkg_d"].infeasibility_reason

        # Recommendation must select feasible Package C
        assert res.recommendation.status == "FEASIBLE_OPTIMAL"
        assert res.recommendation.recommended_package_id == "pkg_c"
        assert pkg_map["pkg_c"].is_recommended is True
    finally:
        db.close()


def test_operational_cap_validation():
    """Operational maximum limits must be strictly enforced."""
    # Traffic cap: 40%
    ok, errs = PolicyOptimizerService.validate_operational_constraints(PackageInterventions(traffic=41.0))
    assert ok is False
    assert any("Traffic Rationing operational limit exceeded by 1.0" in e for e in errs)

    # EV fleet cap: 50%
    ok, errs = PolicyOptimizerService.validate_operational_constraints(PackageInterventions(ev_fleet=52.0))
    assert ok is False
    assert any("EV" in e for e in errs)

    # Industrial cap: 35%
    ok, errs = PolicyOptimizerService.validate_operational_constraints(PackageInterventions(industrial=36.0))
    assert ok is False
    assert any("Industrial" in e for e in errs)

    # Green buffer cap: 30%
    ok, errs = PolicyOptimizerService.validate_operational_constraints(PackageInterventions(green_buffer=31.0))
    assert ok is False
    assert any("Green Buffer" in e for e in errs)

    # Within caps
    ok, errs = PolicyOptimizerService.validate_operational_constraints(
        PackageInterventions(traffic=40.0, ev_fleet=50.0, industrial=35.0, green_buffer=30.0)
    )
    assert ok is True
    assert len(errs) == 0


def test_budget_reduction_recomputation():
    """Reducing budget from ₹50L to ₹30L dynamically marks Package C as infeasible."""
    db: Session = SessionLocal()
    try:
        req = OptimizeRequest(budget_lakh=30.0)
        res = PolicyOptimizerService.optimize_and_evaluate(db=db, req=req)

        pkg_map = {p.package_id: p for p in res.packages}
        
        # Package C (45L) is now over budget by 15L
        assert pkg_map["pkg_c"].is_feasible is False
        assert "Over budget: ₹15.0L" in pkg_map["pkg_c"].infeasibility_reason

        # All demonstration packages are over budget
        assert res.recommendation.status == "NO_FEASIBLE_PACKAGE"
        assert res.recommendation.recommended_package_id is None
        assert "exceed spending limits" in res.recommendation.reason
    finally:
        db.close()


def test_intervention_unavailability_industrial():
    """When industrial emission curbs are blocked, packages containing industrial curbs become infeasible."""
    db: Session = SessionLocal()
    try:
        req = OptimizeRequest(budget_lakh=100.0, unavailable_interventions=["industrial"])
        res = PolicyOptimizerService.optimize_and_evaluate(db=db, req=req)

        pkg_map = {p.package_id: p for p in res.packages}

        # Package C contains industrial 15% -> must be unavailable & infeasible
        assert pkg_map["pkg_c"].is_available is False
        assert pkg_map["pkg_c"].is_feasible is False
        assert "Industrial reduction target unreachable because this intervention is currently unavailable" in pkg_map["pkg_c"].infeasibility_reason

        # Package A contains industrial 20% -> unavailable
        assert pkg_map["pkg_a"].is_available is False
        assert pkg_map["pkg_a"].is_feasible is False

        # Package B contains NO industrial -> remains available and feasible under 100L
        assert pkg_map["pkg_b"].is_available is True
        assert pkg_map["pkg_b"].is_feasible is True

        # Package B should now be the recommended feasible package
        assert res.recommendation.recommended_package_id == "pkg_b"
    finally:
        db.close()


def test_cost_shock_sensitivity():
    """A +20% cost shock increases Package C cost from ₹45.0L to ₹54.0L, rendering it infeasible under ₹50L."""
    db: Session = SessionLocal()
    try:
        req = OptimizeRequest(budget_lakh=50.0, cost_shock_pct=20.0)
        res = PolicyOptimizerService.optimize_and_evaluate(db=db, req=req)

        pkg_map = {p.package_id: p for p in res.packages}

        # Package C base cost was 45.0L, after +20% shock is 54.0L
        assert pkg_map["pkg_c"].base_cost_lakh == 45.0
        assert pkg_map["pkg_c"].cost_after_shock_lakh == 54.0
        assert pkg_map["pkg_c"].is_feasible is False
        assert "Over budget: ₹4.0L" in pkg_map["pkg_c"].infeasibility_reason

        # Under 50L with +20% shock, all packages fail
        assert res.recommendation.status == "NO_FEASIBLE_PACKAGE"
    finally:
        db.close()


def test_response_sensitivity_adjustment():
    """Modeled response adjustment scales modeled PM2.5 delta as a declared sensitivity parameter."""
    db: Session = SessionLocal()
    try:
        # 1. Base response (0%)
        req_base = OptimizeRequest(budget_lakh=50.0, response_sensitivity_pct=0.0)
        res_base = PolicyOptimizerService.optimize_and_evaluate(db=db, req=req_base)
        pkg_c_base = next(p for p in res_base.packages if p.package_id == "pkg_c")
        base_reduction = abs(pkg_c_base.modeled_delta_pm25)

        # 2. Response with -15% behavioral rebound
        req_rebound = OptimizeRequest(budget_lakh=50.0, response_sensitivity_pct=-15.0)
        res_rebound = PolicyOptimizerService.optimize_and_evaluate(db=db, req=req_rebound)
        pkg_c_rebound = next(p for p in res_rebound.packages if p.package_id == "pkg_c")
        rebound_reduction = abs(pkg_c_rebound.modeled_delta_pm25)

        # Rebound reduction should be approx 85% of base reduction
        assert rebound_reduction < base_reduction
        assert abs(rebound_reduction - round(base_reduction * 0.85, 2)) <= 0.05
    finally:
        db.close()


def test_optimizer_api_endpoints(client: TestClient):
    """Test REST API endpoints for declared matrix and optimization evaluation."""
    # 1. GET /api/v1/scenarios/optimizer/matrix
    res_mat = client.get("/api/v1/scenarios/optimizer/matrix")
    assert res_mat.status_code == 200
    mat = res_mat.json()
    assert "traffic" in mat
    assert "industrial" in mat
    assert mat["traffic"]["unit_cost_lakh"] == 0.80

    # 2. POST /api/v1/scenarios/optimize
    payload = {
        "budget_lakh": 50.0,
        "custom_interventions": {
            "traffic": 10.0,
            "ev_fleet": 10.0,
            "industrial": 0.0,
            "green_buffer": 10.0,
            "dust_misting": False,
        },
        "unavailable_interventions": [],
        "cost_shock_pct": 0.0,
        "response_sensitivity_pct": 0.0,
    }
    res_opt = client.post("/api/v1/scenarios/optimize", json=payload)
    assert res_opt.status_code == 200
    data = res_opt.json()
    assert data["budget_lakh"] == 50.0
    assert len(data["packages"]) == 5  # 4 demo packages + 1 custom package
    assert data["recommendation"]["status"] in ["FEASIBLE_OPTIMAL", "NO_FEASIBLE_PACKAGE"]
    assert "primary_objective" in data
    assert "methodology_note" in data


def test_combinatorial_alternative_search():
    """Verify optimizer evaluates alternative feasible combinations (3+ sectors) within budget."""
    db: Session = SessionLocal()
    try:
        # Under ₹30L budget where demo packages A, B, C, D are all infeasible:
        req = OptimizeRequest(budget_lakh=30.0, include_alternative_combinations=True)
        res = PolicyOptimizerService.optimize_and_evaluate(db=db, req=req)

        # Confirm alternative packages were evaluated
        alt_pkgs = [p for p in res.packages if "pkg_alt" in p.package_id]
        assert len(alt_pkgs) > 0, "Optimizer should discover alternative combinations"

        # Each alternative package must select from at least 3 active intervention types
        for alt in alt_pkgs:
            active_count = sum([
                alt.interventions.traffic > 0,
                alt.interventions.ev_fleet > 0,
                alt.interventions.industrial > 0,
                alt.interventions.green_buffer > 0,
                bool(alt.interventions.dust_misting),
            ])
            assert active_count >= 3, f"Must have >= 3 active levers, found {active_count}"
            assert alt.cost_after_shock_lakh <= 30.0, f"Must fit in ₹30L budget, got {alt.cost_after_shock_lakh}"
            assert alt.is_feasible is True

        # Recommendation must successfully pick the best evaluated package
        assert res.recommendation.status == "FEASIBLE_OPTIMAL"
        assert res.recommendation.label == "Best evaluated package"
        # Must not claim global optimality
        assert "does not claim unconstrained global mathematical optimality" in res.recommendation.reason
    finally:
        db.close()


def test_package_c_response_disclosure():
    """Verify Package C produces non-zero PM2.5 reduction and is labeled as modeled estimate."""
    db: Session = SessionLocal()
    try:
        req = OptimizeRequest(budget_lakh=50.0)
        res = PolicyOptimizerService.optimize_and_evaluate(db=db, req=req)

        pkg_c = next(p for p in res.packages if p.package_id == "pkg_c")
        # Must NOT return zero PM2.5 reduction
        assert pkg_c.modeled_delta_pm25 < 0.0, f"Package C PM2.5 delta should be negative, got {pkg_c.modeled_delta_pm25}"
        assert pkg_c.modeled_pct_change < 0.0
        assert pkg_c.data_classification == "MODEL_COUNTERFACTUAL_ESTIMATE"

        # Methodology explicitly discloses modeled scenario nature
        assert "MODELED counterfactual estimates" in res.methodology_note
    finally:
        db.close()

