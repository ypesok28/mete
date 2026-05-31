"""§S5 fixture acceptance tests — the solver's definition of "done".

Two complementary tests (README "test methodology"):

1. Correctness: ``solve(request).model_dump() == expected_response`` (semantic deep-equality)
   for all 6 fixtures. This is the human-verified spec.
2. Determinism / byte-stability (R10): solve a request, REVERSE an edit (the energy lever),
   re-solve the original, and assert IDENTICAL canonical JSON bytes both ways and across
   repeated solves. Same request bytes -> same response bytes, every time.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from solver import solve

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"
FIXTURE_FILES = sorted(p for p in FIXTURE_DIR.glob("*.json"))
BYTE_GOLDENS = json.loads((Path(__file__).resolve().parent / "byte_goldens.json").read_text())


def _load(path: Path) -> dict:
    return json.loads(path.read_text())


def canonical(model) -> str:
    """The R10 canonical byte form: model field order, compact separators, UTF-8 kept."""
    return json.dumps(model.model_dump(), ensure_ascii=False, separators=(",", ":"))


@pytest.mark.parametrize("path", FIXTURE_FILES, ids=lambda p: p.stem)
def test_fixture_correctness(path: Path) -> None:
    """solve(request).model_dump() reproduces the fixture's expected_response exactly."""
    fixture = _load(path)
    result = solve(fixture["request"])
    assert result.model_dump() == fixture["expected_response"], (
        f"{fixture['name']} mismatch"
    )


@pytest.mark.parametrize("path", FIXTURE_FILES, ids=lambda p: p.stem)
def test_repeated_solve_is_byte_stable(path: Path) -> None:
    """Same request bytes -> same response bytes, across repeated independent solves."""
    request = _load(path)["request"]
    first = canonical(solve(request))
    for _ in range(5):
        assert canonical(solve(request)) == first


@pytest.mark.parametrize("path", FIXTURE_FILES, ids=lambda p: p.stem)
def test_matches_frozen_byte_golden(path: Path) -> None:
    """Canonical bytes equal the FROZEN golden snapshotted from the proven solver.

    Guards against a refactor silently changing a single output byte (e.g. float
    formatting). The goldens are generated FROM the solver, never hand-authored (README).
    """
    request = _load(path)["request"]
    assert canonical(solve(request)) == BYTE_GOLDENS[path.stem]


def test_determinism_survives_a_reversed_edit() -> None:
    """Edit the energy lever, then reverse it; the original must re-solve byte-identical.

    Proves the solve is a pure function of the request bytes — no hidden state carried
    across solves, no path-dependence on what was solved before.
    """
    base = _load(FIXTURE_DIR / "swarm.json")["request"]

    before = canonical(solve(base))

    # Forward edit: ration energy hard (would change the answer), solve it...
    edited = json.loads(json.dumps(base))
    edited["budget"]["energy_wh"] = 120
    _ = solve(edited)

    # ...then reverse the edit and re-solve the original.
    after = canonical(solve(base))

    assert after == before
