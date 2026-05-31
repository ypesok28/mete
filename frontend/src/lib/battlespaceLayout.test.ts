import { describe, it, expect } from "vitest";
import type { BuildResult, BindingReason, Target, Tier, TierStatus } from "@contract";
import {
  angleForTarget,
  sizeForValue,
  bandIndexForStandoff,
  ringRadiusForBand,
  bearingsForTargets,
  classifyUncoveredCause,
  layoutBattlespace,
} from "@/lib/battlespaceLayout";

const tier = (
  id: string,
  range_km: number,
  opts: { payload_cap_g?: number; wind_kt?: number } = {},
): Tier => ({
  id, name: id, role: "x", material_class: "CF_NYLON",
  feedstock_g: 100, energy_wh: 100,
  payload_cap_g: opts.payload_cap_g ?? 500,
  range_km,
  wind_kt: opts.wind_kt ?? 20,
  envelope_max_mm: 300, mtow_g: 1000,
});
const target = (
  id: string,
  standoff_km: number,
  value: number,
  opts: { payload_g?: number; weather_kt?: number } = {},
): Target => ({
  id, standoff_km, payload_g: opts.payload_g ?? 100, weather_kt: opts.weather_kt ?? 10, value,
});

function tierStatus(tier_id: string, eligible_target_ids: string[]): TierStatus {
  return {
    tier_id, built: 0, derived_hours: 0,
    unit_cost: { feedstock_g: 0, printer_hours: 0, energy_wh: 0 },
    eligible_target_ids, exclusion_reasons: [],
  };
}

function buildResult(
  statuses: { target_id: string; covered: boolean; assigned_tier_id: string | null }[],
  opts: { binding_reason?: BindingReason; tier_status?: TierStatus[] } = {},
): BuildResult {
  return {
    feasible: true, headline: "BUILD",
    binding_reason: opts.binding_reason ?? "MISSION_COVERED",
    budget_total: { feedstock_g: {}, printer_hours: 0, energy_wh: 0 },
    budget_used: { feedstock_g: {}, printer_hours: 0, energy_wh: 0 },
    builds: {}, coverage: { covered: 0, total: statuses.length }, covered_value: 0,
    tier_status: opts.tier_status ?? [],
    target_status: statuses.map((s) => ({ ...s })),
  };
}

// SCOUT 5 / ISR 30 / STRIKE 120 — the real demo spread (24×).
const TIERS = [tier("SCOUT_S", 5), tier("ISR_M", 30), tier("STRIKE_L", 120)];

describe("angleForTarget", () => {
  it("is deterministic for the same id", () => {
    expect(angleForTarget("T-1")).toBe(angleForTarget("T-1"));
  });
  it("returns a value in [0, 2π)", () => {
    const a = angleForTarget("T-42");
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(Math.PI * 2);
  });
  it("differs for different ids", () => {
    expect(angleForTarget("T-1")).not.toBe(angleForTarget("T-2"));
  });
});

describe("sizeForValue", () => {
  it("grows with value (HVT larger than soft)", () => {
    expect(sizeForValue(10)).toBeGreaterThan(sizeForValue(1));
  });
});

describe("bandIndexForStandoff", () => {
  it("returns the smallest band whose range covers the standoff (inclusive)", () => {
    expect(bandIndexForStandoff(3, TIERS)).toBe(0); // within SCOUT 5
    expect(bandIndexForStandoff(5, TIERS)).toBe(0); // inclusive at the boundary
    expect(bandIndexForStandoff(6, TIERS)).toBe(1); // past SCOUT → ISR
    expect(bandIndexForStandoff(30, TIERS)).toBe(1);
    expect(bandIndexForStandoff(120, TIERS)).toBe(2);
  });
  it("returns bands.length when beyond every tier's reach", () => {
    expect(bandIndexForStandoff(200, TIERS)).toBe(3);
  });
});

describe("ringRadiusForBand", () => {
  it("spaces rings evenly regardless of km spread", () => {
    expect(ringRadiusForBand(1) - ringRadiusForBand(0)).toBeCloseTo(
      ringRadiusForBand(2) - ringRadiusForBand(1),
      5,
    );
  });
});

