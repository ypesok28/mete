"use client";

// READ-OUT (right pane) — the evidence. One continuous surface: sections separated by hairlines
// (divide-y), not wrapped in their own cards. Tier status, per-target assignment, and budget
// bars are parseable in one sweep.
//  - per-tier status: built (accent-lit) vs eligible vs excluded (greyed + a CANNOT-BUILD-HERE
//    stamp from exclusion_reasons), with derived hours + per-unit cost as clean figures.
//  - the per-target assignment grid: each target wears its assigned airframe icon; uncovered
//    targets read hollow/dim. The heterogeneous proof lives here.
//  - budget bars: rounded; the limiting one highlighted; on a CANNOT-BUILD verdict the binding
//    budget shows the SHORTFALL — a "needed" tick sitting past the available fill.

import { motion } from "framer-motion";
import type { SolveResponse, BuildResult, MaterialClass } from "@contract";
import { AirframeIcon, TIER_SIZE } from "@/components/AirframeIcon";
import { isBuildResult } from "@/lib/guards";
import { reasonTheme } from "@/lib/reasonTheme";
import { fmt } from "@/lib/insight";
import { ScrollArea } from "@/components/ui/scroll-area";

const CF: MaterialClass = "CF_NYLON";
const EASE = [0.22, 0.61, 0.36, 1] as const;

interface ReadoutZoneProps {
  response: SolveResponse;
  bindingReason: SolveResponse["binding_reason"];
}

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

// A borderless section block — the rail's `divide-y` draws the only separators.
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`px-4 py-4 ${className}`}>{children}</section>;
}

export function ReadoutZone({ response, bindingReason }: ReadoutZoneProps) {
  const theme = reasonTheme(bindingReason, response.feasible);
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* STATIC header — anchors the evidence pane; never scrolls away. */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3">
        <span className="text-[13px] font-semibold tracking-tight text-ink">Read-out</span>
        <span className="mono text-[9px] uppercase tracking-tag text-ink-faint">evidence</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex min-h-full flex-col divide-y divide-line-soft">
          {isBuildResult(response) ? (
            <BuildReadout result={response} accentHex={theme.hex} />
          ) : (
            <RepairReadout />
          )}

          <BudgetBars response={response} accentHex={theme.hex} />
        </div>
      </ScrollArea>
    </div>
  );
}

