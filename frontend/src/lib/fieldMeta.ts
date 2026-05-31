// Field metadata registry (presentation-only). ONE place that gives every editable control a
// full, unabbreviated name, a unit, and a plain-language explanation — so an operator who has
// never heard "payload" or "deposition rate" can learn what it is and what a number means.
//
// Keyed by a CONTEXT-specific key (not the raw wire field) because the same wire field means
// different things in different sections — e.g. `feedstock_g` is "filament in stock" in the
// Budget but "printed mass per airframe" on a Tier. Source-tag provenance stays separate
// (data.ts sourceTag), keyed by the raw wire field.

export interface FieldMeta {
  label: string; // full, Title Case name — never an abbreviation
  unit?: string; // the measure (km, g, kt, Wh, g/hr, mm, pts)
  sub?: string; // optional qualifier shown faintly (e.g. material class)
  help: string; // plain-language: what it is + how it drives the answer
}

export const FIELD_META: Record<string, FieldMeta> = {
  // ── Targets (what the mission must service) ──
  standoff_km: {
    label: "Standoff",
    unit: "km",
    help: "How far the target sits from the launch node, in kilometers. An airframe can service it only if its Range is at least this far.",
  },
  payload_g: {
    label: "Payload",
    unit: "g",
    help: "How much mass must be carried to this target — sensor, relay, or warhead — in grams. An airframe qualifies only if its Payload Capacity meets or beats this.",
  },
  weather_kt: {
    label: "Wind",
    unit: "kt",
    help: "Wind speed over the target, in knots (1 kt ≈ 1.15 mph). An airframe can fly the mission only if its Wind Rating is at least this high.",
  },
  value: {
    label: "Value",
    unit: "pts",
    help: "Priority of covering this target, in points. A soft contact is 1; a high-value target (HVT) is 10. The solver maximizes total Value covered within the budget.",
  },

  // ── Budget (the scarce resources tonight) ──
  budget_feedstock: {
    label: "Feedstock",
    unit: "g",
    sub: "CF-Nylon",
    help: "Printer filament in stock, in grams of CF-Nylon. Every airframe consumes feedstock to print; when it runs out you cannot build more — this is often the binding limit.",
  },
  budget_printer_hours: {
    label: "Printer Hours",
    unit: "h",
    help: "Total printer run-time available tonight, in hours. Each airframe's print time is its feedstock divided by the deposition rate.",
  },
  budget_energy: {
    label: "Energy",
    unit: "Wh",
    help: "Energy available at the node in watt-hours (e.g. a convoy genset or battery bank). Each airframe draws energy to print and operate; rationed energy can make a build impossible.",
  },
  deposition_rate: {
    label: "Deposition Rate",
    unit: "g/hr",
    help: "How fast the printer lays down material, in grams per hour. A faster rate means each airframe prints in fewer hours. Printer hours used = grams ÷ this rate.",
  },

  // ── Tier spec (one airframe type's stats) ──
  tier_feedstock: {
    label: "Feedstock / Unit",
    unit: "g",
    help: "Printed structural mass of a single airframe of this type, in grams. Drives both its feedstock cost and its print-hour cost.",
  },
  tier_energy: {
    label: "Energy / Unit",
    unit: "Wh",
    help: "Energy a single airframe of this type consumes, in watt-hours.",
  },
  payload_cap_g: {
    label: "Payload Capacity",
    unit: "g",
    help: "The heaviest payload this airframe can carry, in grams. Must meet or exceed a target's Payload for the airframe to service it.",
  },
  range_km: {
    label: "Range",
    unit: "km",
    help: "The farthest this airframe can reach, in kilometers. Must meet or exceed a target's Standoff.",
  },
  wind_kt: {
    label: "Wind Rating",
    unit: "kt",
    help: "The strongest wind this airframe can operate in, in knots. Must meet or exceed a target's Wind.",
  },
  envelope_max_mm: {
    label: "Max Part Size",
    unit: "mm",
    help: "The largest single dimension that must be printed for this airframe, in millimeters. Must fit inside the printer's build envelope.",
  },

  // ── Repair item fields ──
  repair_feedstock: {
    label: "Feedstock",
    unit: "g",
    help: "Filament needed to print this repair part, in grams of CF-Nylon.",
  },
  repair_value: {
    label: "Mission Value",
    unit: "pts",
    help: "Operational availability this repair restores, in points. The solver prints the highest-value set that fits the budget.",
  },
};

// Printer-envelope axis help (shared by X / Y / Z).
export function envelopeAxisMeta(axis: "x" | "y" | "z"): FieldMeta {
  return {
    label: axis.toUpperCase(),
    unit: "mm",
    help: `Printer build volume along the ${axis.toUpperCase()} axis, in millimeters. An airframe's Max Part Size must fit within this envelope or it cannot be printed here.`,
  };
}
