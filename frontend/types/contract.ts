// FORGE-MIX wire contract — the ONE definition of the solver request/response shapes,
// mirrored 1:1 (snake_case) with src/solver/contracts.py and planning/04_contracts.md.
// Snake_case is intentional: the TS shapes match the wire with no mapping layer, no drift.

// ── enums ──────────────────────────────────────────────────────────
export type MaterialClass = "CF_NYLON" | "PLA" | "PETG"; // demo uses CF_NYLON
export type Mode = "build" | "repair";

// the single headline reason for the answer's shape (precedence rule, 04 §S4)
export type BindingReason =
  | "FEEDSTOCK" | "HOURS" | "ENERGY"          // a budget limited coverage / feasibility
  | "RANGE" | "PAYLOAD" | "WIND"              // an exclusion gate forced the chosen tier
  | "MATERIAL" | "ENVELOPE" | "COMPONENTS"    // a hard node gate blocked the build
  | "MISSION_COVERED";                        // fully covered, budget to spare

// why a specific tier can't service a specific target (per-tier hover text)
export type ExclusionReason =
  | "RANGE" | "PAYLOAD" | "WIND" | "MATERIAL" | "ENVELOPE" | "COMPONENTS";

// ── shared objects ─────────────────────────────────────────────────
export interface Budget {
  feedstock_g: Partial<Record<MaterialClass, number>>; // a class present & >0 = "on hand"
  printer_hours: number;
  energy_wh: number;
}
export interface PrinterEnvelopeMm { x: number; y: number; z: number; }
export interface Node {
  printer_envelope_mm: PrinterEnvelopeMm;
  components_on_hand: Record<string, boolean>; // keyed by tier_id / item_id — binary kit gate
}
export interface SolveRequestBase {
  mode: Mode;
  budget: Budget;
  node: Node;
  deposition_rate_g_per_hr: number; // global editable rate; hours = feedstock_g ÷ rate (D4)
}
export interface SolveResponseBase {
  feasible: boolean;          // false ⇒ CANNOT BUILD
  headline: string;
  binding_reason: BindingReason;
  budget_total: Budget;       // echo of request budget
  budget_used: Budget;        // consumed by the chosen build
}

// ── BUILD — request + response (04 §S2) ────────────────────────────
export interface Tier {
  id: string;                 // "SCOUT_S" | "ISR_M" | "STRIKE_L"
  name: string;
  role: string;
  material_class: MaterialClass;
  feedstock_g: number;        // printed structural mass            [SEEDED]
  energy_wh: number;          //                                    [SEEDED·CITED]
  payload_cap_g: number;
  range_km: number;
  wind_kt: number;
  envelope_max_mm: number;    // largest single printed dimension   [SEEDED]
  mtow_g: number;             // reference/display only
}
export interface Target {
  id: string;
  standoff_km: number;
  payload_g: number;
  weather_kt: number;
  value: number;              // priority — soft = 1, HVT = 10      [SEEDED]
}
export interface BuildRequest extends SolveRequestBase {
  mode: "build";
  tiers: Tier[];
  targets: Target[];
}
export interface UnitCost { feedstock_g: number; printer_hours: number; energy_wh: number; }
export interface TierStatus {
  tier_id: string;
  built: number;                       // n_t
  derived_hours: number;               // feedstock_g ÷ deposition_rate (solver-computed)
  unit_cost: UnitCost;
  eligible_target_ids: string[];       // targets this tier could service (all gates pass)
  exclusion_reasons: ExclusionReason[];// distinct gates excluding it (hover text)
}
export interface TargetStatus {
  target_id: string;
  covered: boolean;
  assigned_tier_id: string | null;     // the tier servicing it, or null if uncovered
}
export interface BuildResult extends SolveResponseBase {
  builds: Record<string, number>;      // tier_id → n_t  (drives the icon row)
  coverage: { covered: number; total: number };   // k / M
  covered_value: number;
  tier_status: TierStatus[];
  target_status: TargetStatus[];       // per-target assignment (the heterogeneous heart)
}

// ── REPAIR — request + response (04 §S3) ───────────────────────────
export interface RepairItem {
  id: string;                 // NSN format, e.g. "5340-01-234-5678"  [SEEDED: NSN format]
  name: string;
  material_class: MaterialClass;
  feedstock_g: number;
  energy_wh: number;
  envelope_max_mm: number;
  mission_value: number;      // operational-availability restored
  safety_critical: boolean;   // true ⇒ cant_print_safety regardless of budget
}
export interface RepairRequest extends SolveRequestBase {
  mode: "repair";
  items: RepairItem[];
}
export interface RepairResult extends SolveResponseBase {
  buckets: {
    print_now: string[];          // selected: maximize Σ mission_value s.t. budget + gates
    cant_print_safety: string[];  // safety_critical or failing a hard gate
    defer: string[];              // eligible but not selected (budget)
  };
  selected_value: number;
}

// ── the wire envelope — discriminated on `mode` (04 §S4) ────────────
export type SolveRequest = BuildRequest | RepairRequest;   // discriminated on `mode`
export type SolveResponse = BuildResult | RepairResult;
// Endpoint: POST /solve  (Content-Type: application/json) → SolveResponse
