// The semantic-color brain. The live binding_reason maps to exactly ONE harmonious hue, and
// that hue is the dominant accent on screen — single-accent discipline. The four reason classes
// each own a real, NON-BLUE color so the console reads warm and intentional, never generic:
//
//   gate    = amber-gold  → an exclusion forced the chosen tier (RANGE/PAYLOAD/WIND…) — the HERO
//   budget  = iris        → a budget is the limiter (FEEDSTOCK / HOURS / ENERGY)
//   covered = emerald     → mission covered, slack to spare / PRINT-NOW
//   alert   = coral       → cannot-build / resupply / safety-hold
//
// Presentation-only — derived entirely from the (frozen) SolveResponse.binding_reason +
// feasible. Touches no seam file.

import type { BindingReason } from "@contract";

export type ReasonClass = "budget" | "gate" | "covered" | "alert";

// Which of the four classes a reason belongs to, given feasibility.
export function reasonClass(reason: BindingReason, feasible: boolean): ReasonClass {
  if (!feasible) return "alert";
  if (reason === "MISSION_COVERED") return "covered";
  if (reason === "FEEDSTOCK" || reason === "HOURS" || reason === "ENERGY") return "budget";
  return "gate";
}

// A coherent bundle of class strings + raw values for a reason class, so any component can drop
// in theme.text / theme.border / theme.glow without re-deriving tokens.
export interface ReasonTheme {
  cls: ReasonClass;
  token: string; // tailwind color token name, e.g. "gate" | "budget"
  text: string; // text-<token>
  border: string; // border-<token>
  bg: string; // faint tinted fill (bg-<token>/10)
  wash: string; // bg-<token>-wash — a deeper tinted surface
  ring: string; // ring-<token>
  shadowGlow: string; // shadow-<token>-glow — the elevated reason glow
  hex: string; // raw foreground hex (SVG fill / inline style)
  dimHex: string; // resting / trace hex
  rgb: string; // "r, g, b" triplet for rgba() (e.g. the scan-sweep CSS var)
}

const HEX: Record<ReasonClass, { fg: string; dim: string; rgb: string }> = {
  gate: { fg: "#9A6312", dim: "#CDBB9C", rgb: "154, 99, 18" },
  budget: { fg: "#475078", dim: "#C4C7D7", rgb: "71, 80, 120" },
  covered: { fg: "#3C7551", dim: "#BCD3C3", rgb: "60, 117, 81" },
  alert: { fg: "#AD4528", dim: "#E7C5B9", rgb: "173, 69, 40" },
};

// Statically-listed Tailwind class strings (so the JIT compiler keeps them). One per class.
const TEXT: Record<ReasonClass, string> = {
  gate: "text-gate",
  budget: "text-budget",
  covered: "text-covered",
  alert: "text-alert",
};
const BORDER: Record<ReasonClass, string> = {
  gate: "border-gate",
  budget: "border-budget",
  covered: "border-covered",
  alert: "border-alert",
};
const BG: Record<ReasonClass, string> = {
  gate: "bg-gate/10",
  budget: "bg-budget/10",
  covered: "bg-covered/10",
  alert: "bg-alert/10",
};
const WASH: Record<ReasonClass, string> = {
  gate: "bg-gate-wash",
  budget: "bg-budget-wash",
  covered: "bg-covered-wash",
  alert: "bg-alert-wash",
};
const RING: Record<ReasonClass, string> = {
  gate: "ring-gate",
  budget: "ring-budget",
  covered: "ring-covered",
  alert: "ring-alert",
};
const SHADOW: Record<ReasonClass, string> = {
  gate: "shadow-gate-glow",
  budget: "shadow-budget-glow",
  covered: "shadow-covered-glow",
  alert: "shadow-alert-glow",
};

export function reasonTheme(reason: BindingReason, feasible: boolean): ReasonTheme {
  const cls = reasonClass(reason, feasible);
  return {
    cls,
    token: cls,
    text: TEXT[cls],
    border: BORDER[cls],
    bg: BG[cls],
    wash: WASH[cls],
    ring: RING[cls],
    shadowGlow: SHADOW[cls],
    hex: HEX[cls].fg,
    dimHex: HEX[cls].dim,
    rgb: HEX[cls].rgb,
  };
}

// Human "why" text per reason (the badge subline). Single source of truth for the copy.
export const REASON_TEXT: Record<BindingReason, string> = {
  FEEDSTOCK: "no filament for another airframe",
  HOURS: "printer hours are the limiter",
  ENERGY: "convoy fuel rationed — energy is the limiter",
  RANGE: "range gate forced the chosen tier",
  PAYLOAD: "payload gate forced the chosen tier",
  WIND: "wind gate forced the chosen tier",
  MATERIAL: "required material not on hand",
  ENVELOPE: "build exceeds the printer envelope",
  COMPONENTS: "parts-kit unavailable",
  MISSION_COVERED: "fully covered — budget to spare",
};
