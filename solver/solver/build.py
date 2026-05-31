"""BUILD model: the 3xM binary assignment x_{t,j} (02 §S4).

Lexicographic objective, collapsed into ONE strictly-separated integer objective so the
optimum is UNIQUE (05 §S6):

  1. maximize covered_value          (cover the most mission priority)
  2. minimize total resource cost    (feedstock + energy consumed)
  3. fixed tiebreak                  (prefer lower unit cost -> ascending tier_id ->
                                      ascending target_id) — README rule 5

The three levels are separated by orders of magnitude derived from the data bounds, so a
lower level can NEVER change a higher-level decision. Everything entering CP-SAT is an
integer (SCALE-d), and the hours constraint is multiplied through by `rate` to stay integer
(KEY TIP / 05 §S6): no float ever reaches the optimizer.
"""
from __future__ import annotations

from ortools.sat.python import cp_model

from contracts import (
    BuildRequest,
    BuildResult,
    Budget,
    Coverage,
    TargetStatus,
    TierStatus,
)
from .common import (
    GATE_ORDER,
    configure_solver,
    display_hours,
    rate_buildable,
    round2,
    tier_eligibility,
    to_int,
    unit_cost,
    validate_budget,
    validate_costs,
)


def solve_build(request: BuildRequest) -> BuildResult:
    tiers = request.tiers
    targets = request.targets
    budget = request.budget
    node = request.node
    rate = request.deposition_rate_g_per_hr

    # ── input hardening (solver-layer): reject negative costs/budget ──
    validate_budget(budget)
    for tier in tiers:
        validate_costs(
            feedstock_g=tier.feedstock_g, energy_wh=tier.energy_wh, label=f"tier {tier.id}"
        )

    # ── eligibility pass (target-independent gates + per-target capability gates) ──
    eligible_ids: dict[str, list[str]] = {}
    exclusion: dict[str, list[str]] = {}
    eligible_set: dict[str, set[str]] = {}
    for tier in tiers:
        ids, reasons = tier_eligibility(tier, targets, budget, node)
        eligible_ids[tier.id] = ids
        exclusion[tier.id] = reasons
        eligible_set[tier.id] = set(ids)

    # ── graceful rate guard: rate<=0 -> infinite print hours -> nothing buildable ──
    # Short-circuit BEFORE the model (no division by zero); assemble an empty/infeasible
    # build whose binding reason is HOURS (the budget that can fit nothing).
    if not rate_buildable(rate):
        built = {tier.id: 0 for tier in tiers}
        return _assemble(request, eligible_ids, exclusion, built, {})

    model = cp_model.CpModel()

    # ── decision vars: x[t,j] only where tier t is eligible for target j ──
    x: dict[tuple[int, int], cp_model.IntVar] = {}
    for ti, tier in enumerate(tiers):
        for tj, target in enumerate(targets):
            if target.id in eligible_set[tier.id]:
                x[(ti, tj)] = model.NewBoolVar(f"x_{tier.id}_{target.id}")

    # ── each target covered at most once (one airframe services one target) ──
    for tj in range(len(targets)):
        col = [x[(ti, tj)] for ti in range(len(tiers)) if (ti, tj) in x]
        if col:
            model.Add(sum(col) <= 1)

    # ── budget constraints, all integer ──
    # Feedstock by material class: Σ_{t in m} n_t·feedstock_t ≤ on_hand[m]
    classes = {tier.material_class for tier in tiers}
    for m in classes:
        terms = [
            to_int(tiers[ti].feedstock_g) * x[(ti, tj)]
            for (ti, tj) in x
            if tiers[ti].material_class == m
        ]
        if terms:
            model.Add(sum(terms) <= to_int(budget.feedstock_g.get(m, 0.0)))

    # Hours: Σ n_t·(feedstock_t/rate) ≤ H  ⇔  Σ n_t·feedstock_t ≤ H·rate  (multiply through)
    hours_terms = [to_int(tiers[ti].feedstock_g) * x[(ti, tj)] for (ti, tj) in x]
    if hours_terms:
        model.Add(sum(hours_terms) <= to_int(budget.printer_hours * rate))

    # Energy: Σ n_t·energy_t ≤ E
    energy_terms = [to_int(tiers[ti].energy_wh) * x[(ti, tj)] for (ti, tj) in x]
    if energy_terms:
        model.Add(sum(energy_terms) <= to_int(budget.energy_wh))

    # ── lexicographic objective via order-of-magnitude separation ──────────────
    # value term (lex-1): Σ value_j · x[t,j]
    value_terms = [to_int(targets[tj].value) * x[(ti, tj)] for (ti, tj) in x]

    # cost term (lex-2): Σ (feedstock + energy) · x[t,j]  — total resources consumed.
    cost_terms = [
        (to_int(tiers[ti].feedstock_g) + to_int(tiers[ti].energy_wh)) * x[(ti, tj)]
        for (ti, tj) in x
    ]

    # tiebreak term (lex-3): strictly-increasing per-(t,j) penalty ordering by
    # (unit cost, ascending tier_id, ascending target_id) — README rule 5.
    # Rank by the actual id STRINGS, not request position, so the tiebreak is stable
    # regardless of how the request happens to order tiers/targets.
    def tb_key(k: tuple[int, int]) -> tuple[int, str, str]:
        ti, tj = k
        return (
            to_int(tiers[ti].feedstock_g) + to_int(tiers[ti].energy_wh),
            tiers[ti].id,
            targets[tj].id,
        )

    ranked = sorted(x.keys(), key=tb_key)
    tb_rank = {k: r for r, k in enumerate(ranked)}
    tiebreak_terms = [(tb_rank[k] + 1) * x[k] for k in x]

    # Magnitude separation: each level must dominate ALL lower levels' maxima.
    # Bound each sum by a safe upper bound, then leave a 10x gap.
    n_targets = max(len(targets), 1)
    max_cost_unit = max(
        (to_int(t.feedstock_g) + to_int(t.energy_wh) for t in tiers), default=0
    )
    cost_cap = max_cost_unit * n_targets + 1
    tb_cap = (len(x) + 1) * (len(x) + 1)  # > Σ ranks
    # value weight ≫ cost weight ≫ tiebreak weight
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

    # ── read the assignment ────────────────────────────────────────────────────
    assigned_tier_of: dict[str, str] = {}  # target_id -> tier_id
    built: dict[str, int] = {tier.id: 0 for tier in tiers}
    for (ti, tj), var in x.items():
        if solver.Value(var) == 1:
            tier_id = tiers[ti].id
            target_id = targets[tj].id
            assigned_tier_of[target_id] = tier_id
            built[tier_id] += 1

    return _assemble(request, eligible_ids, exclusion, built, assigned_tier_of)


