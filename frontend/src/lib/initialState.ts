// Builds the initial editable state from the seeded scaffold + presets, and applies a
// preset's overrides onto the default budget/node. Pure helpers — no React, no math.

import type { Budget, Node, Target } from "@contract";
import { SCAFFOLD, type Preset } from "@/lib/data";

// Deep-ish clones so editing UI state never mutates the imported JSON modules.
export function defaultBudget(): Budget {
  const b = SCAFFOLD.default_budget;
  return {
    feedstock_g: { ...b.feedstock_g },
    printer_hours: b.printer_hours,
    energy_wh: b.energy_wh,
  };
}

export function defaultNode(): Node {
  const n = SCAFFOLD.default_node;
  return {
    printer_envelope_mm: { ...n.printer_envelope_mm },
    components_on_hand: { ...n.components_on_hand },
  };
}

// REPAIR mode has no per-tier component gating (repair items aren't keyed by tier), so its
// node carries an empty components_on_hand — matching the repair fixture's request shape.
export function defaultRepairNode(): Node {
  const n = SCAFFOLD.default_node;
  return {
    printer_envelope_mm: { ...n.printer_envelope_mm },
    components_on_hand: {},
  };
}

export function cloneTargets(targets: Target[]): Target[] {
  return targets.map((t) => ({ ...t }));
}

// Applies a preset's overrides onto fresh defaults — returns the budget/node/targets a
// preset selection should load. (Tiers and deposition rate stay at scaffold defaults.)
export function applyPreset(preset: Preset): {
  budget: Budget;
  node: Node;
  targets: Target[];
} {
  const budget = defaultBudget();
  if (preset.budget_overrides) {
    if (preset.budget_overrides.feedstock_g) {
      budget.feedstock_g = { ...preset.budget_overrides.feedstock_g };
    }
    if (preset.budget_overrides.printer_hours !== undefined) {
      budget.printer_hours = preset.budget_overrides.printer_hours;
    }
    if (preset.budget_overrides.energy_wh !== undefined) {
      budget.energy_wh = preset.budget_overrides.energy_wh;
    }
  }

  const node = defaultNode();
  if (preset.node_overrides) {
    if (preset.node_overrides.printer_envelope_mm) {
      node.printer_envelope_mm = { ...preset.node_overrides.printer_envelope_mm };
    }
    if (preset.node_overrides.components_on_hand) {
      node.components_on_hand = {
        ...node.components_on_hand,
        ...preset.node_overrides.components_on_hand,
      };
    }
  }

  return { budget, node, targets: cloneTargets(preset.targets) };
}
