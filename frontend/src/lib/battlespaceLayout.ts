// PURE mapping from a SolveResponse to geometry-ready data. No three.js, no React, no GPU.
// This is the unit-tested heart: deterministic, reproducible, and the only place the "where
// does each thing go / what does it mean" logic lives. Renderer components consume the output
// and stay dumb.
import type { BuildResult, BindingReason, Target, Tier } from "@contract";

type Vec3 = [number, number, number];

// FNV-1a string hash → stable per-string seed (bearings, ordering). Never teleports between solves.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Stable per-id bearing in [0, 2π). Kept as the within-band ordering seed and a fallback.
export function angleForTarget(id: string): number {
  return ((hashString(id) % 36000) / 36000) * Math.PI * 2;
}

// Marker size ∝ target value [1,10] → icosahedron radius [0.26, 0.62].
export function sizeForValue(value: number): number {
  const v = Math.max(1, Math.min(10, value));
  return 0.22 + (v / 10) * 0.4;
}

// ── REACHABILITY BANDS ─────────────────────────────────────────────────────────────────────
// Real tier ranges span 5–120 km (a 24× spread) — no linear scale renders that legibly (the inner
// ring collapses onto the forge, the outer ring leaves frame). So rings are EVENLY spaced, one per
// distinct tier range, and km lives on the ring LABEL. A target sits just inside the ring of the
// smallest tier whose range covers its standoff; beyond every tier's reach → an outer zone. Thus
// "inside ring N ⇒ tier N reaches it" is true by construction, and the picture answers the operator's
// real question: which airframe can reach this target?
const RING_BASE = 2.4; // radius of the innermost (shortest-range) tier ring
const RING_STEP = 2.4; // uniform gap between consecutive tier rings
const BAND_INSET = 0.55; // how far inside its ring a target sits (so it reads "within range")
const BEYOND_GAP = 2.4; // radius past the outermost ring for unreachable targets

export function ringRadiusForBand(i: number): number {
  return RING_BASE + i * RING_STEP;
}

// Distinct tier ranges ascending, each with a representative tier (for ring label + id).
interface RangeBand {
  rangeKm: number;
  tier: Tier;
}
function rangeBands(tiers: Tier[]): RangeBand[] {
  const byRange = new Map<number, Tier>();
  for (const t of tiers) {
    if (!byRange.has(t.range_km)) byRange.set(t.range_km, t);
  }
  return [...byRange.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rangeKm, tier]) => ({ rangeKm, tier }));
}

// Index of the smallest band whose range covers `standoffKm` (inclusive), or `bands.length`
// to mean "beyond every tier's reach".
export function bandIndexForStandoff(standoffKm: number, tiers: Tier[]): number {
  const bands = rangeBands(tiers);
  for (let i = 0; i < bands.length; i += 1) {
    if (bands[i].rangeKm >= standoffKm) return i;
  }
  return bands.length;
}

function radiusForBand(bandIndex: number, bandCount: number): number {
  if (bandIndex >= bandCount) return ringRadiusForBand(Math.max(0, bandCount - 1)) + BEYOND_GAP;
  return ringRadiusForBand(bandIndex) - BAND_INSET;
}

// Per-band even fan: targets that land in the same band spread evenly around the circle instead of
// stacking (the old single-id hash let identical-standoff targets collide into a blob). Deterministic
// and stable — depends only on the id set and tiers, so coverage flips on re-solve never move a target.
export function bearingsForTargets(targets: Target[], tiers: Tier[]): Map<string, number> {
  const bands = rangeBands(tiers);
  const byBand = new Map<number, string[]>();
  for (const t of targets) {
    const b = bandIndexForStandoff(t.standoff_km, tiers);
    const arr = byBand.get(b) ?? [];
    arr.push(t.id);
    byBand.set(b, arr);
  }

  const out = new Map<string, number>();
  for (const [band, ids] of byBand) {
    const ordered = [...ids].sort(
      (a, b) => hashString(a) - hashString(b) || (a < b ? -1 : a > b ? 1 : 0),
    );
    const key = band >= bands.length ? "BEYOND" : bands[band].tier.id;
    const phase = (hashString(key) % 360) * (Math.PI / 180);
    const k = ordered.length;
    ordered.forEach((id, j) => {
      out.set(id, (phase + (j / k) * Math.PI * 2) % (Math.PI * 2));
    });
  }
  return out;
}