def _assemble(
    request: BuildRequest,
    eligible_ids: dict[str, list[str]],
    exclusion: dict[str, list[str]],
    built: dict[str, int],
    assigned_tier_of: dict[str, str],
) -> BuildResult:
    tiers = request.tiers
    targets = request.targets
    budget = request.budget
    rate = request.deposition_rate_g_per_hr

    tier_by_id = {t.id: t for t in tiers}

    covered_value = sum(
        next(t.value for t in targets if t.id == tid)
        for tid in assigned_tier_of
    )
    covered_count = len(assigned_tier_of)
    feasible = covered_value > 0

    # ── budget_used (display floats rounded 2dp; hours = round(Σ exact per-unit, 2)) ──
    used_feedstock: dict[str, float] = {
        m: 0.0 for m in budget.feedstock_g
    }
    used_energy = 0.0
    exact_hours = 0.0
    for tier_id, n in built.items():
        if n == 0:
            continue
        tier = tier_by_id[tier_id]
        used_feedstock[tier.material_class] = (
            used_feedstock.get(tier.material_class, 0.0) + n * tier.feedstock_g
        )
        used_energy += n * tier.energy_wh
        exact_hours += n * (tier.feedstock_g / rate)

    budget_used = Budget(
        feedstock_g={m: round2(v) for m, v in used_feedstock.items()},
        printer_hours=round2(exact_hours),
        energy_wh=round2(used_energy),
    )

    # ── tier_status (all tiers, request order) ──
    tier_status: list[TierStatus] = []
    for tier in tiers:
        tier_status.append(
            TierStatus(
                tier_id=tier.id,
                built=built[tier.id],
                derived_hours=display_hours(tier.feedstock_g, rate),
                unit_cost=unit_cost(tier, rate),
                eligible_target_ids=eligible_ids[tier.id],
                exclusion_reasons=exclusion[tier.id],
            )
        )

    # ── target_status (request order) ──
    target_status: list[TargetStatus] = []
    for target in targets:
        tid = assigned_tier_of.get(target.id)
        target_status.append(
            TargetStatus(
                target_id=target.id,
                covered=tid is not None,
                assigned_tier_id=tid,
            )
        )

    # ── builds + headline: built>0 only, descending feedstock cost (README 6/7) ──
    built_tiers = [t for t in tiers if built[t.id] > 0]
    built_tiers.sort(key=lambda t: t.feedstock_g, reverse=True)
    builds = {t.id: built[t.id] for t in built_tiers}

    if not feasible:
        headline = "CANNOT BUILD TONIGHT — recommend resupply"
    else:
        headline = "BUILD " + " + ".join(
            f"{built[t.id]}× {t.name}" for t in built_tiers
        )

    binding_reason = _binding_reason(
        request=request,
        eligible_ids=eligible_ids,
        exclusion=exclusion,
        built=built,
        assigned_tier_of=assigned_tier_of,
        feasible=feasible,
        budget_used=budget_used,
    )

    return BuildResult(
        feasible=feasible,
        headline=headline,
        binding_reason=binding_reason,
        budget_total=budget,
        budget_used=budget_used,
        builds=builds,
        coverage=Coverage(covered=covered_count, total=len(targets)),
        covered_value=covered_value,
        tier_status=tier_status,
        target_status=target_status,
    )


