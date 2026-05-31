"""Gate-1 regression tests: 3 verified bugs + edge hardening (task #7).

Each test pins a specific defect found in Gate-1 review. They are backward-compatible
with the 6 frozen fixtures (the fixtures all list tiers/targets in id-sorted order and
have positive rates/costs, so the fixes don't move any fixture byte).
"""
from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from solver import solve

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"


def _base_build() -> dict:
    """The locked shared BUILD preamble (tiers/budget/node), no targets yet."""
    return json.loads((FIXTURE_DIR / "swarm.json").read_text())["request"]


# ── Bug 1: tiebreak ranks by ascending tier_id / target_id, NOT request position ──
def test_tiebreak_prefers_lower_target_id_regardless_of_request_order() -> None:
    """Two identical soft targets, only ONE coverable (budget for one SCOUT). The lower
    target_id (T_A) must win even when listed AFTER the higher one in the request."""
    req = _base_build()
    # Budget for exactly one SCOUT (380 g): set feedstock to 400 g.
    req["budget"]["feedstock_g"]["CF_NYLON"] = 400
    # Two identical targets, listed in REVERSE id order (T_B before T_A).
    req["targets"] = [
        {"id": "T_B", "standoff_km": 3, "payload_g": 90, "weather_kt": 10, "value": 1},
        {"id": "T_A", "standoff_km": 3, "payload_g": 90, "weather_kt": 10, "value": 1},
    ]
    result = solve(req).model_dump()
    covered = {t["target_id"]: t["assigned_tier_id"] for t in result["target_status"] if t["covered"]}
    assert covered == {"T_A": "SCOUT_S"}, covered


def test_tiebreak_prefers_lower_tier_id_regardless_of_request_order() -> None:
    """Two tiers identical in cost & capability, listed with the higher id FIRST. The
    lower tier_id must be the one built (ascending tier_id tiebreak, not position)."""
    req = _base_build()
    # One soft target, all tiers eligible.
    req["targets"] = [
        {"id": "T1", "standoff_km": 3, "payload_g": 90, "weather_kt": 10, "value": 1}
    ]
    # Two tiers with IDENTICAL cost/capability; AAA sorts before ZZZ by id, but ZZZ is
    # listed first in the request. The lower id (AAA) must win the tiebreak.
    twin = {
        "name": "TWIN", "role": "twin", "material_class": "CF_NYLON",
        "feedstock_g": 380, "energy_wh": 40, "payload_cap_g": 150, "range_km": 5,
        "wind_kt": 15, "envelope_max_mm": 220, "mtow_g": 1200,
    }
    req["tiers"] = [
        {**twin, "id": "ZZZ_TWIN"},
        {**twin, "id": "AAA_TWIN"},
    ]
    req["node"]["components_on_hand"] = {"ZZZ_TWIN": True, "AAA_TWIN": True}
    result = solve(req).model_dump()
    assert result["builds"] == {"AAA_TWIN": 1}, result["builds"]


# ── Bug 2: _blocking_gate restricts the union to capability-capable tiers ──
def test_infeasible_gate_reason_comes_from_the_capability_capable_tier() -> None:
    """Infeasible, nothing buildable, and the gates DISAGREE on canonical order.

    - STRIKE is capability-capable for the HVT (range/payload/wind all pass) but is
      ENVELOPE-excluded (oversized for a tiny printer). ENVELOPE is the TRUE blocker —
      it's the gate stopping the only tier that could ever service the target.
    - SCOUT needs a different filament -> MATERIAL-excluded. MATERIAL precedes ENVELOPE
      in canonical order, but SCOUT could never reach the HVT on range anyway, so its
      gate is irrelevant noise.

    Before the fix, _blocking_gate unioned ALL tiers' gates and returned MATERIAL (earlier
    in canonical order). After the fix, the union is restricted to capability-capable tiers
    -> ENVELOPE.
    """
    req = _base_build()
    req["targets"] = [
        {"id": "HVT", "standoff_km": 120, "payload_g": 1200, "weather_kt": 25, "value": 10}
    ]
    # Tiny printer: STRIKE's 380 mm envelope no longer fits (max axis 300) -> ENVELOPE.
    req["node"]["printer_envelope_mm"] = {"x": 300, "y": 300, "z": 300}
    # SCOUT needs PLA, but only CF_NYLON is on hand -> MATERIAL. (SCOUT can't reach HVT.)
    req["tiers"][0]["material_class"] = "PLA"
    result = solve(req).model_dump()
    assert result["feasible"] is False
    assert result["binding_reason"] == "ENVELOPE", result["binding_reason"]


