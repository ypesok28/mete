"use client";

// SITUATION (left pane) — the operator's levers. A single continuous form: sections are
// separated by hairlines (divide-y), never wrapped in their own bordered cards, so the rail
// reads as one surface. Primary levers (mission presets, the convoy budget) are prominent;
// secondary detail (node kit, tier-spec table) is progressively disclosed. Every change calls
// back up so the page re-solves — the data path is UNCHANGED from the functional build.

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Plus, Star, X } from "lucide-react";
import type {
  Budget,
  Node,
  Tier,
  Target,
  RepairItem,
  MaterialClass,
} from "@contract";
import type { Preset } from "@/lib/data";
import { NumberField, ToggleField, CellInput, ColumnHeader, HelpTip } from "@/components/Field";
import { SOURCE_TAGS } from "@/lib/data";
import {
  COMPONENT_CATALOG,
  TIER_BOM,
  maxBuildable,
  blockingComponents,
  componentLabel,
  type Inventory,
} from "@/lib/components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// High-value-target marker — a small filled star (NOT a text badge that collides with the target's
// id) whose tooltip defines the term in plain language. Shown when a target's priority value is at
// the HVT tier (10), so a glance reads "this one matters most" and a hover explains what HVT means.
function HvtMark({ value }: { value: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="grid size-3.5 shrink-0 cursor-default place-items-center text-gate"
          aria-label="High-value target"
        >
          <Star className="size-3 fill-current" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[17rem] text-pretty text-[12px] leading-relaxed">
        High-value target (HVT) — priority {value} pts. The solver covers these first, before
        lower-value contacts.
      </TooltipContent>
    </Tooltip>
  );
}

interface SituationZoneProps {
  mode: "build" | "repair";
  presets: Preset[];
  activePresetId: string | null;
  onSelectPreset: (id: string) => void;

  budget: Budget;
  onBudgetChange: (next: Budget) => void;

  depositionRate: number;
  onDepositionRateChange: (next: number) => void;

  node: Node;
  onNodeChange: (next: Node) => void;

  targets: Target[];
  onTargetsChange: (next: Target[]) => void;
  tiers: Tier[];
  onTiersChange: (next: Tier[]) => void;

  inventory: Inventory;
  onInventoryChange: (next: Inventory) => void;

  items: RepairItem[];
  onItemsChange: (next: RepairItem[]) => void;
}

const CF: MaterialClass = "CF_NYLON";

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h3 className="text-[12px] font-semibold tracking-tight text-ink">{children}</h3>
      {hint ? (
        <span className="mono text-[9px] uppercase tracking-tag text-ink-faint">{hint}</span>
      ) : null}
    </div>
  );
}

// A borderless section block. The rail's `divide-y` draws the only separators, so sections
// stack into one continuous form instead of a pile of cards.
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`px-4 py-4 ${className}`}>{children}</section>;
}