def _binding_reason(
    *,
    request: BuildRequest,
    eligible_ids: dict[str, list[str]],
    exclusion: dict[str, list[str]],
    built: dict[str, int],
    assigned_tier_of: dict[str, str],
    feasible: bool,
    budget_used,
) -> str:
    """The single headline reason (04 §S4 / README rule 9), in strict precedence order."""
    tiers = request.tiers
    targets = request.targets
    budget = request.budget
    rate = request.deposition_rate_g_per_hr

    # 1. INFEASIBLE: the gate/budget that blocked the only capable tier(s).
    if not feasible:
        # Tiers gate-eligible for >=1 target but built nothing -> a BUDGET blocked them.
        capable = [t for t in tiers if eligible_ids[t.id]]
        if capable:
            return _blocking_budget(capable, budget, rate)
        # No tier is gate-eligible for any target -> a hard/capability GATE blocked all.
        # Report the gate on a CAPABILITY-CAPABLE tier (range/payload/wind pass for some
        # target) — the tier that could actually have serviced a target but for a hard
        # gate. Ignore the gates of tiers that could never reach any target anyway.
        return _blocking_gate(request, exclusion)

    # 2. Some targets uncovered, limited by a budget -> that budget.
    uncovered = [t for t in targets if t.id not in assigned_tier_of]
    if uncovered:
        # Among tiers eligible for an uncovered target, find which budget stops one more.
        capable = [
            t
            for t in tiers
            if any(tid in eligible_ids[t.id] for tid in (u.id for u in uncovered))
        ]
        if capable:
            return _blocking_budget(capable, budget, rate, used=budget_used)

    # 3. Fully covered but the cheapest tier was excluded for a covered target
    #    (a bigger tier was forced) -> the exclusion gate.
    forced = _forced_exclusion_gate(request, eligible_ids, assigned_tier_of)
    if forced is not None:
        return forced

    # 4. Cheapest tier, budget to spare.
    return "MISSION_COVERED"


def _blocking_budget(capable, budget: Budget, rate: float, used=None) -> str:
    """Which budget (FEEDSTOCK/HOURS/ENERGY) blocks building one more of a capable tier.

    Checks the CHEAPEST capable tier (lowest feedstock): the one the solver would build
    next. Returns the first budget (in FEEDSTOCK, HOURS, ENERGY order) whose remaining
    headroom can't fit one more unit. README rule 9.
    """
    cheapest = min(capable, key=lambda t: t.feedstock_g)

    used_feedstock = 0.0
    used_hours = 0.0
    used_energy = 0.0
    if used is not None:
        used_feedstock = used.feedstock_g.get(cheapest.material_class, 0.0)
        used_hours = used.printer_hours
        used_energy = used.energy_wh

    on_hand_feed = budget.feedstock_g.get(cheapest.material_class, 0.0)
    if used_feedstock + cheapest.feedstock_g > on_hand_feed + 1e-9:
        return "FEEDSTOCK"
    # A non-positive rate makes print hours infinite -> HOURS can fit nothing.
    if rate <= 0 or used_hours + cheapest.feedstock_g / rate > budget.printer_hours + 1e-9:
        return "HOURS"
    if used_energy + cheapest.energy_wh > budget.energy_wh + 1e-9:
        return "ENERGY"
    # Fallback: feedstock is the canonical first budget.
    return "FEEDSTOCK"


