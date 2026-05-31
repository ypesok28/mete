"""FORGE-MIX solver service — the single-port FastAPI wrap around the proven solver.

A mechanical, ADDITIVE wrap (05 §S3): the math is frozen and lives in `solver/`. This file
adds exactly one HTTP surface, `POST /solve`, plus the single-port static collapse (05 §S4).

Request lifecycle (05 §S3):
  POST /solve  ->  Pydantic validates the body into BuildRequest | RepairRequest on `mode`
  (a malformed contract fails HERE with 422, never reaching the solver)  ->  the SAME pure
  `solve()` the tests/console use dispatches and runs single-threaded CP-SAT  ->  FastAPI
  serializes the SolveResponse model back as snake_case JSON.

Determinism (05 §S6): the handler is a PURE function of the validated request — no wall-clock,
no random, no env, no disk, no datetime touches the solve. Nothing but the request enters it.
The demo runs ONE worker (no parallel nondeterminism):

    uvicorn main:app --port 8000 --workers 1

(Do NOT add --reload to any demo command.)
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

# Package root is src/solver/ (contracts.py + solver/ live here). Add it to sys.path the
# same way console.py does, so `from contracts import ...` / `from solver import solve`
# resolve whether uvicorn is launched from this dir or elsewhere.
_PKG_ROOT = Path(__file__).resolve().parent
if str(_PKG_ROOT) not in sys.path:
    sys.path.insert(0, str(_PKG_ROOT))

from fastapi import FastAPI  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from contracts import SolveRequest  # noqa: E402
from solver import solve  # noqa: E402

logger = logging.getLogger("forge_mix.service")

app = FastAPI(title="FORGE-MIX solver", version="1.0.0")


# ── the ONE endpoint (04 §S4 / 05 §S3) ──────────────────────────────────────
# Typing the body as the SolveRequest discriminated union makes FastAPI/Pydantic validate
# AND dispatch on `mode` for free: a malformed body never reaches the solver (-> 422). The
# handler is a pure function of `request`; the proven solve() is called verbatim.
#
# We serialize the result via `model_dump()` and return it through JSONResponse rather than a
# `response_model=` filter: the wire bytes are then the SAME canonical bytes the byte-goldens
# assert (the tests compare `solve(...).model_dump()`), with no FastAPI re-validation through
# the SolveResponse union in between (team-lead ruling, BUILD_STATE Phase 2 tweak — determinism).
@app.post("/solve")
def post_solve(request: SolveRequest) -> JSONResponse:
    return JSONResponse(content=solve(request).model_dump())


# ── single-port static serving (05 §S4) ─────────────────────────────────────
# Mount the built frontend export LAST, as a catch-all at "/", so the /solve route above is
# never shadowed. The demo collapses to one origin/one process: FastAPI serves the static
# export at "/" and answers /solve on the same port (no CORS, no proxy).
#
# If out/ doesn't exist yet (frontend-eng rebuilds it in parallel), the app must still import
# and serve /solve cleanly — guard the mount and log a warning instead of crashing import.
_FRONTEND_OUT = _PKG_ROOT.parent / "frontend" / "out"
if _FRONTEND_OUT.is_dir():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_OUT), html=True), name="frontend")
else:
    logger.warning(
        "frontend export not found at %s — serving /solve only; "
        "build the frontend export to enable single-port static serving (05 §S4).",
        _FRONTEND_OUT,
    )
