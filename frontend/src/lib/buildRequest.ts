// Composes a wire SolveRequest from the current editable UI state (05 §S1: the frontend
// builds the request; the solver owns all math). One builder per mode; the screen calls the
// right one based on the active tab, then hands the result to solve().

import type {
  BuildRequest,
  RepairRequest,
  Budget,
  Node,
  Tier,
  Target,
  RepairItem,
} from "@contract";

// The editable left-rail state shared by both modes.
export interface CommonInputs {
  budget: Budget;
  node: Node;
  deposition_rate_g_per_hr: number;
}

export interface BuildInputs extends CommonInputs {
  tiers: Tier[];
  targets: Target[];
}

export interface RepairInputs extends CommonInputs {
  items: RepairItem[];
}

export function buildBuildRequest(inputs: BuildInputs): BuildRequest {
  return {
    mode: "build",
    budget: inputs.budget,
    node: inputs.node,
    deposition_rate_g_per_hr: inputs.deposition_rate_g_per_hr,
    tiers: inputs.tiers,
    targets: inputs.targets,
  };
}

export function buildRepairRequest(inputs: RepairInputs): RepairRequest {
  return {
    mode: "repair",
    budget: inputs.budget,
    node: inputs.node,
    deposition_rate_g_per_hr: inputs.deposition_rate_g_per_hr,
    items: inputs.items,
  };
}