def _blocking_gate(request: BuildRequest, exclusion: dict[str, list[str]]) -> str:
    """The blocking gate when nothing is buildable, restricted to CAPABILITY-CAPABLE tiers.

    A tier is capability-capable if range/payload/wind all pass for at least one target
    (ignoring hard gates) — i.e. it could have serviced a target but for a hard gate. We
    report the first hard gate (canonical order) excluding such a tier: that is the true
    blocker. The gates of tiers that could never reach any target on capability are noise
    and must not dominate (e.g. a MATERIAL-out tier that is also range-incapable).

    Fallbacks: if some capability-capable tier is excluded only by a capability gate, or if
    no tier is capability-capable at all, report the capability-gate union (RANGE/PAYLOAD/
    WIND) in canonical order — that is then the genuine reason no tier can reach a target.
    """
    from .common import _capability_gate_failure, _hard_gate_failure

    tiers = request.tiers
    targets = request.targets

    capability_capable = [
        t
        for t in tiers
        if any(_capability_gate_failure(t, target) is None for target in targets)
    ]

    if capability_capable:
        hard_present: set[str] = set()
        for t in capability_capable:
            hard = _hard_gate_failure(
                material_class=t.material_class,
                envelope_max_mm=t.envelope_max_mm,
                component_id=t.id,
                budget=request.budget,
                node=request.node,
                require_component=True,
            )
            if hard is not None:
                hard_present.add(hard)
        for g in ("MATERIAL", "ENVELOPE", "COMPONENTS"):
            if g in hard_present:
                return g

    # No capability-capable tier has a hard-gate failure: the real blocker is capability —
    # report the capability-gate union across all tiers in canonical order.
    capability_present = {
        r for reasons in exclusion.values() for r in reasons
        if r in ("RANGE", "PAYLOAD", "WIND")
    }
    for g in ("RANGE", "PAYLOAD", "WIND"):
        if g in capability_present:
            return g

    # Degenerate fallback: any gate present at all, else feedstock.
    present = {r for reasons in exclusion.values() for r in reasons}
    for g in GATE_ORDER:
        if g in present:
            return g
    return "FEEDSTOCK"


def _forced_exclusion_gate(
    request: BuildRequest,
    eligible_ids: dict[str, list[str]],
    assigned_tier_of: dict[str, str],
) -> str | None:
    """Precedence rule 3: fully covered, but a cheaper tier was excluded for a covered
    target (so a bigger tier had to be forced). Return that exclusion gate, or None.

    For each covered target, if a tier strictly cheaper than the assigned tier exists but
    is NOT eligible for that target, the gate that excludes the cheapest such tier is the
    reason. Reported in canonical gate order across all covered targets.
    """
    tiers = request.tiers
    targets = request.targets
    tier_by_id = {t.id: t for t in tiers}
    target_by_id = {t.id: t for t in targets}
    eligible_set = {tid: set(ids) for tid, ids in eligible_ids.items()}

    found: set[str] = set()
    for target_id, assigned_tier_id in assigned_tier_of.items():
        assigned = tier_by_id[assigned_tier_id]
        target = target_by_id[target_id]
        for t in tiers:
            if t.feedstock_g < assigned.feedstock_g and target_id not in eligible_set[t.id]:
                # the gate that excludes this cheaper tier for this target
                from .common import _capability_gate_failure, _hard_gate_failure

                hard = _hard_gate_failure(
                    material_class=t.material_class,
                    envelope_max_mm=t.envelope_max_mm,
                    component_id=t.id,
                    budget=request.budget,
                    node=request.node,
                    require_component=True,
                )
                gate = hard if hard is not None else _capability_gate_failure(t, target)
                if gate is not None:
                    found.add(gate)

    for g in GATE_ORDER:
        if g in found:
            return g
    return None
