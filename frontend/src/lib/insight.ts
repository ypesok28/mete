// THE BOTTOM-LINE ENGINE (presentation-only). Reads the frozen SolveResponse and answers the
// three questions an operator actually has, in plain language with real numbers:
//
//   1. what's the best build right now?      → buildSummary + coverage
//   2. what is the limiting factor?          → limit  (the constraint that's maxed out)
//   3. what do I change to do better?        → lever  (a concrete, quantified next move)
//
// Everything is DERIVED from the response (binding_reason, coverage, tier unit-costs, budgets) —
// no seam file is touched, the wire contract stays frozen. The numbers come straight from the
// same fields the solver already returns.

import type {
  SolveResponse,
  BuildResult,
  RepairResult,
  BindingReason,
  MaterialClass,
} from "@contract";
import { isBuildResult } from "@/lib/guards";
import { reasonClass, REASON_TEXT, type ReasonClass } from "@/lib/reasonTheme";

const CF: MaterialClass = "CF_NYLON";

// One side of the bottom-line band.
export interface SituationCell {
  kicker: string; // tiny uppercase label ("LIMITED BY" / "TO COVER MORE")
  title: string; // the headline figure / phrase ("Feedstock" / "+280 g")
  detail: string; // a plain-language sentence
  metric?: string; // optional mono figure line ("1,900 / 2,000 g · 100 g to spare")
}

export interface Situation {
  cls: ReasonClass;
  feasible: boolean;
  buildSummary: string; // "5× SCOUT-S" / "1× STRIKE-L + 1× SCOUT-S" / "Nothing buildable"
  coverage: { covered: number; total: number } | null;
  limit: SituationCell; // what is binding right now
  lever: SituationCell; // what to change to do better
  actionable: boolean; // the lever is a concrete change (show → ) vs. an "all good" note
}

type BudgetDim = "FEEDSTOCK" | "HOURS" | "ENERGY";

function isBudgetDim(reason: BindingReason): reason is BudgetDim {
  return reason === "FEEDSTOCK" || reason === "HOURS" || reason === "ENERGY";
}

interface DimInfo {
  label: string;
  unit: string;
  used: number;
  total: number;
}

function dimInfo(r: SolveResponse, dim: BudgetDim): DimInfo {
  if (dim === "FEEDSTOCK") {
    return {
      label: "Feedstock",
      unit: "g",
      used: r.budget_used.feedstock_g[CF] ?? 0,
      total: r.budget_total.feedstock_g[CF] ?? 0,
    };
  }
  if (dim === "HOURS") {
    return { label: "Printer hours", unit: "h", used: r.budget_used.printer_hours, total: r.budget_total.printer_hours };
  }
  return { label: "Energy", unit: "Wh", used: r.budget_used.energy_wh, total: r.budget_total.energy_wh };
}

interface Cheapest {
  tierId: string;
  cost: number;
}

// The least-cost airframe (on the binding dimension) among tiers that can actually service a
// target — i.e. the cheapest next unit that would extend coverage. Drives the lever's "+X" figure.
function cheapestCapable(result: BuildResult, dim: BudgetDim): Cheapest | null {
  const costOf = (uc: { feedstock_g: number; printer_hours: number; energy_wh: number }): number =>
    dim === "ENERGY" ? uc.energy_wh : dim === "HOURS" ? uc.printer_hours : uc.feedstock_g;
  let best: Cheapest | null = null;
  for (const ts of result.tier_status) {
    if (ts.eligible_target_ids.length === 0) continue;
    const cost = costOf(ts.unit_cost);
    if (best === null || cost < best.cost) best = { tierId: ts.tier_id, cost };
  }
  return best;
}

export function tierLabel(id: string): string {
  return id.replace(/_/g, "-");
}

function buildSummary(builds: Record<string, number>): string {
  const order = ["STRIKE_L", "ISR_M", "SCOUT_S"];
  const rank = (id: string): number => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  const parts = Object.entries(builds)
    .filter(([, n]) => n > 0)
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([id, n]) => `${n}× ${tierLabel(id)}`);
  return parts.length ? parts.join(" + ") : "Nothing buildable";
}