describe("bearingsForTargets", () => {
  it("returns one bearing per id, each in [0, 2π)", () => {
    const ts = [target("A", 3, 1), target("B", 3, 1), target("C", 40, 1)];
    const out = bearingsForTargets(ts, TIERS);
    expect(out.size).toBe(3);
    for (const a of out.values()) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(Math.PI * 2);
    }
  });
  it("is deterministic for the same id list", () => {
    const ts = [target("A", 3, 1), target("B", 3, 1)];
    const a = bearingsForTargets(ts, TIERS);
    const b = bearingsForTargets(ts, TIERS);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
  it("fans same-band targets evenly apart so none coincide", () => {
    const ids = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const ts = ids.map((id) => target(id, 3, 1)); // all in the SCOUT band
    const out = bearingsForTargets(ts, TIERS);
    const angles = [...out.values()].sort((x, y) => x - y);
    expect(new Set(angles).size).toBe(8); // all distinct
    let minGap = Infinity;
    for (let i = 1; i < angles.length; i += 1) minGap = Math.min(minGap, angles[i] - angles[i - 1]);
    expect(minGap).toBeGreaterThan(0.5); // ≈ 2π/8 ≈ 0.785
  });
});

describe("classifyUncoveredCause", () => {
  it("returns null for a covered target", () => {
    const t = target("T-1", 3, 1);
    const res = buildResult([{ target_id: "T-1", covered: true, assigned_tier_id: "SCOUT_S" }]);
    expect(classifyUncoveredCause(t, TIERS, res)).toBeNull();
  });
  it("RANGE when every tier's range is below the standoff", () => {
    const t = target("T-far", 200, 10);
    const res = buildResult([{ target_id: "T-far", covered: false, assigned_tier_id: null }]);
    expect(classifyUncoveredCause(t, TIERS, res)).toBe("RANGE");
  });
  it("PAYLOAD when in range but every tier's capacity is below the payload", () => {
    const t = target("T-heavy", 3, 10, { payload_g: 9999 });
    const res = buildResult([{ target_id: "T-heavy", covered: false, assigned_tier_id: null }]);
    expect(classifyUncoveredCause(t, TIERS, res)).toBe("PAYLOAD");
  });
  it("WIND when range and payload fit but every tier's wind tolerance is below the weather", () => {
    const t = target("T-windy", 3, 10, { weather_kt: 99 });
    const res = buildResult([{ target_id: "T-windy", covered: false, assigned_tier_id: null }]);
    expect(classifyUncoveredCause(t, TIERS, res)).toBe("WIND");
  });
  it("uses the budget binding_reason when a tier lists the target eligible but it's uncovered", () => {
    const t = target("T-soft", 3, 1);
    const res = buildResult(
      [{ target_id: "T-soft", covered: false, assigned_tier_id: null }],
      { binding_reason: "FEEDSTOCK", tier_status: [tierStatus("SCOUT_S", ["T-soft"])] },
    );
    expect(classifyUncoveredCause(t, TIERS, res)).toBe("FEEDSTOCK");
  });
  it("returns null when eligible but the binding_reason isn't a budget dimension", () => {
    const t = target("T-soft", 3, 1);
    const res = buildResult(
      [{ target_id: "T-soft", covered: false, assigned_tier_id: null }],
      { binding_reason: "MISSION_COVERED", tier_status: [tierStatus("SCOUT_S", ["T-soft"])] },
    );
    expect(classifyUncoveredCause(t, TIERS, res)).toBeNull();
  });
});

describe("layoutBattlespace", () => {
  const targets = [target("T-1", 20, 10), target("T-2", 40, 1)];
  const tiers = [tier("SCOUT_S", 30), tier("STRIKE_L", 80)];

  it("places every target and keeps positions stable across calls", () => {
    const a = layoutBattlespace(buildResult([
      { target_id: "T-1", covered: true, assigned_tier_id: "SCOUT_S" },
      { target_id: "T-2", covered: false, assigned_tier_id: null },
    ]), targets, tiers);
    const b = layoutBattlespace(buildResult([
      { target_id: "T-1", covered: false, assigned_tier_id: null },
      { target_id: "T-2", covered: false, assigned_tier_id: null },
    ]), targets, tiers);
    expect(a.targets).toHaveLength(2);
    expect(a.targets[0].position).toEqual(b.targets[0].position);
  });

  it("derives covered/assignment from target_status", () => {
    const out = layoutBattlespace(buildResult([
      { target_id: "T-1", covered: true, assigned_tier_id: "SCOUT_S" },
      { target_id: "T-2", covered: false, assigned_tier_id: null },
    ]), targets, tiers);
    const t1 = out.targets.find((t) => t.targetId === "T-1")!;
    expect(t1.covered).toBe(true);
    expect(t1.assignedTierId).toBe("SCOUT_S");
  });

  it("emits one trail per covered+assigned target, from the forge", () => {
    const out = layoutBattlespace(buildResult([
      { target_id: "T-1", covered: true, assigned_tier_id: "SCOUT_S" },
      { target_id: "T-2", covered: false, assigned_tier_id: null },
    ]), targets, tiers);
    expect(out.trails).toHaveLength(1);
    expect(out.trails[0].from).toEqual([0, 0, 0]);
    expect(out.trails[0].tierId).toBe("SCOUT_S");
  });

  it("emits one labeled range ring per distinct tier range, evenly spaced, sorted ascending", () => {
    const out = layoutBattlespace(buildResult([]), targets, tiers);
    expect(out.rangeRings.map((r) => r.radius)).toEqual([ringRadiusForBand(0), ringRadiusForBand(1)]);
    expect(out.rangeRings[0].rangeKm).toBe(30);
    expect(out.rangeRings[1].rangeKm).toBe(80);
    expect(out.rangeRings[0].label).toContain("30 km");
  });

  it("tags an uncovered out-of-range target with a cause and covered targets with null", () => {
    const ts = [target("T-near", 10, 1), target("T-far", 200, 10)];
    const out = layoutBattlespace(buildResult([
      { target_id: "T-near", covered: true, assigned_tier_id: "SCOUT_S" },
      { target_id: "T-far", covered: false, assigned_tier_id: null },
    ]), ts, tiers);
    expect(out.targets.find((t) => t.targetId === "T-near")!.cause).toBeNull();
    expect(out.targets.find((t) => t.targetId === "T-far")!.cause).toBe("RANGE");
  });

  it("gives every target a label and distinct positions when they share a band", () => {
    const ts = [target("A", 3, 1), target("B", 3, 1), target("C", 3, 1)];
    const out = layoutBattlespace(buildResult([]), ts, tiers);
    expect(out.targets.every((t) => t.label === t.targetId)).toBe(true);
    const keys = out.targets.map((t) => `${t.position[0].toFixed(4)},${t.position[2].toFixed(4)}`);
    expect(new Set(keys).size).toBe(3);
  });
});