function BuildReadout({ result, accentHex }: { result: BuildResult; accentHex: string }) {
  return (
    <>
      {/* TIER STATUS */}
      <Section>
        <SectionLabel hint={`${result.tier_status.length} tiers`}>Tier status</SectionLabel>
        <div className="flex flex-col gap-2">
          {result.tier_status.map((ts) => {
            const excluded = ts.exclusion_reasons.length > 0 && ts.built === 0;
            const built = ts.built > 0;
            const gated = ts.exclusion_reasons.length > 0 && ts.built > 0;
            return (
              <motion.div
                key={ts.tier_id}
                data-excluded={excluded}
                layout
                animate={{ opacity: excluded ? 0.55 : 1 }}
                transition={{ duration: 0.26, ease: EASE }}
                className="relative overflow-hidden rounded-lg bg-base px-3 py-2.5 transition-colors"
                style={
                  built
                    ? {
                        backgroundColor: `${accentHex}12`,
                        boxShadow: `inset 0 0 0 1px ${accentHex}3a, 0 6px 16px -12px ${accentHex}66`,
                      }
                    : undefined
                }
              >
                {built ? (
                  <span
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{ background: accentHex }}
                  />
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="flex items-center gap-2 text-[12.5px] font-semibold"
                    style={built ? { color: accentHex } : { color: "#48433B" }}
                  >
                    <span
                      className="grid size-5 shrink-0 place-items-center"
                      style={{ color: built ? accentHex : "#ACA498" }}
                    >
                      <AirframeIcon tierId={ts.tier_id} size={20} solid={false} />
                    </span>
                    {ts.tier_id.replace(/_/g, "-")}
                  </span>
                  <span
                    className="mono rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={
                      built
                        ? { color: accentHex, background: `${accentHex}22` }
                        : excluded
                          ? { color: "#AD4528", background: "rgba(173,69,40,0.12)" }
                          : { color: "#857D72", background: "rgba(133,125,114,0.12)" }
                    }
                  >
                    {built ? `×${ts.built}` : excluded ? "EXCL" : "—"}
                  </span>
                </div>
                <div className="mono mt-1.5 flex items-center gap-2.5 text-[10px] text-ink-mute">
                  <Spec label="h" value={ts.derived_hours} />
                  <span className="text-ink-faint">·</span>
                  <Spec label="g" value={ts.unit_cost.feedstock_g} />
                  <span className="text-ink-faint">·</span>
                  <Spec label="Wh" value={ts.unit_cost.energy_wh} />
                </div>
                {excluded ? (
                  <div className="mono mt-2 inline-flex items-center gap-1.5 rounded-md bg-alert-wash px-2 py-1 text-[9.5px] uppercase tracking-tag text-alert ring-1 ring-alert/20">
                    cannot-build-here · {ts.exclusion_reasons.join(", ")}
                  </div>
                ) : gated ? (
                  <div className="mono mt-2 text-[10px] uppercase tracking-tag text-ink-mute">
                    eligible {ts.eligible_target_ids.length} · gated{" "}
                    {ts.exclusion_reasons.join(", ")}
                  </div>
                ) : (
                  <div className="mono mt-2 text-[10px] uppercase tracking-tag text-ink-mute">
                    eligible {ts.eligible_target_ids.length}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* PER-TARGET ASSIGNMENT — the heterogeneous heart */}
      <Section>
        <SectionLabel hint="per target">Assignment</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {result.target_status.map((tgt) => {
            const covered = tgt.covered && tgt.assigned_tier_id;
            return (
              <motion.div
                key={tgt.target_id}
                data-covered={tgt.covered}
                layout
                animate={{ opacity: covered ? 1 : 0.72 }}
                transition={{ duration: 0.26, ease: EASE }}
                title={
                  covered
                    ? `${tgt.target_id} → ${tgt.assigned_tier_id}`
                    : `${tgt.target_id} · uncovered`
                }
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg ${
                  covered ? "bg-base" : "border border-dashed border-ink-faint bg-transparent"
                }`}
                style={covered ? { boxShadow: `inset 0 0 0 1px ${accentHex}33` } : undefined}
              >
                {covered && tgt.assigned_tier_id ? (
                  <span style={{ color: accentHex }}>
                    <AirframeIcon
                      tierId={tgt.assigned_tier_id}
                      solid={false}
                      size={Math.min(30, (TIER_SIZE[tgt.assigned_tier_id] ?? 30) * 0.4 + 16)}
                    />
                  </span>
                ) : (
                  <span className="inline-block size-3.5 rounded-full border border-ink-faint" />
                )}
                <span className="mono text-[9px] tracking-tag text-ink-soft">{tgt.target_id}</span>
              </motion.div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

// Repair mode has no per-tier / per-target read-out (the engine triages items, not airframes),
// so the right rail carries a compact "how triage works" evidence card instead of a barren column.
function RepairReadout() {
  const legend: { tone: string; label: string; note: string }[] = [
    { tone: "#3C7551", label: "Print now", note: "selected — max value within budget + gates" },
    { tone: "#AD4528", label: "Safety hold", note: "safety-critical or a hard gate fails" },
    { tone: "#857D72", label: "Defer", note: "eligible, but budget bound it out" },
  ];
  return (
    <Section>
      <SectionLabel hint="how triage sorts">Buckets</SectionLabel>
      <div className="flex flex-col gap-2.5">
        {legend.map((l) => (
          <div key={l.label} className="flex items-start gap-2.5">
            <span
              className="mt-[3px] size-2.5 shrink-0 rounded-full"
              style={{ background: l.tone }}
            />
            <div className="min-w-0">
              <span
                className="mono text-[11px] font-semibold uppercase tracking-tag"
                style={{ color: l.tone }}
              >
                {l.label}
              </span>
              <p className="text-[11.5px] leading-snug text-ink-mute">{l.note}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Spec({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-ink-soft">
      {value}
      <span className="text-ink-faint">{label}</span>
    </span>
  );
}

// ── Budget bars (+ shortfall) ────────────────────────────────────────
function BudgetBars({ response, accentHex }: { response: SolveResponse; accentHex: string }) {
  const used = response.budget_used;
  const total = response.budget_total;
  const bindingReason = response.binding_reason;
  const shortfall = computeShortfall(response, bindingReason);

  const rows: BudgetRow[] = [
    {
      label: "feedstock",
      unit: "g",
      used: used.feedstock_g[CF] ?? 0,
      total: total.feedstock_g[CF] ?? 0,
      binds: bindingReason === "FEEDSTOCK",
      need: bindingReason === "FEEDSTOCK" ? shortfall : null,
    },
    {
      label: "hours",
      unit: "h",
      used: used.printer_hours,
      total: total.printer_hours,
      binds: bindingReason === "HOURS",
      need: bindingReason === "HOURS" ? shortfall : null,
    },
    {
      label: "energy",
      unit: "Wh",
      used: used.energy_wh,
      total: total.energy_wh,
      binds: bindingReason === "ENERGY",
      need: bindingReason === "ENERGY" ? shortfall : null,
    },
  ];

  return (
    <Section className="mt-auto">
      <SectionLabel hint="used / total">Budget</SectionLabel>
      <div className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <Bar key={r.label} row={r} accentHex={accentHex} />
        ))}
      </div>
    </Section>
  );
}

interface BudgetRow {
  label: string;
  unit: string;
  used: number;
  total: number;
  binds: boolean;
  need: number | null;
}

function Bar({ row, accentHex }: { row: BudgetRow; accentHex: string }) {
  const scaleMax = Math.max(row.total, row.used, row.need ?? 0, 1);
  const usedPct = (Math.min(row.used, scaleMax) / scaleMax) * 100;
  const availPct = (Math.min(row.total, scaleMax) / scaleMax) * 100;
  const needPct = row.need != null ? (row.need / scaleMax) * 100 : null;
  const binds = row.binds;
  const showShortfall = needPct != null && needPct > availPct;

  return (
    <div data-binds={binds}>
      <div className="mono flex items-baseline justify-between text-[10.5px]">
        <span className="flex items-center gap-1.5">
          <span
            className={binds ? "uppercase tracking-tag" : "text-ink-soft"}
            style={binds ? { color: accentHex } : undefined}
          >
            {row.label}
          </span>
          {binds ? (
            <span
              className="rounded-[4px] px-1 py-[1px] text-[8px] font-bold uppercase tracking-tag"
              style={{ color: accentHex, background: `${accentHex}1f` }}
            >
              binding
            </span>
          ) : null}
        </span>
        <span className="text-ink-mute">
          <span style={binds ? { color: accentHex } : { color: "#48433B" }}>{fmt(row.used)}</span>
          {" / "}
          {fmt(row.total)}
          <span className="text-ink-faint">{row.unit}</span>
        </span>
      </div>

      <div className="relative mt-1.5 h-2.5 w-full overflow-visible rounded-full bg-base shadow-[inset_0_0_0_1px_rgba(28,26,23,0.05)]">
        {/* available "envelope" track */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${availPct}%`, backgroundColor: "#DCD7CE" }}
        />
        {/* consumed fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={false}
          animate={{ width: `${usedPct}%` }}
          transition={{ duration: 0.32, ease: EASE }}
          style={{ backgroundColor: binds ? accentHex : "#A8A194" }}
        />
        {/* shortfall "needed" tick */}
        {showShortfall ? (
          <div
            className="absolute inset-y-[-3px] w-[2px] rounded-full"
            style={{ left: `calc(${needPct}% - 1px)`, backgroundColor: accentHex }}
            title={`needed ${row.need}${row.unit}`}
          />
        ) : null}
      </div>

      {showShortfall ? (
        <div className="mono mt-1.5 text-[9.5px] uppercase tracking-tag text-alert">
          needed {fmt(row.need ?? 0)}
          {row.unit} · short {fmt((row.need ?? 0) - row.total)}
          {row.unit}
        </div>
      ) : null}
    </div>
  );
}

function computeShortfall(
  response: SolveResponse,
  bindingReason: SolveResponse["binding_reason"]
): number | null {
  if (response.feasible) return null;
  if (!isBuildResult(response)) return null;
  if (bindingReason !== "ENERGY" && bindingReason !== "HOURS" && bindingReason !== "FEEDSTOCK") {
    return null;
  }
  const capable = response.tier_status.filter((ts) => ts.eligible_target_ids.length > 0);
  if (capable.length === 0) return null;
  const dim = (ts: (typeof capable)[number]): number =>
    bindingReason === "ENERGY"
      ? ts.unit_cost.energy_wh
      : bindingReason === "HOURS"
        ? ts.unit_cost.printer_hours
        : ts.unit_cost.feedstock_g;
  return capable.reduce((min, ts) => Math.min(min, dim(ts)), Infinity);
}
