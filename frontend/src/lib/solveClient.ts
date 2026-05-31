// The typed solve client — the ONE seam to the solver (05 §S1).
//
//   async function solve(req: SolveRequest): Promise<SolveResponse>
//
// MOCK mode (current): composes nothing extra — it takes the request the UI built and
// returns the matching fixture's expected_response (matched by request signature). For an
// edit with no exact fixture match it returns the closest fixture's response wrapped in a
// clearly-labeled "mock: no matching fixture" state — the point is that the WIRING is real.
//
// LIVE mode (Phase 3 swap): flip USE_MOCK to false and the same call becomes a real
// fetch('/solve', …). Nothing else in the app changes — every caller already awaits solve().

import type {
  SolveRequest,
  SolveResponse,
  BuildRequest,
  RepairRequest,
} from "@contract";
import { FIXTURES, type Fixture } from "@/lib/data";

// ── the single live/mock flag — the whole Phase-3 swap lives here ───
// LIVE (redesign, frontend-linear, 2026-05-30): flipped to false to match the production
// frontend. `solve()` now hits the real FastAPI `/solve` (same-origin under single-port;
// rewritten →:8000 under `next dev`, see next.config.ts). Flip back to `true` ONLY to demo
// the mock offline without the solver process — note: mock can only return one of the 6
// seeded fixtures, so arbitrary input edits snap to the closest fixture and APPEAR frozen.
export const USE_MOCK = false;

// What the mock returns: the response plus provenance so the UI can show a
// "mock: no matching fixture" banner when an edit has no seeded fixture.
export interface SolveOutcome {
  response: SolveResponse;
  // null when an exact fixture matched; otherwise the name of the closest fixture used.
  mockFallbackFrom: string | null;
  matchedFixture: string | null;
}

// ── request signature — structural, order-independent ──────────────
// A stable string built from the fields that determine the answer, so an edited request
// that recreates a fixture exactly maps back to that fixture's response.

function budgetSignature(req: SolveRequest): string {
  const fs = req.budget.feedstock_g;
  const classes = Object.keys(fs).sort();
  const fsStr = classes.map((c) => `${c}:${fs[c as keyof typeof fs]}`).join(",");
  return `fs[${fsStr}]|h:${req.budget.printer_hours}|e:${req.budget.energy_wh}`;
}

function nodeSignature(req: SolveRequest): string {
  const env = req.node.printer_envelope_mm;
  const comp = req.node.components_on_hand;
  const compStr = Object.keys(comp)
    .sort()
    .map((k) => `${k}:${comp[k] ? 1 : 0}`)
    .join(",");
  return `env:${env.x}x${env.y}x${env.z}|comp[${compStr}]`;
}

function buildBodySignature(req: BuildRequest): string {
  const targets = req.targets
    .map(
      (t) =>
        `${t.standoff_km}/${t.payload_g}/${t.weather_kt}/${t.value}`
    )
    .sort()
    .join(";");
  const tiers = req.tiers
    .map(
      (t) =>
        `${t.id}:${t.material_class}/${t.feedstock_g}/${t.energy_wh}/${t.payload_cap_g}/${t.range_km}/${t.wind_kt}/${t.envelope_max_mm}`
    )
    .sort()
    .join(";");
  return `targets[${targets}]|tiers[${tiers}]`;
}

function repairBodySignature(req: RepairRequest): string {
  const items = req.items
    .map(
      (i) =>
        `${i.id}:${i.material_class}/${i.feedstock_g}/${i.energy_wh}/${i.envelope_max_mm}/${i.mission_value}/${i.safety_critical ? 1 : 0}`
    )
    .sort()
    .join(";");
  return `items[${items}]`;
}

function requestSignature(req: SolveRequest): string {
  const head = `mode:${req.mode}|rate:${req.deposition_rate_g_per_hr}|${budgetSignature(req)}|${nodeSignature(req)}`;
  if (req.mode === "build") {
    return `${head}|${buildBodySignature(req as BuildRequest)}`;
  }
  return `${head}|${repairBodySignature(req as RepairRequest)}`;
}

// Cheap structural distance between two signatures, used only for "closest fixture"
// fallback so an unseeded edit still renders something honest rather than crashing.
function signatureDistance(a: string, b: string): number {
  if (a === b) return 0;
  const at = new Set(a.split(/[|;,\]]/));
  const bt = new Set(b.split(/[|;,\]]/));
  let shared = 0;
  for (const tok of at) if (bt.has(tok)) shared += 1;
  const union = new Set([...at, ...bt]).size;
  return 1 - shared / union; // 0 = identical token sets, 1 = disjoint
}

// ── the mock resolver ───────────────────────────────────────────────
function resolveMock(req: SolveRequest): SolveOutcome {
  const reqSig = requestSignature(req);

  // Only compare against fixtures of the same mode.
  const candidates: Fixture[] = FIXTURES.filter(
    (f) => (f.request as { mode: string }).mode === req.mode
  );

  // Exact match first.
  for (const f of candidates) {
    if (requestSignature(f.request as SolveRequest) === reqSig) {
      return {
        response: f.expected_response,
        mockFallbackFrom: null,
        matchedFixture: f.name,
      };
    }
  }

  // No exact match — return the closest fixture's response, labeled.
  let best: Fixture | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const f of candidates) {
    const d = signatureDistance(requestSignature(f.request as SolveRequest), reqSig);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  if (!best) {
    // No same-mode fixture at all — degenerate; fall back to the first fixture.
    best = FIXTURES[0];
  }
  return {
    response: best.expected_response,
    mockFallbackFrom: best.name,
    matchedFixture: null,
  };
}

// ── the public seam ─────────────────────────────────────────────────

// Low-level: returns SolveResponse only (the live-swap-compatible signature).
export async function solve(req: SolveRequest): Promise<SolveResponse> {
  if (USE_MOCK) {
    return resolveMock(req).response;
  }
  const res = await fetch("/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`/solve returned ${res.status}`);
  }
  return (await res.json()) as SolveResponse;
}

// UI-facing: returns the response plus mock provenance so the screen can show a
// "mock: no matching fixture (closest: X)" badge during arbitrary edits. In LIVE mode
// the provenance is always "matched" — the real solver always answers the exact request.
export async function solveWithProvenance(
  req: SolveRequest
): Promise<SolveOutcome> {
  if (USE_MOCK) {
    return resolveMock(req);
  }
  const response = await solve(req);
  return { response, mockFallbackFrom: null, matchedFixture: "live" };
}
