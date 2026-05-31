"""REPAIR model: value-maximizing item knapsack under the same budget + gates.

Same budget+gate core as BUILD (05 §S3); the optimization is item-SELECTION instead of
tier->target assignment, and the result is three buckets:

  - safety_critical OR failing a hard gate  -> cant_print_safety  (regardless of budget)
  - selected (maximize Σ mission_value s.t. budget) -> print_now
  - eligible but unselected (budget)        -> defer

Fully integer optimizer (SCALE-d), single worker, fixed seed -> unique optimum. The
fixed tiebreak prefers lower feedstock cost -> request order, mirroring BUILD.
"""
from __future__ import annotations

from ortools.sat.python import cp_model

from contracts import Budget, RepairBuckets, RepairRequest, RepairResult
from .common import (
    configure_solver,
    item_hard_gate,
    rate_buildable,
    round2,
    to_int,
    validate_budget,
    validate_costs,
)


def solve_repair(request: RepairRequest) -> RepairResult:
    items = request.items
    budget = request.budget
    node = request.node
    rate = request.deposition_rate_g_per_hr

    # ── input hardening (solver-layer): reject negative costs/budget ──
    validate_budget(budget)
    for item in items:
        validate_costs(
            feedstock_g=item.feedstock_g, energy_wh=item.energy_wh, label=f"item {item.id}"
        )

    # ── partition: safety-hold (safety_critical or hard-gate fail) vs selectable ──
    safety: list[str] = []          # request order
    selectable_idx: list[int] = []  # indices into items, request order
    hard_gates: set[str] = set()    # distinct hard gates excluding any item (canonical)
    for i, item in enumerate(items):
        gate = item_hard_gate(item, budget, node)
        if gate is not None:
            hard_gates.add(gate)
        if item.safety_critical or gate is not None:
            safety.append(item.id)
        else:
            selectable_idx.append(i)

    # ── graceful rate guard: rate<=0 -> infinite print hours -> nothing printable ──
    # Every selectable item defers (no division by zero); feasible False, binding HOURS.
    if not rate_buildable(rate):
        defer = [items[i].id for i in selectable_idx]
        return _assemble(request, [], defer, safety, hard_gates)

    model = cp_model.CpModel()
    y: dict[int, cp_model.IntVar] = {
        i: model.NewBoolVar(f"y_{items[i].id}") for i in selectable_idx
    }

    # ── budget constraints, all integer ──
    classes = {items[i].material_class for i in selectable_idx}
    for m in classes:
        terms = [
            to_int(items[i].feedstock_g) * y[i]
            for i in selectable_idx
            if items[i].material_class == m
        ]
        if terms:
            model.Add(sum(terms) <= to_int(budget.feedstock_g.get(m, 0.0)))

    # Hours: Σ feedstock_i·y_i ≤ H·rate (multiply through to stay integer)
    hours_terms = [to_int(items[i].feedstock_g) * y[i] for i in selectable_idx]
    if hours_terms:
        model.Add(sum(hours_terms) <= to_int(budget.printer_hours * rate))

    energy_terms = [to_int(items[i].energy_wh) * y[i] for i in selectable_idx]
    if energy_terms:
        model.Add(sum(energy_terms) <= to_int(budget.energy_wh))

    # ── lexicographic objective: max value, then min cost, then fixed tiebreak ──
    value_terms = [to_int(items[i].mission_value) * y[i] for i in selectable_idx]
    cost_terms = [
        (to_int(items[i].feedstock_g) + to_int(items[i].energy_wh)) * y[i]
        for i in selectable_idx
    ]
    # tiebreak: prefer lower feedstock cost, then ascending item id (not request position)
    ranked = sorted(selectable_idx, key=lambda i: (to_int(items[i].feedstock_g), items[i].id))
    tb_rank = {i: r for r, i in enumerate(ranked)}
    tiebreak_terms = [(tb_rank[i] + 1) * y[i] for i in selectable_idx]

    n = max(len(selectable_idx), 1)
    max_cost_unit = max(
        (to_int(items[i].feedstock_g) + to_int(items[i].energy_wh) for i in selectable_idx),
        default=0,
    )
    cost_cap = max_cost_unit * n + 1
    tb_cap = (len(selectable_idx) + 1) * (len(selectable_idx) + 1)
    W_TB = 1
    W_COST = (tb_cap + 1) * W_TB
    W_VALUE = (cost_cap + 1) * W_COST

    model.Maximize(
        W_VALUE * sum(value_terms)
        - W_COST * sum(cost_terms)
        - W_TB * sum(tiebreak_terms)
    )

    solver = configure_solver()
    status = solver.Solve(model)
    assert status in (cp_model.OPTIMAL, cp_model.FEASIBLE), f"solver status {status}"

    # ── read selection ──
    print_now: list[str] = []
    defer: list[str] = []
    for i in selectable_idx:  # request order
        if solver.Value(y[i]) == 1:
            print_now.append(items[i].id)
        else:
            defer.append(items[i].id)

    return _assemble(request, print_now, defer, safety, hard_gates)


