// Frontend-only modular-components model (task 5). FORGE-MIX builds are modular: each airframe
// tier is assembled from a kit of printed + COTS components. This module lets the operator say
// HOW MANY of each component are in stock, and attributes to each tier the bill-of-materials it
// requires — so "do we have the parts?" becomes a real, quantified question.
//
// IMPORTANT (frozen wire seam): the contract carries only `node.components_on_hand`, a per-tier
// BOOLEAN gate. This richer inventory lives entirely on the frontend and DERIVES those booleans
// (a tier is "on hand" iff stock covers its full kit), so the solver / mock / fixtures are
// unchanged and every demo beat still matches.

export interface ComponentDef {
  id: string;
  label: string; // full plural name
  help: string;
}

// The component catalog. Tier-specific airframe frames keep the tiers independent (so an
// out-of-stock SCOUT frame doesn't also block the fixed-wing tiers).
export const COMPONENT_CATALOG: ComponentDef[] = [
  { id: "scout_frame", label: "Scout frames", help: "Printed micro-quad airframe shell — the SCOUT-S body. Each SCOUT-S consumes one." },
  { id: "isr_frame", label: "ISR frames", help: "Printed fixed-wing airframe shell — the ISR-M body. Each ISR-M consumes one." },
  { id: "strike_frame", label: "Strike frames", help: "Printed heavy fixed-wing airframe shell — the STRIKE-L body. Each STRIKE-L consumes one." },
  { id: "camera", label: "Cameras", help: "EO/IR sensor payload, used by the recon tiers (SCOUT-S and ISR-M)." },
  { id: "gps", label: "GPS / nav units", help: "Navigation modules for the longer-range tiers (ISR-M and STRIKE-L)." },
  { id: "flight_controller", label: "Flight controllers", help: "Autopilot board — every airframe needs exactly one." },
  { id: "motor", label: "Motors", help: "Brushless propulsion motors. The quad SCOUT-S needs four; the fixed-wing tiers need one each." },
  { id: "propeller", label: "Propellers", help: "Props paired to the motors — same count as motors per airframe." },
  { id: "battery", label: "Batteries", help: "LiPo packs. Heavier airframes draw more — STRIKE-L needs two." },
  { id: "warhead", label: "Warheads", help: "Effects payload — required only by the one-way STRIKE-L." },
];

// Per-tier bill of materials: components consumed to assemble ONE airframe of each tier.
export const TIER_BOM: Record<string, Record<string, number>> = {
  SCOUT_S: { scout_frame: 1, camera: 1, flight_controller: 1, motor: 4, propeller: 4, battery: 1 },
  ISR_M: { isr_frame: 1, camera: 1, gps: 1, flight_controller: 1, motor: 1, propeller: 1, battery: 1 },
  STRIKE_L: { strike_frame: 1, gps: 1, flight_controller: 1, motor: 1, propeller: 1, battery: 2, warhead: 1 },
};

export type Inventory = Record<string, number>;

// Default stock — enough to build every tier (so the default gate is all-true, matching the
// seeded fixtures). REROUTE zeroes scout_frame to recreate the "SCOUT kit out" beat.
export const DEFAULT_INVENTORY: Inventory = {
  scout_frame: 8,
  isr_frame: 6,
  strike_frame: 3,
  camera: 10,
  gps: 6,
  flight_controller: 16,
  motor: 32,
  propeller: 32,
  battery: 20,
  warhead: 3,
};

export function cloneInventory(inv: Inventory): Inventory {
  return { ...inv };
}

// Max airframes of a tier the inventory can assemble: min over the kit of floor(stock ÷ need).
export function maxBuildable(inv: Inventory, tierId: string): number {
  const bom = TIER_BOM[tierId];
  if (!bom) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const [cid, need] of Object.entries(bom)) {
    if (need <= 0) continue;
    min = Math.min(min, Math.floor((inv[cid] ?? 0) / need));
  }
  return Number.isFinite(min) ? min : 0;
}

// Components short of even a single unit of the tier (stock < need) — for the "out: …" hint.
export function blockingComponents(inv: Inventory, tierId: string): string[] {
  const bom = TIER_BOM[tierId] ?? {};
  return Object.entries(bom)
    .filter(([cid, need]) => (inv[cid] ?? 0) < need)
    .map(([cid]) => cid);
}

// DERIVES the wire gate: a tier is "on hand" iff the inventory can build at least one of it.
export function deriveComponentsOnHand(inv: Inventory, tierIds: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const id of tierIds) out[id] = maxBuildable(inv, id) >= 1;
  return out;
}

export function componentLabel(id: string): string {
  return COMPONENT_CATALOG.find((c) => c.id === id)?.label ?? id;
}
