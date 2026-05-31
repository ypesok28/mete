"""FORGE-MIX solver — the deterministic credibility core.

`solve(request) -> response` is a PURE function of the request (05 §S6): it reads only the
request body, runs single-threaded CP-SAT with a fixed seed over a fully-integer model, and
returns a `SolveResponse`. Same request bytes -> same response bytes, every time.
"""
from __future__ import annotations

from typing import Union

from pydantic import TypeAdapter

from contracts import (
    BuildRequest,
    BuildResult,
    RepairRequest,
    RepairResult,
    SolveRequest,
    SolveResponse,
)
from .build import solve_build
from .repair import solve_repair

_REQUEST_ADAPTER: TypeAdapter[SolveRequest] = TypeAdapter(SolveRequest)

RequestInput = Union[dict, BuildRequest, RepairRequest]


def solve(request: RequestInput) -> SolveResponse:
    """Validate (if a dict) and dispatch on `mode` to the BUILD or REPAIR solver."""
    if isinstance(request, dict):
        request = _REQUEST_ADAPTER.validate_python(request)

    if isinstance(request, BuildRequest):
        return solve_build(request)
    if isinstance(request, RepairRequest):
        return solve_repair(request)
    raise TypeError(f"unsupported request type: {type(request)!r}")


__all__ = ["solve", "BuildResult", "RepairResult", "SolveResponse"]
