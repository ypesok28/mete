# §S5 fixtures — the shared acceptance tests AND the frontend mock

Each `*.json` here is one locked fixture from `planning/04_contracts.md §S5`. Authored by the
Tech Lead; this is the **one artifact two streams build against**:

- **solver-eng** is done when `solve(request)` reproduces every `expected_response`.
- **frontend-eng** renders against these `expected_response` blobs as its mock (Phase 3-functional),
  so the live swap is "delete the mock, point `fetch('/solve')` at `:8000`" — not an integration project.

## File shape

```jsonc
{
  "name": "SWARM",
  "description": "…",
  "request":           { /* a full SolveRequest — BuildRequest or RepairRequest */ },
  "expected_response": { /* the full SolveResponse the solver MUST return */ }
}
```

The `request` is a complete wire payload (it carries the full editable `tiers[]` — there is no
hidden server-side catalog). The `expected_response` is the byte-stable answer.

## How "done"/"byte-stable" is verified (test methodology)

Two complementary tests, because the spec asks for both *correct values* and *stable bytes*:

1. **Correctness (this directory):** `solve(request).model_dump() == expected_response`
   (semantic deep-equality). This is the human-verified spec — clean, readable expected values.
2. **Determinism / byte-stability (R10):** a separate test solves a request, reverses the edit,
   re-solves, and asserts **identical canonical JSON bytes** both ways
   (`json.dumps(model_dump(), ensure_ascii=False, separators=(",",":"))`, field order = the
   `contracts.py` model order). Byte-golden strings are snapshotted **from the proven solver**
   and frozen — never hand-authored (hand-authoring full-precision floats is what breaks byte tests).

> The solver is a **pure function** of the request. Single worker, fixed seed, integer model,
> fixed tiebreak → unique optimum → same request bytes ⇒ same response bytes.

## Derived seam rules (implicit in §S5 prose — pinned here so the solver matches the fixtures EXACTLY)

These are Tech-Lead rulings that make the §S5 expected outputs reproducible. solver-eng must
implement them verbatim. (Surfaced to the user at Gate 0; product-neutral, tunable on review.)

1. **Float policy.** Every cost field is an integer **except printer hours**.
   - `derived_hours` and `unit_cost.printer_hours` = `round(feedstock_g / deposition_rate, 2)`
     → SCOUT_S 2.53, ISR_M 3.0, STRIKE_L 9.33 (matches 02 §S3's 2.5/3.0/9.3 to 1dp, carried to 2dp).
   - `budget_used.printer_hours` = `round(Σ exact per-unit hours, 2)`.
   - **The hours budget CONSTRAINT uses EXACT (unrounded) hours**; only the wire output is rounded.
   - `value` / `covered_value` / `selected_value` are typed float but always whole here.

2. **Gate-check canonical order** (for `exclusion_reasons`):
   `[MATERIAL, ENVELOPE, COMPONENTS, RANGE, PAYLOAD, WIND]` — hard node/material gates first,
   then per-target capability gates. For each target a tier cannot service, record the **first**
   failing gate in this order; `exclusion_reasons` = the **distinct set** of those, listed in this
   order. (This is why DEEP's SCOUT, which fails range+payload+wind, reports just `["RANGE"]`.)

3. **Envelope gate** = `envelope_max_mm ≤ max(printer x, y, z)` (04 §S1) — fits along the longest axis.
   With the {300,300,400} node: max = 400, so all three tiers pass (220, 320, 380 ≤ 400).

4. **Eligible ≠ affordable.** `eligible_target_ids` lists targets whose **gates** all pass — it does
   NOT consider budget. A tier can be gate-eligible yet `built:0` because the budget can't afford it
   (see ESCALATION-b: STRIKE_L is eligible for the HVT but unaffordable on energy → `feasible:false`).

5. **Assignment tiebreak** (04 §S4, makes the optimum unique): maximize `covered_value` (lex-1),
   then minimize total cost (lex-2), then prefer **lower unit cost → ascending `tier_id` →
   ascending `target_id`**. Consequence: among identical targets, the lowest-id targets are covered first.

6. **Headline format.** Built tiers listed in **descending feedstock cost** (biggest airframe first),
   each `"{n}× {NAME}"`, joined by `" + "`, prefixed `"BUILD "`.
   Infeasible (`covered_value == 0`) → `"CANNOT BUILD TONIGHT — recommend resupply"`.

7. **`builds`** includes only tiers with `built > 0`, ordered **descending feedstock cost** (same as
   the headline; matches §S5's `{STRIKE_L, SCOUT_S}`). **`tier_status`** always lists all tiers, in
   **request tier order**. `eligible_target_ids` and `target_status` follow **request target order**.
   (Key order only matters for the byte-golden; the correctness test is dict-equality, order-agnostic.)

8. **`budget_used.feedstock_g`** carries the same material-class keys as `budget_total.feedstock_g`,
   values = grams consumed (0 if none built).

9. **`binding_reason` precedence** (04 §S4; reconciled 2026-05-30 after the Gate-1 workflow):
   1. infeasible → the gate/budget that blocked the only **capability-capable** tier (restrict the
      candidate set to tiers passing range/payload/wind before attributing a hard gate — never
      blame a structurally-incapable tier);
   2. else some targets uncovered, limited by a budget → that budget (`FEEDSTOCK`/`HOURS`/`ENERGY`);
   3. else fully covered but the cheapest tier was excluded → the gate that excluded it: usually
      `RANGE`/`PAYLOAD`/`WIND`, but a **hard gate** (`MATERIAL`/`ENVELOPE`/`COMPONENTS`) when the
      cheaper tier was hard-gated (e.g. a fully-covered REROUTE → `COMPONENTS`);
   4. else `MISSION_COVERED`.
   - **REPAIR:** same ladder; an infeasible REPAIR (nothing printable — all items safety-held or
     hard-gated) reports the blocking hard gate / limiting budget, **never `MISSION_COVERED`**.
   - **Edge:** `deposition_rate ≤ 0` → graceful infeasible (binding `HOURS`), not a crash; negative
     feedstock/energy costs are rejected with a `ValueError` (handled in the solver layer, not the contract).
   - Consequence (id tiebreak, rule 5): among identical targets the **lowest-id** are covered first,
     and a cost tie between tiers resolves to the **lowest tier_id** — invariant to request order.

## The 6 fixtures

| file | mode | the beat it proves |
|---|---|---|
| `swarm.json`        | build  | many-small — 5× SCOUT, FEEDSTOCK-bound, 5/8 |
| `deep.json`         | build  | one-big — 1× STRIKE, RANGE-forced, 1/1 (the flip target) |
| `mixed.json`        | build  | heterogeneous — 1× STRIKE + 1× SCOUT, value 11 (no re-sort can do this) |
| `escalation_b.json` | build  | CANNOT BUILD — energy rationed, ENERGY, resupply verdict |
| `reroute.json`      | build  | adapt — SCOUT kit out → 4× ISR, COMPONENTS exclusion |
| `repair.json`       | repair | triage — print_now / cant_print_safety / defer (authored after the catalog draft) |
