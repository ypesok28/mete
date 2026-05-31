"use client";

// METE — the single allocation console (06), redesigned as ONE continuous operations
// workspace. A full-bleed app frame: a top command bar, then three flush working panes —
// Controls · Decision · Read-out — separated only by hairlines (an IDE's tree / editor /
// inspector, not three floating cards). The rails stay STATIC; only the answer animates. Every
// editable input re-runs solve() and re-renders. The DATA PATH is unchanged from the functional
// build (compose request → solveWithProvenance → setResponse): live and mock render the same
// SolveResponse shape. Only presentation changes.
//
// Routing note: this console lives at /console — the marketing landing page owns / (the front
// door). The data seam is unaffected: solveWithProvenance still hits the absolute /solve path.

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Layers, Wrench } from "lucide-react";
import type {
  Budget,
  Node,
  Tier,
  Target,
  RepairItem,
  SolveResponse,
  SolveRequest,
} from "@contract";
import { PRESETS, SCAFFOLD, REPAIR_CATALOG } from "@/lib/data";
import { solveWithProvenance } from "@/lib/solveClient";
import { buildBuildRequest, buildRepairRequest } from "@/lib/buildRequest";
import { applyPreset, defaultBudget, defaultRepairNode } from "@/lib/initialState";
import {
  DEFAULT_INVENTORY,
  cloneInventory,
  deriveComponentsOnHand,
  type Inventory,
} from "@/lib/components";
import { SituationZone } from "@/components/SituationZone";
import { DecisionZone } from "@/components/DecisionZone";
import { ReadoutZone } from "@/components/ReadoutZone";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MeteMarkTile, MeteWordmark } from "@/components/MeteBrand";

type Mode = "build" | "repair";

// Seed from the WIDE-AREA RECON preset (the HERO start state, 03 DEMO-1).
const HERO_PRESET = PRESETS.find((p) => p.id === "WIDE_AREA_RECON") ?? PRESETS[0];