def _assemble(
    request: RepairRequest,
    print_now: list[str],
    defer: list[str],
    safety: list[str],
    hard_gates: set[str],
) -> RepairResult:
    items = request.items
    budget = request.budget
    rate = request.deposition_rate_g_per_hr
    item_by_id = {it.id: it for it in items}

    selected = [item_by_id[i] for i in print_now]
    selected_value = sum(it.mission_value for it in selected)

    # ── budget_used over the selected (print_now) items ──
    used_feedstock: dict[str, float] = {m: 0.0 for m in budget.feedstock_g}
    used_energy = 0.0
    exact_hours = 0.0
    for it in selected:
        used_feedstock[it.material_class] = (
            used_feedstock.get(it.material_class, 0.0) + it.feedstock_g
        )
        used_energy += it.energy_wh
        exact_hours += it.feedstock_g / rate

    budget_used = Budget(
        feedstock_g={m: round2(v) for m, v in used_feedstock.items()},
        printer_hours=round2(exact_hours),
        energy_wh=round2(used_energy),
    )

    feasible = len(print_now) > 0
    headline = (
        f"PRINT {len(print_now)} NOW · {len(defer)} DEFER · {len(safety)} SAFETY-HOLD"
    )
    binding_reason = _repair_binding_reason(
        request, defer, budget, budget_used, feasible, hard_gates
    )

    return RepairResult(
        feasible=feasible,
        headline=headline,
        binding_reason=binding_reason,
        budget_total=budget,
        budget_used=budget_used,
        buckets=RepairBuckets(
            print_now=print_now,
            cant_print_safety=safety,
            defer=defer,
        ),
        selected_value=selected_value,
    )


def _repair_binding_reason(
    request: RepairRequest,
    defer: list[str],
    budget: Budget,
    budget_used: Budget,
    feasible: bool,
    hard_gates: set[str],
) -> str:
    """The headline reason (README rule 9). Infeasible NEVER returns MISSION_COVERED."""
    items = request.items
    item_by_id = {it.id: it for it in items}
    rate = request.deposition_rate_g_per_hr

    if not feasible:
        # Nothing printed. Prefer a budget reason if a selectable item exists but couldn't
        # be afforded; otherwise report the blocking hard gate. Never MISSION_COVERED.
        candidates = [item_by_id[i] for i in defer]
        if candidates:
            cheapest = min(candidates, key=lambda it: it.feedstock_g)
            return _which_budget(cheapest, budget, budget_used, rate)
        # No selectable item at all (everything safety-held / hard-gated): report the
        # blocking hard gate in canonical order, or FEEDSTOCK as the canonical fallback
        # (e.g. only safety_critical items — a policy hold with no resource/gate blocker).
        for g in ("MATERIAL", "ENVELOPE", "COMPONENTS"):
            if g in hard_gates:
                return g
        return "FEEDSTOCK"

    if defer:
        cheapest = min((item_by_id[i] for i in defer), key=lambda it: it.feedstock_g)
        return _which_budget(cheapest, budget, budget_used, rate)

    return "MISSION_COVERED"


def _which_budget(item, budget: Budget, used: Budget, rate: float) -> str:
    """First budget (FEEDSTOCK/HOURS/ENERGY) that can't fit one more of `item`."""
    on_hand = budget.feedstock_g.get(item.material_class, 0.0)
    used_feed = used.feedstock_g.get(item.material_class, 0.0)
    if used_feed + item.feedstock_g > on_hand + 1e-9:
        return "FEEDSTOCK"
    # A non-positive rate makes print hours infinite -> HOURS can fit nothing.
    if rate <= 0 or used.printer_hours + item.feedstock_g / rate > budget.printer_hours + 1e-9:
        return "HOURS"
    if used.energy_wh + item.energy_wh > budget.energy_wh + 1e-9:
        return "ENERGY"
    return "FEEDSTOCK"