# ── Bug 3: REPAIR infeasible reports a blocking hard gate, never MISSION_COVERED ──
def test_repair_infeasible_all_hard_gated_reports_gate_not_mission_covered() -> None:
    """Every item fails the MATERIAL gate (filament class not on hand) -> nothing
    selectable, defer empty, feasible False. Must report MATERIAL, not MISSION_COVERED."""
    req = {
        "mode": "repair",
        "deposition_rate_g_per_hr": 150,
        # Budget holds PETG, but every item needs CF_NYLON -> MATERIAL gate fails for all.
        "budget": {"feedstock_g": {"PETG": 2000}, "printer_hours": 18, "energy_wh": 900},
        "node": {"printer_envelope_mm": {"x": 300, "y": 300, "z": 400}, "components_on_hand": {}},
        "items": [
            {"id": "A", "name": "a", "material_class": "CF_NYLON", "feedstock_g": 100,
             "energy_wh": 10, "envelope_max_mm": 50, "mission_value": 5, "safety_critical": False},
            {"id": "B", "name": "b", "material_class": "CF_NYLON", "feedstock_g": 100,
             "energy_wh": 10, "envelope_max_mm": 50, "mission_value": 3, "safety_critical": False},
        ],
    }
    result = solve(req).model_dump()
    assert result["feasible"] is False
    assert result["binding_reason"] == "MATERIAL", result["binding_reason"]
    assert result["buckets"]["cant_print_safety"] == ["A", "B"]
    assert result["buckets"]["print_now"] == []
    assert result["buckets"]["defer"] == []


def test_repair_infeasible_only_safety_items_reports_gate_not_mission_covered() -> None:
    """Only item is safety_critical -> safety-held, nothing selectable. feasible False,
    and the reason must not be MISSION_COVERED (nothing was covered)."""
    req = {
        "mode": "repair",
        "deposition_rate_g_per_hr": 150,
        "budget": {"feedstock_g": {"CF_NYLON": 2000}, "printer_hours": 18, "energy_wh": 900},
        "node": {"printer_envelope_mm": {"x": 300, "y": 300, "z": 400}, "components_on_hand": {}},
        "items": [
            {"id": "HUB", "name": "rotor hub", "material_class": "CF_NYLON", "feedstock_g": 180,
             "energy_wh": 55, "envelope_max_mm": 150, "mission_value": 10, "safety_critical": True},
        ],
    }
    result = solve(req).model_dump()
    assert result["feasible"] is False
    assert result["binding_reason"] != "MISSION_COVERED", result["binding_reason"]
    assert result["buckets"]["cant_print_safety"] == ["HUB"]


# ── Bug 4: edge hardening — rate<=0 graceful infeasible; negative costs rejected ──
def test_zero_rate_is_graceful_infeasible_not_a_crash() -> None:
    """deposition_rate_g_per_hr = 0 must NOT raise ZeroDivisionError; it makes every
    print take infinite hours -> nothing buildable -> a clean infeasible response."""
    req = _base_build()
    req["deposition_rate_g_per_hr"] = 0
    result = solve(req).model_dump()  # must not raise
    assert result["feasible"] is False
    assert result["headline"] == "CANNOT BUILD TONIGHT — recommend resupply"
    assert result["binding_reason"] == "HOURS"


def test_negative_rate_is_graceful_infeasible() -> None:
    req = _base_build()
    req["deposition_rate_g_per_hr"] = -5
    result = solve(req).model_dump()  # must not raise
    assert result["feasible"] is False


def test_negative_feedstock_cost_is_rejected() -> None:
    req = _base_build()
    req["tiers"][0]["feedstock_g"] = -100
    with pytest.raises(ValueError):
        solve(req)


def test_negative_energy_cost_is_rejected() -> None:
    req = _base_build()
    req["tiers"][0]["energy_wh"] = -10
    with pytest.raises(ValueError):
        solve(req)
