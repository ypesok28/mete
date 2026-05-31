"""Shared solve core: gates, eligibility, derived hours, binding_reason, CP-SAT params.

Everything both the BUILD assignment and the REPAIR knapsack consume lives here once
(05 §S3 "one core, two models"). The optimizer is kept FULLY INTEGER (05 §S6): every
cost/value entering CP-SAT is scaled to an int, so there is no floating-point
nondeterminism. Floats appear ONLY at the display edge, rounded to 2dp.
"""
from __future__ import annotations

from typing import Optional

from ortools.sat.python import cp_model

from contracts import (
    Budget,
    ExclusionReason,
    MaterialClass,
    Node,
    RepairItem,
    Target,
    Tier,
    UnitCost,
)

# ── the FIXED CP-SAT params (05 §S6: the no-fail-live determinism guarantee) ──
NUM_SEARCH_WORKERS = 1   # no parallel nondeterminism
RANDOM_SEED = 0          # fixed seed
MAX_TIME_S = 10.0        # 3xM is sub-millisecond; a generous ceiling, never hit live


def configure_solver() -> cp_model.CpSolver:
    """A CP-SAT solver pinned for a single, reproducible optimum."""
    solver = cp_model.CpSolver()
    solver.parameters.num_search_workers = NUM_SEARCH_WORKERS
    solver.parameters.random_seed = RANDOM_SEED
    solver.parameters.max_time_in_seconds = MAX_TIME_S
    return solver


# ── scaling: turn any (possibly fractional) wire numbers into exact integers ──
# Inputs are grams / Wh / hours / values. Editable fields could in principle be
# fractional; scaling by 1000 and rounding makes the model integer & deterministic
# without ever depending on float arithmetic inside the optimizer.
SCALE = 1000


def to_int(x: float) -> int:
    """Deterministically scale a wire float to an exact integer for the optimizer."""
    return int(round(x * SCALE))


# ── input hardening (solver-layer, NOT contracts.py) ─────────────────────────
def _reject_negative(label: str, value: float) -> None:
    if value < 0:
        raise ValueError(f"{label} must be non-negative, got {value}")


def validate_costs(*, feedstock_g: float, energy_wh: float, label: str) -> None:
    """Reject negative cost fields at the solver boundary (a wire could carry a bad edit).

    The contract types these as plain floats, so the guard lives here, not in contracts.py.
    """
    _reject_negative(f"{label}.feedstock_g", feedstock_g)
    _reject_negative(f"{label}.energy_wh", energy_wh)


def validate_budget(budget) -> None:
    for m, g in budget.feedstock_g.items():
        _reject_negative(f"budget.feedstock_g[{m}]", g)
    _reject_negative("budget.printer_hours", budget.printer_hours)
    _reject_negative("budget.energy_wh", budget.energy_wh)


def rate_buildable(rate: float) -> bool:
    """A non-positive deposition rate makes every print take infinite hours -> nothing is
    buildable. Callers short-circuit to a graceful infeasible instead of dividing by zero."""
    return rate > 0


# ── derived hours (04 D4) ────────────────────────────────────────────────────
def display_hours(feedstock_g: float, rate: float) -> float:
    """Per-unit print hours for the WIRE: round(feedstock_g / rate, 2). Display only.

    The hours BUDGET CONSTRAINT never uses this rounded value (README rule 1) — it
    multiplies through by `rate` to stay integer. This is purely the output field. A
    non-positive rate (which short-circuits the solve to infeasible) yields 0.0 here
    rather than dividing by zero — the display edge stays safe.
    """
    if rate <= 0:
        return 0.0
    return round(feedstock_g / rate, 2)


def round2(x: float) -> float:
    return round(x, 2)


# ── the gate-check (README rule 2) ───────────────────────────────────────────
# Canonical order: hard node/material gates first, then per-target capability gates.
GATE_ORDER: tuple[ExclusionReason, ...] = (
    "MATERIAL",
    "ENVELOPE",
    "COMPONENTS",
    "RANGE",
    "PAYLOAD",
    "WIND",
)


def _hard_gate_failure(
    *,
    material_class: MaterialClass,
    envelope_max_mm: float,
    component_id: str,
    budget: Budget,
    node: Node,
    require_component: bool,
) -> Optional[ExclusionReason]:
    """First-failing HARD gate (material/envelope/components) in canonical order, or None.

    These are per-tier/item, target-independent — a failure removes the row entirely.
    - MATERIAL: the class is a budget.feedstock_g key present with > 0 grams on hand.
    - ENVELOPE: envelope_max_mm <= max(printer x, y, z) — fits along the longest axis.
    - COMPONENTS: node.components_on_hand[id] is True (BUILD only; REPAIR has no kit gate).
    """
    on_hand = budget.feedstock_g.get(material_class, 0.0)
    if on_hand <= 0:
        return "MATERIAL"

    env = node.printer_envelope_mm
    if envelope_max_mm > max(env.x, env.y, env.z):
        return "ENVELOPE"

    if require_component and not node.components_on_hand.get(component_id, False):
        return "COMPONENTS"

    return None


def _capability_gate_failure(tier: Tier, target: Target) -> Optional[ExclusionReason]:
    """First-failing per-target capability gate (range/payload/wind) in canonical order."""
    if tier.range_km < target.standoff_km:
        return "RANGE"
    if tier.payload_cap_g < target.payload_g:
        return "PAYLOAD"
    if tier.wind_kt < target.weather_kt:
        return "WIND"
    return None


def tier_eligibility(
    tier: Tier, targets: list[Target], budget: Budget, node: Node
) -> tuple[list[str], list[ExclusionReason]]:
    """For one BUILD tier: (eligible_target_ids, distinct exclusion_reasons in canonical order).

    Per README rule 2: for each target a tier cannot service, record the FIRST failing
    gate in canonical order; exclusion_reasons = the distinct set of those, listed in
    canonical order. A hard-gate failure makes the tier ineligible for EVERY target, so
    that single reason is recorded for all of them.
    """
    eligible_ids: list[str] = []
    reasons: set[ExclusionReason] = set()

    hard_fail = _hard_gate_failure(
        material_class=tier.material_class,
        envelope_max_mm=tier.envelope_max_mm,
        component_id=tier.id,
        budget=budget,
        node=node,
        require_component=True,
    )

    for target in targets:
        if hard_fail is not None:
            reasons.add(hard_fail)
            continue
        cap_fail = _capability_gate_failure(tier, target)
        if cap_fail is not None:
            reasons.add(cap_fail)
        else:
            eligible_ids.append(target.id)

    ordered = [g for g in GATE_ORDER if g in reasons]
    return eligible_ids, ordered


def item_hard_gate(item: RepairItem, budget: Budget, node: Node) -> Optional[ExclusionReason]:
    """REPAIR item's first-failing hard gate (no components kit gate for repair items)."""
    return _hard_gate_failure(
        material_class=item.material_class,
        envelope_max_mm=item.envelope_max_mm,
        component_id=item.id,
        budget=budget,
        node=node,
        require_component=False,
    )


def unit_cost(tier: Tier, rate: float) -> UnitCost:
    """The per-unit cost card for the wire (printer_hours rounded 2dp; rest pass through)."""
    return UnitCost(
        feedstock_g=tier.feedstock_g,
        printer_hours=display_hours(tier.feedstock_g, rate),
        energy_wh=tier.energy_wh,
    )