function cloneTiers(): Tier[] {
  return SCAFFOLD.tiers.map((t) => ({ ...t }));
}
function cloneItems(): RepairItem[] {
  return REPAIR_CATALOG.map((i) => ({ ...i }));
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("build");

  // ── BUILD-mode editable state ──
  const heroInit = applyPreset(HERO_PRESET);
  const [activePresetId, setActivePresetId] = useState<string | null>(HERO_PRESET.id);
  const [budget, setBudget] = useState<Budget>(heroInit.budget);
  const [node, setNode] = useState<Node>(heroInit.node);
  const [depositionRate, setDepositionRate] = useState<number>(
    SCAFFOLD.deposition_rate_g_per_hr
  );
  const [tiers, setTiers] = useState<Tier[]>(cloneTiers());
  const [targets, setTargets] = useState<Target[]>(heroInit.targets);
  // Modular-components stock (frontend-only). The per-tier components_on_hand wire gate is
  // DERIVED from this at request time, so the contract/mock stay frozen.
  const [inventory, setInventory] = useState<Inventory>(() => cloneInventory(DEFAULT_INVENTORY));

  // ── REPAIR-mode editable state (independent so the two tabs don't fight) ──
  const [repairBudget, setRepairBudget] = useState<Budget>(defaultBudget());
  const [repairNode, setRepairNode] = useState<Node>(defaultRepairNode());
  const [repairRate, setRepairRate] = useState<number>(SCAFFOLD.deposition_rate_g_per_hr);
  const [items, setItems] = useState<RepairItem[]>(cloneItems());

  // ── solve output ──
  const [response, setResponse] = useState<SolveResponse | null>(null);
  const [mockFallbackFrom, setMockFallbackFrom] = useState<string | null>(null);

  // Compose the wire request from current state for the active mode. (UNCHANGED data path.)
  const request: SolveRequest = useMemo(() => {
    if (mode === "build") {
      // Derive the per-tier components_on_hand gate from the modular inventory (frozen seam).
      const buildNode: Node = {
        printer_envelope_mm: node.printer_envelope_mm,
        components_on_hand: deriveComponentsOnHand(
          inventory,
          tiers.map((t) => t.id)
        ),
      };
      return buildBuildRequest({
        budget,
        node: buildNode,
        deposition_rate_g_per_hr: depositionRate,
        tiers,
        targets,
      });
    }
    return buildRepairRequest({
      budget: repairBudget,
      node: repairNode,
      deposition_rate_g_per_hr: repairRate,
      items,
    });
  }, [
    mode,
    budget,
    node,
    depositionRate,
    tiers,
    targets,
    inventory,
    repairBudget,
    repairNode,
    repairRate,
    items,
  ]);

  // Re-solve on every input/mode change (the core "edit → re-solve → re-render" loop).
  useEffect(() => {
    let cancelled = false;
    solveWithProvenance(request).then((outcome) => {
      if (cancelled) return;
      setResponse(outcome.response);
      setMockFallbackFrom(outcome.mockFallbackFrom);
    });
    return () => {
      cancelled = true;
    };
  }, [request]);

  // Selecting a preset loads its targets + override budget/node (clears manual edits).
  const onSelectPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const init = applyPreset(preset);
    setActivePresetId(id);
    setBudget(init.budget);
    setNode(init.node);
    setTargets(init.targets);
    setDepositionRate(SCAFFOLD.deposition_rate_g_per_hr);
    setTiers(cloneTiers());
    const inv = cloneInventory(DEFAULT_INVENTORY);
    if (preset.node_overrides?.inventory_overrides) {
      Object.assign(inv, preset.node_overrides.inventory_overrides);
    }
    setInventory(inv);
  };

  // Any manual edit drops the "active preset" highlight (state no longer matches the preset).
  const clearPreset = () => setActivePresetId(null);

  const activeBudget = mode === "build" ? budget : repairBudget;
  const activeNode = mode === "build" ? node : repairNode;
  const activeRate = mode === "build" ? depositionRate : repairRate;

  return (
    <TooltipProvider delayDuration={150}>
      {/* ONE app frame — full-bleed, single surface. Everything below shares this background;
          panes are separated by hairlines, never by gaps or their own borders. */}
      <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-surface text-ink">
        {/* TOP COMMAND BAR — brand · mode · node status */}
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3">
          <div className="flex items-center gap-4">
            <BrandMark />
            <span className="hidden h-7 w-px bg-line lg:block" />
            <ModePicker mode={mode} onChange={setMode} />
          </div>

          <div className="flex items-center gap-3">
            {mockFallbackFrom ? (
              <span className="mono hidden rounded-md border border-dashed border-line bg-base px-3 py-1 text-[10px] uppercase tracking-tag text-ink-mute md:inline">
                mock · closest {mockFallbackFrom}
              </span>
            ) : null}
            <NodeStatus node={activeNode} />
          </div>
        </header>

        {/* WORKSPACE — three flush panes, divided by hairlines (one continuous surface). The
            rails sit on white and stay STATIC; the center decision stage is a softly recessed
            well so the answer owns the eye, yet stays connected by the same dividers. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(340px,25rem)_minmax(0,1fr)_minmax(300px,23rem)]">
          <aside className="hidden min-h-0 border-r border-line bg-surface lg:block">
            <SituationZone
              mode={mode}
              presets={PRESETS}
              activePresetId={activePresetId}
              onSelectPreset={onSelectPreset}
              budget={activeBudget}
              onBudgetChange={(b) => {
                clearPreset();
                if (mode === "build") setBudget(b);
                else setRepairBudget(b);
              }}
              depositionRate={activeRate}
              onDepositionRateChange={(r) => {
                clearPreset();
                if (mode === "build") setDepositionRate(r);
                else setRepairRate(r);
              }}
              node={activeNode}
              onNodeChange={(n) => {
                clearPreset();
                if (mode === "build") setNode(n);
                else setRepairNode(n);
              }}
              targets={targets}
              onTargetsChange={(t) => {
                clearPreset();
                setTargets(t);
              }}
              tiers={tiers}
              onTiersChange={(t) => {
                clearPreset();
                setTiers(t);
              }}
              inventory={inventory}
              onInventoryChange={(inv) => {
                clearPreset();
                setInventory(inv);
              }}
              items={items}
              onItemsChange={setItems}
            />
          </aside>

          <section className="min-h-0 bg-canvas">
            {response ? (
              <DecisionZone
                response={response}
                repairItems={items}
                targets={targets}
                tiers={tiers}
              />
            ) : (
              <div className="mono flex h-full items-center justify-center text-xs uppercase tracking-label text-ink-mute">
                solving…
              </div>
            )}
          </section>

          <aside className="hidden min-h-0 border-l border-line bg-surface lg:block">
            {response ? (
              <ReadoutZone response={response} bindingReason={response.binding_reason} />
            ) : null}
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── workspace picker — the Build/Repair switch as an app-style dropdown (NOT a tab strip). The
//    trigger shows the current workspace; clicking opens an animated menu with both options,
//    a one-line description each, and an active check. Hover-lifts; closes on outside-click. ─────
type ModeOpt = { id: Mode; label: string; Icon: typeof Layers; desc: string };
const MODE_OPTS: ModeOpt[] = [
  { id: "build", label: "Build", Icon: Layers, desc: "Allocate airframes to targets" },
  { id: "repair", label: "Repair", Icon: Wrench, desc: "Triage field repairs" },
];

function ModePicker({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODE_OPTS.find((o) => o.id === mode) ?? MODE_OPTS[0];
  const CurrentIcon = current.Icon;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface py-1.5 pl-2.5 pr-2 shadow-card transition-all duration-150 hover:-translate-y-px hover:shadow-pop"
      >
        <span className="grid size-6 place-items-center rounded-md bg-gate-wash text-gate">
          <CurrentIcon className="size-3.5" />
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-ink">{current.label}</span>
        <ChevronDown
          className={`size-4 text-ink-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 origin-top-left overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop"
          >
            {MODE_OPTS.map((o) => {
              const OIcon = o.Icon;
              const active = o.id === mode;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-150 ${
                    active ? "bg-gate-wash" : "hover:bg-base"
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      active ? "bg-gate/15 text-gate" : "bg-base text-ink-mute"
                    }`}
                  >
                    <OIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[13px] font-semibold ${active ? "text-gate" : "text-ink"}`}
                    >
                      {o.label}
                    </span>
                    <span className="block truncate text-[11px] text-ink-mute">{o.desc}</span>
                  </span>
                  {active ? <Check className="size-4 shrink-0 text-gate" /> : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ── brand mark — the locked METE lockup (allocation-bars chip + wordmark), shared with the
//    landing nav/footer via @/components/MeteBrand so the two surfaces never drift. ─────
function BrandMark() {
  return (
    <a href="/" className="flex items-center gap-2.5" aria-label="METE — home">
      <MeteMarkTile />
      <div className="leading-none">
        <MeteWordmark size="text-[16px]" />
        <span className="mt-1 block text-[10px] font-medium tracking-tight text-ink-mute">
          Forward-edge allocation
        </span>
      </div>
    </a>
  );
}

// ── node status — a live presence chip with envelope readout ────────
function NodeStatus({ node }: { node: Node }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-1.5 shadow-card">
      <span className="flex items-center gap-2">
        <span className="pulse-dot relative inline-block size-2 rounded-full bg-covered text-covered" />
        <span className="mono text-[11px] uppercase tracking-tag text-ink-soft">FWD-EDGE-1</span>
      </span>
      <span className="hidden h-3.5 w-px bg-line sm:block" />
      <span className="mono hidden text-[11px] tracking-tag text-ink-mute sm:inline">
        {node.printer_envelope_mm.x}×{node.printer_envelope_mm.y}×{node.printer_envelope_mm.z}
        <span className="text-ink-faint"> mm</span>
      </span>
    </div>
  );
}