// tidy number: ≤1 decimal, thousands separators. The single source of number formatting — the
// read-out budget bars import this too, so figures match across the bottom-line band and the rail.
export function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1);
  const [whole, frac] = s.split(".");
  const sep = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${sep}.${frac}` : sep;
}

interface GateCopy {
  title: string;
  fixTitle: string;
  fixDetail: string;
}

function gateCopy(reason: BindingReason): GateCopy {
  switch (reason) {
    case "RANGE":
      return { title: "Range gate", fixTitle: "Longer-range airframe", fixDetail: "a target's standoff is beyond every available airframe's range" };
    case "PAYLOAD":
      return { title: "Payload gate", fixTitle: "Higher payload airframe", fixDetail: "a target's payload is beyond every available airframe's capacity" };
    case "WIND":
      return { title: "Wind gate", fixTitle: "Higher wind rating", fixDetail: "wind over a target is beyond every available airframe's rating" };
    case "MATERIAL":
      return { title: "Material", fixTitle: "Load the required material", fixDetail: "the material this build needs is not on hand" };
    case "ENVELOPE":
      return { title: "Build envelope", fixTitle: "Larger printer / split part", fixDetail: "a part is larger than the printer's build volume" };
    case "COMPONENTS":
      return { title: "Parts kit", fixTitle: "Restock the parts kit", fixDetail: "a required modular component is out of stock" };
    default:
      return { title: reason.replace(/_/g, " "), fixTitle: "—", fixDetail: "" };
  }
}

function headroom(r: BuildResult): string {
  const f = (r.budget_total.feedstock_g[CF] ?? 0) - (r.budget_used.feedstock_g[CF] ?? 0);
  const h = r.budget_total.printer_hours - r.budget_used.printer_hours;
  const e = r.budget_total.energy_wh - r.budget_used.energy_wh;
  return `${fmt(Math.max(0, f))} g · ${fmt(Math.max(0, h))} h · ${fmt(Math.max(0, e))} Wh free`;
}

export function buildSituation(response: SolveResponse): Situation {
  if (isBuildResult(response)) return situationForBuild(response);
  return situationForRepair(response as RepairResult);
}

function situationForBuild(r: BuildResult): Situation {
  const cls = reasonClass(r.binding_reason, r.feasible);
  const { covered, total } = r.coverage;
  const summary = buildSummary(r.builds);
  const reason = r.binding_reason;
  const base = { cls, buildSummary: summary, coverage: { covered, total } };

  // ── infeasible: cannot build ────────────────────────────────────────
  if (!r.feasible) {
    if (isBudgetDim(reason)) {
      const d = dimInfo(r, reason);
      const cheap = cheapestCapable(r, reason);
      const spare = Math.max(0, d.total - d.used);
      const limit: SituationCell = {
        kicker: "CANNOT BUILD",
        title: d.label,
        detail: REASON_TEXT[reason],
        metric: cheap
          ? `${fmt(d.total)} ${d.unit} on hand · ${fmt(cheap.cost)} ${d.unit} needed per airframe`
          : `${fmt(d.total)} ${d.unit} on hand`,
      };
      const lever: SituationCell = cheap
        ? {
            kicker: "TO MAKE BUILDABLE",
            title: `+${fmt(Math.max(0, cheap.cost - spare))} ${d.unit}`,
            detail: `clears the cheapest qualifying airframe (${tierLabel(cheap.tierId)}, ${fmt(cheap.cost)} ${d.unit})`,
          }
        : { kicker: "NO PATH", title: "—", detail: "no airframe can service these targets at this node" };
      return { ...base, feasible: false, limit, lever, actionable: cheap !== null };
    }
    const g = gateCopy(reason);
    return {
      ...base,
      feasible: false,
      limit: { kicker: "CANNOT BUILD", title: g.title, detail: REASON_TEXT[reason] },
      lever: { kicker: "TO MAKE BUILDABLE", title: g.fixTitle, detail: g.fixDetail },
      actionable: true,
    };
  }

  // ── feasible + fully covered, slack to spare ────────────────────────
  if (reason === "MISSION_COVERED") {
    return {
      ...base,
      feasible: true,
      limit: { kicker: "FULLY COVERED", title: `${covered} / ${total} targets`, detail: "every target serviced — budget to spare" },
      lever: { kicker: "HEADROOM", title: headroom(r), detail: "spare capacity before the next limit" },
      actionable: false,
    };
  }

  // ── feasible, a budget is the limiter (partial coverage) ────────────
  if (isBudgetDim(reason)) {
    const d = dimInfo(r, reason);
    const spare = Math.max(0, d.total - d.used);
    const cheap = cheapestCapable(r, reason);
    const limit: SituationCell = {
      kicker: "LIMITED BY",
      title: d.label,
      detail: REASON_TEXT[reason],
      metric: `${fmt(d.used)} / ${fmt(d.total)} ${d.unit} used · ${fmt(spare)} ${d.unit} to spare`,
    };
    const lever: SituationCell =
      cheap && covered < total
        ? {
            kicker: "TO COVER MORE",
            title: `+${fmt(Math.max(0, cheap.cost - spare))} ${d.unit}`,
            detail: `1 more ${tierLabel(cheap.tierId)} (${fmt(cheap.cost)} ${d.unit} each) → covers ${covered + 1} / ${total}`,
          }
        : { kicker: "AT CAPACITY", title: `${covered} / ${total} covered`, detail: `${d.label.toLowerCase()} is fully committed` };
    return { ...base, feasible: true, limit, lever, actionable: cheap !== null && covered < total };
  }

  // ── feasible, a capability gate fixed the chosen tier (RANGE/PAYLOAD/WIND) ──
  const g = gateCopy(reason);
  const builtLabels = Object.entries(r.builds)
    .filter(([, n]) => n > 0)
    .map(([id]) => tierLabel(id))
    .join(" / ");
  const limit: SituationCell = { kicker: "TIER SET BY", title: g.title, detail: REASON_TEXT[reason] };
  const lever: SituationCell =
    covered >= total
      ? {
          kicker: "FULLY COVERED",
          title: `${covered} / ${total} targets`,
          detail: builtLabels ? `only ${builtLabels} clears this gate — nothing lighter qualifies` : "the chosen airframe clears the gate",
        }
      : { kicker: "GATE-BLOCKED", title: `${total - covered} uncovered`, detail: `no available airframe clears the ${g.title.toLowerCase()} for the rest` };
  return { ...base, feasible: true, limit, lever, actionable: false };
}

function situationForRepair(r: RepairResult): Situation {
  const cls = reasonClass(r.binding_reason, r.feasible);
  const reason = r.binding_reason;
  const printed = r.buckets.print_now.length;
  const deferred = r.buckets.defer.length;
  const safety = r.buckets.cant_print_safety.length;
  const summary = `${printed} printing · ${deferred} deferred · ${safety} hold`;
  const base = { cls, buildSummary: summary, coverage: null };

  let limit: SituationCell;
  if (isBudgetDim(reason)) {
    const d = dimInfo(r, reason);
    const spare = Math.max(0, d.total - d.used);
    limit = {
      kicker: "LIMITED BY",
      title: d.label,
      detail: REASON_TEXT[reason],
      metric: `${fmt(d.used)} / ${fmt(d.total)} ${d.unit} used · ${fmt(spare)} ${d.unit} to spare`,
    };
  } else {
    limit = {
      kicker: r.feasible ? "PRINTING" : "BLOCKED",
      title: `${printed} repair${printed === 1 ? "" : "s"} selected`,
      detail: r.feasible ? "highest-value set within budget + safety gates" : REASON_TEXT[reason],
      metric: `value restored ${fmt(r.selected_value)} pts`,
    };
  }

  let lever: SituationCell;
  if (deferred > 0 && isBudgetDim(reason)) {
    const d = dimInfo(r, reason);
    lever = { kicker: "TO PRINT MORE", title: `${deferred} deferred`, detail: `more ${d.label.toLowerCase()} would clear the budget for the next repair` };
  } else if (safety > 0) {
    lever = { kicker: "SAFETY HOLD", title: `${safety} held`, detail: "safety-critical parts need sign-off before they print" };
  } else {
    lever = { kicker: "ALL CLEAR", title: `${printed} printing`, detail: "every eligible repair fits the budget" };
  }

  return { ...base, feasible: r.feasible, limit, lever, actionable: deferred > 0 };
}
