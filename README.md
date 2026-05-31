# METE

**Mission-driven build optimizer for distributed manufacturing under constraint.**

METE turns a mission objective and a fixed pool of resources — feedstock, printer hours, energy,
on-hand components — into a provably optimal build/repair plan. The solver is a deterministic
constraint program (OR-Tools CP-SAT); the console is a static Next.js app that visualizes the
plan and its trade-offs. The whole thing runs **offline on a single port** with no live feeds.

---

## Repository layout

```
.
├── frontend/        Next.js console + landing page (static export, TypeScript)
├── solver/          FastAPI service wrapping the OR-Tools CP-SAT solver (Python)
├── data/            Canonical seed catalog — tiers, presets, repair catalog, source tags
└── README.md
```

- **`frontend/`** — App Router UI. Statically exported (`output: "export"`) so it can be served
  by any static host, including the solver itself in the single-port demo.
- **`solver/`** — A thin, additive HTTP wrap around a frozen, pure `solve()` function. The
  Pydantic request models *are* the wire contract: a malformed request fails with `422` at the
  boundary and never reaches the solver. The handler is a pure function of the request — no
  clock, no randomness, no disk — which is what makes results reproducible.
- **`data/`** — The read-only source catalog. The frontend bundles its own copy under
  `frontend/src/data/`; the solver receives all inputs in the request body.

---

## Running it

### Solver (Python)

```bash
cd solver
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --workers 1   # single worker = deterministic
```

Exposes `POST /solve`. Do **not** add `--reload` — it breaks determinism guarantees.

### Frontend (Node / Next.js)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000 — proxies /solve → localhost:8000 in dev
```

### Single-port offline demo

Build the static export, then let the solver serve it on one origin (no CORS, no proxy):

```bash
cd frontend && npm run build          # emits frontend/out/
cd ../solver && uvicorn main:app --port 8000 --workers 1
# open http://localhost:8000  — UI at /, solver at /solve, same port
```

---

## Tests

```bash
cd solver && pytest            # solver math + contract validation
cd frontend && npm test        # vitest
```

---

## Stack

- **Frontend:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · React Three Fiber
- **Solver:** Python · FastAPI · Pydantic v2 · OR-Tools CP-SAT · uvicorn
