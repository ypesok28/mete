"""Gate-1 review regression tests — the EXACT scenarios from the team-lead fix brief.

Covers Bug 1 (tiebreak by id not request position), Bug 2 (_blocking_gate restricted to
capability-capable tiers), Bug 3 (REPAIR infeasible never MISSION_COVERED), and the two
edge-hardening cases (rate<=0 graceful; negative costs rejected). These mirror the brief's
prescribed inputs verbatim so the fix is checked against the reviewer's intent, not just my
own restatement of it.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from solver import solve

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"


def _swarm() -> dict:
    return json.loads((FIXTURE_DIR / "swarm.json").read_text())["request"]


def _repair() -> dict:
    return json.loads((FIXTURE_DIR / "repair.json").read_text())["request"]


# ── BUG 1: tiebreak ranks by ascending tier_id / target_id, not request position ──
def test_b1a_reversed_order_swarm_covers_lowest_id_five() -> None:
    """SWARM with targets listed T8..T1 still covers the lowest-id five {T1..T5} on SCOUT_S
    (was the R10 kill-shot: position-ranked tiebreak covered T4..T8)."""
    req = _swarm()
    req["targets"] = list(reversed(req["targets"]))  # T8, T7, ..., T1
    result = solve(req).model_dump()
    covered = {t["target_id"] for t in result["target_status"] if t["covered"]}
    assert covered == {"T1", "T2", "T3", "T4", "T5"}, covered
    assert result["builds"] == {"SCOUT_S": 5}


def test_b1b_two_identical_targets_lowest_id_wins_both_orderings() -> None:
    """Budget fits exactly one SCOUT (feedstock 380). Two identical soft targets; T1 must
    be the covered one whether the request lists [T1,T2] or [T2,T1]."""
    soft = {"standoff_km": 3, "payload_g": 90, "weather_kt": 10, "value": 1}
    for order in (["T1", "T2"], ["T2", "T1"]):
        req = _swarm()
        req["budget"]["feedstock_g"]["CF_NYLON"] = 380
        req["targets"] = [{"id": tid, **soft} for tid in order]
        result = solve(req).model_dump()
        covered = {t["target_id"] for t in result["target_status"] if t["covered"]}
        assert covered == {"T1"}, (order, covered)


def test_b1c_equal_cost_tiers_lower_tier_id_wins_in_every_request_order() -> None:
    """ISR_M edited to cost-tie SCOUT (feedstock 380, energy 40); both eligible for 8 soft
    contacts. ISR_M must win the build by ascending tier_id ("ISR_M" < "SCOUT_S") in EVERY
    tier request order, including canonical [SCOUT_S, ISR_M, STRIKE_L]."""
    import itertools

    base = _swarm()
    # Make ISR_M cost-identical to SCOUT_S (still all-eligible for the soft contacts).
    for t in base["tiers"]:
        if t["id"] == "ISR_M":
            t["feedstock_g"] = 380
            t["energy_wh"] = 40

    tiers_by_id = {t["id"]: t for t in base["tiers"]}
    for perm in itertools.permutations(["SCOUT_S", "ISR_M", "STRIKE_L"]):
        req = _swarm()
        for t in req["tiers"]:
            if t["id"] == "ISR_M":
                t["feedstock_g"] = 380
                t["energy_wh"] = 40
        req["tiers"] = [next(t for t in req["tiers"] if t["id"] == tid) for tid in perm]
        result = solve(req).model_dump()
        assert result["builds"] == {"ISR_M": 5}, (perm, result["builds"])


# ── BUG 2 (ADV-D): _blocking_gate names a gate on a capability-capable tier ──
def test_b2_adv_d_blocking_gate_is_components_not_material() -> None:
    """1 target {standoff 3, payload 1200, weather 10, value 10}. SCOUT_S needs PLA (not in
    budget) -> MATERIAL. STRIKE_L components_on_hand=false. Only STRIKE is payload-capable
    (1300>=1200; SCOUT 150 / ISR 400 fail payload) -> the true blocker is COMPONENTS, not
    the MATERIAL gate of a tier that could never lift the payload anyway."""
    req = _swarm()
    req["targets"] = [
        {"id": "T1", "standoff_km": 3, "payload_g": 1200, "weather_kt": 10, "value": 10}
    ]
    for t in req["tiers"]:
        if t["id"] == "SCOUT_S":
            t["material_class"] = "PLA"  # PLA not a key of budget.feedstock_g
    req["node"]["components_on_hand"] = {"SCOUT_S": True, "ISR_M": True, "STRIKE_L": False}
    result = solve(req).model_dump()
    assert result["feasible"] is False
    assert result["binding_reason"] == "COMPONENTS", result["binding_reason"]


# ── BUG 3: REPAIR infeasible reports the blocking hard gate, never MISSION_COVERED ──
def test_b3_repair_infeasible_no_feedstock_reports_material() -> None:
    req = _repair()
    req["budget"]["feedstock_g"] = {"CF_NYLON": 0}
    result = solve(req).model_dump()
    assert result["feasible"] is False
    assert result["binding_reason"] == "MATERIAL", result["binding_reason"]
    assert result["binding_reason"] != "MISSION_COVERED"


def test_b3_repair_infeasible_tiny_envelope_reports_envelope() -> None:
    req = _repair()
    req["node"]["printer_envelope_mm"] = {"x": 50, "y": 50, "z": 50}
    result = solve(req).model_dump()
    assert result["feasible"] is False
    assert result["binding_reason"] == "ENVELOPE", result["binding_reason"]
    assert result["binding_reason"] != "MISSION_COVERED"


# ── EDGE HARDENING: rate<=0 graceful infeasible; negative costs rejected ──
def test_edge_zero_rate_build_is_clean_infeasible_no_exception() -> None:
    req = _swarm()
    req["deposition_rate_g_per_hr"] = 0
    result = solve(req).model_dump()  # must not raise
    assert result["feasible"] is False
    assert result["binding_reason"] == "HOURS"
    assert result["headline"] == "CANNOT BUILD TONIGHT — recommend resupply"


def test_edge_zero_rate_repair_is_clean_infeasible_no_exception() -> None:
    req = _repair()
    req["deposition_rate_g_per_hr"] = 0
    result = solve(req).model_dump()  # must not raise
    assert result["feasible"] is False
    assert result["binding_reason"] == "HOURS"


def test_edge_negative_tier_feedstock_raises_value_error() -> None:
    req = _swarm()
    req["tiers"][0]["feedstock_g"] = -100
    with pytest.raises(ValueError):
        solve(req)


def test_edge_negative_item_energy_raises_value_error() -> None:
    req = _repair()
    req["items"][0]["energy_wh"] = -10
    with pytest.raises(ValueError):
        solve(req)
