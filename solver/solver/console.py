"""Gate 1 console harness — the readable proof the math reorganizes a mission into a build.

Run from the solver package root (`src/solver/`):

    python -m solver.console

Loads the SWARM, DEEP, MIXED build fixtures and solves each, printing headline + builds +
binding_reason + coverage to show the SWARM->DEEP->MIXED flip (5 small -> 1 big -> mixed);
then ESCALATION-b -> the CANNOT BUILD TONIGHT / ENERGY resupply verdict. Reads only the
fixture request bytes; the solve is the same pure function the tests exercise.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow `python -m solver.console` AND `python solver/console.py` from the package root.
_PKG_ROOT = Path(__file__).resolve().parent.parent  # src/solver/
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))

from solver import solve  # noqa: E402

FIXTURE_DIR = _PKG_ROOT / "tests" / "fixtures"

RULE = "─" * 72


def _load_request(name: str) -> dict:
    return json.loads((FIXTURE_DIR / f"{name}.json").read_text())["request"]


def _print_build(name: str, beat: str) -> None:
    result = solve(_load_request(name))
    print(RULE)
    print(f"  {name:<12} {beat}")
    print(RULE)
    print(f"  HEADLINE        {result.headline}")
    print(f"  FEASIBLE        {result.feasible}")
    print(f"  BINDING REASON  {result.binding_reason}")
    builds = ", ".join(f"{tid}×{n}" for tid, n in result.builds.items()) or "(none)"
    print(f"  BUILDS          {builds}")
    print(f"  COVERAGE        {result.coverage.covered}/{result.coverage.total}"
          f"  ·  covered_value {result.covered_value:g}")
    used = result.budget_used
    feed = ", ".join(f"{m} {g:g}g" for m, g in used.feedstock_g.items())
    print(f"  BUDGET USED     {feed}  ·  {used.printer_hours:g} h  ·  {used.energy_wh:g} Wh")
    # per-tier eligibility / exclusion (the heterogeneous heart)
    for ts in result.tier_status:
        elig = ",".join(ts.eligible_target_ids) if ts.eligible_target_ids else "—"
        excl = ",".join(ts.exclusion_reasons) if ts.exclusion_reasons else "—"
        print(f"    {ts.tier_id:<9} built {ts.built}  eligible[{elig}]  excluded[{excl}]")
    print()


def main() -> None:
    print()
    print("FORGE-MIX · deterministic solver · Gate 1 proof")
    print("the same lever, both directions: SWARM (5 small) -> DEEP (1 big) -> MIXED")
    print()

    _print_build("swarm", "many-small  — 8 soft contacts, SCOUT feedstock-capped at 5")
    _print_build("deep", "one-big     — 1 hardened HVT, range zeroes the cheap tiers")
    _print_build("mixed", "mixed       — HVT + soft contacts in ONE mission (no re-sort)")

    print(RULE)
    print("  THE FLIP        5× SCOUT-S  →  1× STRIKE-L  →  1× STRIKE-L + 1× SCOUT-S")
    print("                  size is a GATE, not a score — the big tier enters only when")
    print("                  the cheap tiers are range-excluded for the target.")
    print(RULE)
    print()

    _print_build("escalation_b", "resupply    — DEEP mission, energy rationed to 300 Wh")

    esc = solve(_load_request("escalation_b"))
    print(RULE)
    print("  RESUPPLY VERDICT")
    print(RULE)
    print(f"  {esc.headline}")
    print(f"  The only capable tier (STRIKE-L, 380 Wh) is unaffordable on energy (300 Wh).")
    print(f"  feasible={esc.feasible}  binding_reason={esc.binding_reason}  "
          f"(eligible ≠ affordable — STRIKE stays gate-eligible for the HVT).")
    print(RULE)
    print()


if __name__ == "__main__":
    main()
