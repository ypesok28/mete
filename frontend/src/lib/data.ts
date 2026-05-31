// Data layer (05 §S1): the seeded catalog the frontend imports to seed its forms and
// demo presets. Read once at module load. No live feed, no fetch-on-load — all bundled.
//
// These JSON files are copies of the read-only catalog in data/ and the read-only
// fixtures in solver/tests/fixtures/. They are imported (resolveJsonModule) so the
// static export bundles them — nothing is fetched at runtime.

import type {
  Budget,
  Node,
  Tier,
  Target,
  RepairItem,
  Mode,
  SolveResponse,
} from "@contract";

import presetsJson from "@/data/presets.json";
import tiersJson from "@/data/tiers.json";
import sourceTagsJson from "@/data/source_tags.json";
import repairCatalogJson from "@/data/repair_catalog.json";

import swarmFixture from "@/data/fixtures/swarm.json";
import deepFixture from "@/data/fixtures/deep.json";
import mixedFixture from "@/data/fixtures/mixed.json";
import escalationBFixture from "@/data/fixtures/escalation_b.json";
import rerouteFixture from "@/data/fixtures/reroute.json";
import repairFixture from "@/data/fixtures/repair.json";

// ── frontend-only shapes (NOT wire contract) ───────────────────────

// A mission preset (data/presets.json) — drives the mission selector.
export interface Preset {
  id: string;
  name: string;
  mode: Mode;
  description: string;
  targets: Target[];
  budget_overrides?: Partial<Pick<Budget, "printer_hours" | "energy_wh">> & {
    feedstock_g?: Budget["feedstock_g"];
  };
  node_overrides?: {
    components_on_hand?: Record<string, boolean>;
    // frontend-only: override component STOCK counts (drives the derived components_on_hand gate)
    inventory_overrides?: Record<string, number>;
    printer_envelope_mm?: Node["printer_envelope_mm"];
  };
}

// The default editable scaffold (data/tiers.json).
export interface TierScaffold {
  deposition_rate_g_per_hr: number;
  default_budget: Budget;
  default_node: Node;
  tiers: Tier[];
}

// A source tag (data/source_tags.json) — the per-field honesty hover.
export interface SourceTag {
  tag: string;
  citation: string;
}
export interface SourceTags {
  tags: Record<string, SourceTag>;
  screen_message: string;
}

// A fixture record: {name, request, expected_response}.
export interface Fixture {
  name: string;
  description: string;
  request: unknown; // matched structurally by the mock; the contract type lives on the response
  expected_response: SolveResponse;
}

// ── typed exports of the bundled catalog ────────────────────────────

const presetsData = presetsJson as { presets: Preset[] };
export const PRESETS: Preset[] = presetsData.presets;

export const SCAFFOLD: TierScaffold = tiersJson as unknown as TierScaffold;

export const SOURCE_TAGS: SourceTags = sourceTagsJson as SourceTags;

const repairCatalogData = repairCatalogJson as { items: RepairItem[] };
export const REPAIR_CATALOG: RepairItem[] = repairCatalogData.items;

// All six fixtures, in demo order. Used by the mock solve client.
export const FIXTURES: Fixture[] = [
  swarmFixture as unknown as Fixture,
  deepFixture as unknown as Fixture,
  mixedFixture as unknown as Fixture,
  escalationBFixture as unknown as Fixture,
  rerouteFixture as unknown as Fixture,
  repairFixture as unknown as Fixture,
];

// Convenience: look up a source tag for a field key (returns undefined if untagged).
export function sourceTag(field: string): SourceTag | undefined {
  return SOURCE_TAGS.tags[field];
}