// ── WHY IS A TARGET UNCOVERED? ─────────────────────────────────────────────────────────────
// One short token per uncovered target. If no tier lists it eligible, it's GATE-blocked — pick the
// failing axis against the dominating (max-on-every-gate) tier, precedence RANGE → PAYLOAD → WIND.
// If some tier could service it but it's still uncovered, it's BUDGET-limited — use the solve-level
// binding_reason. Covered targets (and edges with no clean token) return null.
export type UncoveredCause = "RANGE" | "PAYLOAD" | "WIND" | "ENERGY" | "FEEDSTOCK" | "HOURS";

const BUDGET_REASONS: ReadonlySet<BindingReason> = new Set<BindingReason>([
  "ENERGY",
  "FEEDSTOCK",
  "HOURS",
]);

export function classifyUncoveredCause(
  target: Target,
  tiers: Tier[],
  result: BuildResult,
): UncoveredCause | null {
  const status = result.target_status.find((s) => s.target_id === target.id);
  if (status?.covered) return null;

  const eligibleSomewhere = result.tier_status.some((ts) =>
    ts.eligible_target_ids.includes(target.id),
  );
  if (eligibleSomewhere) {
    return BUDGET_REASONS.has(result.binding_reason)
      ? (result.binding_reason as UncoveredCause)
      : null;
  }

  if (tiers.length === 0) return null;
  const maxRange = Math.max(...tiers.map((t) => t.range_km));
  const maxCap = Math.max(...tiers.map((t) => t.payload_cap_g));
  const maxWind = Math.max(...tiers.map((t) => t.wind_kt));
  if (target.standoff_km > maxRange) return "RANGE";
  if (target.payload_g > maxCap) return "PAYLOAD";
  if (target.weather_kt > maxWind) return "WIND";
  return null; // serviceable on every axis yet listed by no tier — defensive, no honest token
}

// ── LAYOUT SHAPES ──────────────────────────────────────────────────────────────────────────
export interface TargetLayout {
  targetId: string;
  position: Vec3;
  covered: boolean;
  assignedTierId: string | null;
  size: number;
  value: number;
  cause: UncoveredCause | null; // null when covered
  label: string; // short id, e.g. "T-1"
}
export interface TrailLayout {
  targetId: string;
  from: Vec3;
  to: Vec3;
  tierId: string;
}
export interface RangeRing {
  radius: number; // world units (shared scale with target placement)
  rangeKm: number; // source km, for the label
  tierId: string; // representative tier owning this ring
  label: string; // e.g. "STRIKE-L · 120 km"
}
export interface BattlespaceLayout {
  forge: Vec3;
  targets: TargetLayout[];
  rangeRings: RangeRing[];
  trails: TrailLayout[];
}

export function layoutBattlespace(
  result: BuildResult,
  targets: Target[],
  tiers: Tier[],
): BattlespaceLayout {
  const forge: Vec3 = [0, 0, 0];
  const bands = rangeBands(tiers);
  const n = bands.length;
  const statusById = new Map(result.target_status.map((s) => [s.target_id, s]));
  const bearings = bearingsForTargets(targets, tiers);

  const targetLayouts: TargetLayout[] = targets.map((t) => {
    const band = bandIndexForStandoff(t.standoff_km, tiers);
    const radius = radiusForBand(band, n);
    const angle = bearings.get(t.id) ?? angleForTarget(t.id);
    const status = statusById.get(t.id);
    return {
      targetId: t.id,
      position: [radius * Math.cos(angle), 0, radius * Math.sin(angle)],
      covered: status?.covered ?? false,
      assignedTierId: status?.assigned_tier_id ?? null,
      size: sizeForValue(t.value),
      value: t.value,
      cause: classifyUncoveredCause(t, tiers, result),
      label: t.id,
    };
  });

  const trails: TrailLayout[] = targetLayouts
    .filter((t) => t.covered && t.assignedTierId)
    .map((t) => ({ targetId: t.targetId, from: forge, to: t.position, tierId: t.assignedTierId as string }));

  const rangeRings: RangeRing[] = bands.map((b, i) => ({
    radius: ringRadiusForBand(i),
    rangeKm: b.rangeKm,
    tierId: b.tier.id,
    label: `${b.tier.name} · ${b.rangeKm} km`,
  }));

  return { forge, targets: targetLayouts, rangeRings, trails };
}