// A collapsible disclosure for secondary levers — also borderless; it's just another row in
// the continuous form, opened by a full-width header button.
function Disclosure({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-base"
      >
        <span className="mono text-[10px] font-semibold uppercase tracking-label text-ink-mute">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {hint ? (
            <span className="mono text-[10px] tracking-tag text-ink-soft">{hint}</span>
          ) : null}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            className="text-ink-mute"
          >
            <ChevronDown className="size-3.5" />
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

// COMPONENTS — the modular kit model. Declare how many of each component are in stock, and see
// each airframe's bill-of-materials + how many it can build from current stock. Stock derives
// the per-tier components_on_hand wire gate upstream (in page.tsx), keeping the contract frozen.
function ComponentsSection({
  inventory,
  onInventoryChange,
  tiers,
}: {
  inventory: Inventory;
  onInventoryChange: (next: Inventory) => void;
  tiers: Tier[];
}) {
  const setCount = (id: string, n: number) => onInventoryChange({ ...inventory, [id]: n });
  return (
    <Disclosure title="Components" hint="modular kits" defaultOpen>
      <div className="flex flex-col gap-4">
        {/* IN STOCK — editable counts per component */}
        <div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
            In stock
            <HelpTip text="How many of each modular component you have on hand. Each airframe is assembled from a kit of these — you can only build a tier while its components last." />
          </span>
          <div className="mt-2 flex flex-col gap-1.5">
            {COMPONENT_CATALOG.map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_5rem] items-center gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-soft">
                  <span className="truncate">{c.label}</span>
                  <HelpTip text={c.help} />
                </span>
                <CellInput
                  value={inventory[c.id] ?? 0}
                  min={0}
                  ariaLabel={c.label}
                  onChange={(v) => setCount(c.id, v)}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-line-soft" />

        {/* PER-AIRFRAME KIT — bill of materials + how many each tier can build */}
        <div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
            Per-airframe kit
            <HelpTip text="The components each airframe type consumes. 'Builds ×N' is how many you can assemble from current stock; a red part is out of stock and blocks that tier." />
          </span>
          <div className="mt-2 flex flex-col gap-2">
            {tiers.map((t) => {
              const bom = TIER_BOM[t.id] ?? {};
              const buildable = maxBuildable(inventory, t.id);
              return (
                <div key={t.id} className="rounded-lg bg-surface-2 p-2.5 ring-1 ring-line">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-ink">{t.name}</span>
                    {buildable >= 1 ? (
                      <span className="mono text-[10px] font-semibold text-covered">
                        builds ×{buildable}
                      </span>
                    ) : (
                      <span className="mono text-[10px] font-semibold text-alert">blocked</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(bom).map(([cid, n]) => {
                      const short = (inventory[cid] ?? 0) < n;
                      return (
                        <span
                          key={cid}
                          className={`mono rounded px-1.5 py-0.5 text-[9px] ${
                            short ? "bg-alert-wash text-alert" : "bg-base text-ink-mute"
                          }`}
                        >
                          {n}× {componentLabel(cid)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Disclosure>
  );
}

export function SituationZone(props: SituationZoneProps) {
  const {
    mode,
    presets,
    activePresetId,
    onSelectPreset,
    budget,
    onBudgetChange,
    depositionRate,
    onDepositionRateChange,
    node,
    onNodeChange,
    targets,
    onTargetsChange,
    tiers,
    onTiersChange,
    inventory,
    onInventoryChange,
    items,
    onItemsChange,
  } = props;

  const buildPresets = presets.filter((p) => p.mode === "build");

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* STATIC header — always visible, anchors the pane and makes it obvious THIS is where you
          edit inputs (mission, targets, budget). Everything here re-solves live. */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3">
        <span className="text-[13px] font-semibold tracking-tight text-ink">Controls</span>
        <span className="mono text-[9px] uppercase tracking-tag text-ink-faint">
          edit · re-solves live
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col divide-y divide-line-soft">

        {/* MISSION SELECTOR — the primary lever (build mode) */}
        {mode === "build" ? (
          <Section>
            <SectionLabel hint={`${buildPresets.length} presets`}>Mission</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {buildPresets.map((p) => {
                const active = activePresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPreset(p.id)}
                    title={p.description}
                    className={`group relative cursor-pointer overflow-hidden rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                      active
                        ? "bg-gate-wash text-gate ring-1 ring-gate/30"
                        : "text-ink hover:-translate-y-px hover:bg-base hover:shadow-card"
                    }`}
                  >
                    {active ? (
                      <span className="absolute inset-y-0 left-0 w-[3px] bg-gate" />
                    ) : null}
                    <span
                      className={`block text-[12.5px] font-semibold tracking-tight ${
                        active ? "text-gate" : "text-ink"
                      }`}
                    >
                      {p.name}
                    </span>
                    <span className="mono mt-1 line-clamp-2 block text-[10px] leading-snug text-ink-mute">
                      {p.targets.length} target{p.targets.length === 1 ? "" : "s"}
                      {p.budget_overrides?.energy_wh != null
                        ? ` · energy ${p.budget_overrides.energy_wh}Wh`
                        : ""}
                      {p.node_overrides?.components_on_hand ? " · kit override" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        ) : null}

        {/* TARGETS EDITOR — build mode (a tuned editable matrix) */}
        {mode === "build" ? (
          <Section>
            <SectionLabel hint="editable">Targets · {targets.length}</SectionLabel>
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[3.1rem_repeat(4,minmax(0,1fr))_1.4rem] items-end gap-1.5 px-0.5 pb-1">
                <span className="mono text-[9px] uppercase tracking-tag text-ink-faint">Target</span>
                <ColumnHeader metaKey="standoff_km" />
                <ColumnHeader metaKey="payload_g" />
                <ColumnHeader metaKey="weather_kt" />
                <ColumnHeader metaKey="value" />
                <span />
              </div>
              {targets.map((t, i) => {
                const hvt = t.value >= 10;
                return (
                  <div
                    key={t.id}
                    className="mono grid grid-cols-[3.1rem_repeat(4,minmax(0,1fr))_1.4rem] items-center gap-1.5"
                  >
                    <span className="flex min-w-0 items-center gap-1 text-[11px] text-ink-soft">
                      <span className="truncate">{t.id}</span>
                      {hvt ? <HvtMark value={t.value} /> : null}
                    </span>
                    <CellInput
                      value={t.standoff_km}
                      ariaLabel={`${t.id} standoff`}
                      onChange={(v) => onTargetsChange(patchAt(targets, i, { standoff_km: v }))}
                    />
                    <CellInput
                      value={t.payload_g}
                      ariaLabel={`${t.id} payload`}
                      onChange={(v) => onTargetsChange(patchAt(targets, i, { payload_g: v }))}
                    />
                    <CellInput
                      value={t.weather_kt}
                      ariaLabel={`${t.id} wind`}
                      onChange={(v) => onTargetsChange(patchAt(targets, i, { weather_kt: v }))}
                    />
                    <CellInput
                      value={t.value}
                      ariaLabel={`${t.id} value`}
                      onChange={(v) => onTargetsChange(patchAt(targets, i, { value: v }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-ink-mute hover:bg-alert/10 hover:text-alert"
                      onClick={() => onTargetsChange(targets.filter((_, j) => j !== i))}
                      aria-label={`remove ${t.id}`}
                    >
                      <X />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mono mt-1 border-dashed text-[10px] uppercase tracking-tag text-ink-soft transition-all hover:-translate-y-px hover:border-gate/60 hover:bg-gate-wash hover:text-gate hover:shadow-card"
                onClick={() => onTargetsChange([...targets, newTarget(targets)])}
              >
                <Plus data-icon="inline-start" />
                add target
              </Button>
            </div>
          </Section>
        ) : null}

        {/* REPAIR ITEMS EDITOR — repair mode */}
        {mode === "repair" ? (
          <Section>
            <SectionLabel hint="editable">Repair items · {items.length}</SectionLabel>
            <div className="flex flex-col gap-2">
              {items.map((it, i) => (
                <div key={it.id} className="rounded-lg bg-base p-2.5" title={it.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-ink">{it.name}</span>
                    {it.safety_critical ? (
                      <Badge
                        variant="destructive"
                        className="mono h-4 shrink-0 px-1.5 text-[8px] font-bold tracking-tag"
                      >
                        safety
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mono text-[9px] tracking-tag text-ink-faint">{it.id}</div>
                  <div className="mt-2 grid grid-cols-[1fr_5.5rem] items-center gap-x-2 gap-y-2 text-[11.5px] text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      Feedstock <span className="text-ink-faint">(g)</span>
                      <HelpTip text="Filament needed to print this repair part, in grams of CF-Nylon." />
                    </span>
                    <CellInput
                      value={it.feedstock_g}
                      ariaLabel={`${it.name} feedstock`}
                      onChange={(v) => onItemsChange(patchAt(items, i, { feedstock_g: v }))}
                    />
                    <span className="flex items-center gap-1.5">
                      Mission value <span className="text-ink-faint">(pts)</span>
                      <HelpTip text="Operational availability this repair restores, in points. The solver prints the highest-value set that fits the budget." />
                    </span>
                    <CellInput
                      value={it.mission_value}
                      ariaLabel={`${it.name} value`}
                      onChange={(v) => onItemsChange(patchAt(items, i, { mission_value: v }))}
                    />
                  </div>
                  <div className="mt-1.5">
                    <ToggleField
                      label="Safety critical"
                      checked={it.safety_critical}
                      onChange={(v) => onItemsChange(patchAt(items, i, { safety_critical: v }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {/* BUDGET — the convoy levers (primary) */}
        <Section>
          <SectionLabel hint="convoy levers">Resources</SectionLabel>
          <div className="flex flex-col">
            <NumberField
              metaKey="budget_feedstock"
              value={budget.feedstock_g[CF] ?? 0}
              tagKey="feedstock_g"
              step={50}
              min={0}
              onChange={(v) =>
                onBudgetChange({
                  ...budget,
                  feedstock_g: { ...budget.feedstock_g, [CF]: v },
                })
              }
            />
            <Separator className="bg-line-soft" />
            <NumberField
              metaKey="budget_printer_hours"
              value={budget.printer_hours}
              step={1}
              min={0}
              onChange={(v) => onBudgetChange({ ...budget, printer_hours: v })}
            />
            <Separator className="bg-line-soft" />
            <NumberField
              metaKey="budget_energy"
              value={budget.energy_wh}
              tagKey="energy_wh"
              step={50}
              min={0}
              onChange={(v) => onBudgetChange({ ...budget, energy_wh: v })}
            />
            <Separator className="bg-line-soft" />
            <NumberField
              metaKey="deposition_rate"
              value={depositionRate}
              tagKey="deposition_rate_g_per_hr"
              step={10}
              min={1}
              onChange={onDepositionRateChange}
            />
          </div>
        </Section>

        {/* NODE — secondary, progressive disclosure */}
        <Disclosure
          title="Node · printer"
          hint={`${node.printer_envelope_mm.x}×${node.printer_envelope_mm.y}×${node.printer_envelope_mm.z}`}
        >
          <div className="mb-3">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-soft">
              Build Envelope
              <HelpTip text="The printer's usable build volume in millimeters (X × Y × Z). An airframe's Max Part Size must fit inside this envelope, or it cannot be printed at this node." />
            </span>
            <div className="mono mt-2 grid grid-cols-3 gap-2">
              {(["x", "y", "z"] as const).map((axis) => (
                <label key={axis} className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-tag text-ink-faint">
                    {axis} · mm
                  </span>
                  <CellInput
                    value={node.printer_envelope_mm[axis]}
                    ariaLabel={`envelope ${axis}`}
                    onChange={(v) =>
                      onNodeChange({
                        ...node,
                        printer_envelope_mm: {
                          ...node.printer_envelope_mm,
                          [axis]: v,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </Disclosure>

        {/* COMPONENTS — quantified modular inventory + per-tier bill of materials (build mode) */}
        {mode === "build" ? (
          <ComponentsSection
            inventory={inventory}
            onInventoryChange={onInventoryChange}
            tiers={tiers}
          />
        ) : null}

        {/* TIER SPEC TABLE — secondary, progressive disclosure (build mode) */}
        {mode === "build" ? (
          <Disclosure title="Tier spec table" hint={`${tiers.length} tiers`}>
            <div className="flex flex-col gap-2.5">
              {tiers.map((tier, i) => (
                <div key={tier.id} className="rounded-lg bg-base p-2.5">
                  <div className="mb-1.5 text-[12px] font-semibold text-ink">{tier.name}</div>
                  <div className="flex flex-col">
                    {(
                      [
                        ["feedstock_g", "tier_feedstock", "feedstock_g", 50],
                        ["energy_wh", "tier_energy", "energy_wh", 10],
                        ["payload_cap_g", "payload_cap_g", "payload_cap_g", 25],
                        ["range_km", "range_km", "range_km", 5],
                        ["wind_kt", "wind_kt", "wind_kt", 1],
                        ["envelope_max_mm", "envelope_max_mm", undefined, 10],
                      ] as const
                    ).map(([key, metaKey, tagKey, step], idx) => (
                      <div key={key}>
                        {idx > 0 ? <Separator className="bg-line-soft" /> : null}
                        <NumberField
                          metaKey={metaKey}
                          value={tier[key] as number}
                          tagKey={tagKey}
                          step={step}
                          min={0}
                          onChange={(v) =>
                            onTiersChange(patchAt(tiers, i, { [key]: v } as Partial<Tier>))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Disclosure>
        ) : null}

        {/* honesty footer — the screen-level "not an oracle" message */}
        <div className="px-4 py-4">
          <p className="mono rounded-lg bg-base px-3 py-2.5 text-[9.5px] leading-relaxed text-ink-mute">
            {SOURCE_TAGS.screen_message}
          </p>
        </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ── small pure helpers ──────────────────────────────────────────────
function patchAt<T>(arr: T[], index: number, patch: Partial<T>): T[] {
  return arr.map((el, i) => (i === index ? { ...el, ...patch } : el));
}

function newTarget(existing: Target[]): Target {
  let n = existing.length + 1;
  const ids = new Set(existing.map((t) => t.id));
  while (ids.has(`T${n}`)) n += 1;
  return { id: `T${n}`, standoff_km: 3, payload_g: 90, weather_kt: 10, value: 1 };
}
