"use client";

// DECISION STAGE (center pane) — the answer dead-center, the focal point of the screen (mandate
// 1: THE ANSWER DOMINATES). It fills the center pane flush — a softly recessed warm well bounded
// by the workspace hairlines, NOT a floating card. A reason-colored top rule ties the stage to
// the live answer color; on a CANNOT-BUILD verdict the stage takes a faint alert wash. The motion
// vocabulary stays small and informational: scale+fade for icons, crossfade for text, one soft
// sweep for re-solving, one pulse for the badge.
//
//  - BUILD:  the towering headline · the FLIP icon row · coverage + value · binding badge
//  - BUILD infeasible: the CANNOT-BUILD / resupply verdict
//  - REPAIR: the three buckets (PRINT NOW / SAFETY-HOLD / DEFER)

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Check, Clock, ShieldAlert, type LucideIcon } from "lucide-react";
import type { SolveResponse, BuildResult, RepairResult, RepairItem, Target, Tier } from "@contract";
import { AirframeIcon, TIER_SIZE } from "@/components/AirframeIcon";
import { Bottomline } from "@/components/Bottomline";
import { HelpTip } from "@/components/Field";
import { isBuildResult } from "@/lib/guards";
import { reasonTheme } from "@/lib/reasonTheme";
import { buildSituation } from "@/lib/insight";
import dynamic from "next/dynamic";
import { hasWebGL } from "@/lib/webgl";
import { DecisionOverlay } from "@/components/holo/DecisionOverlay";

const BattlespaceStage = dynamic(() => import("@/components/holo/BattlespaceStage"), { ssr: false });

interface DecisionZoneProps {
  response: SolveResponse;
  repairItems: RepairItem[];
  targets: Target[];
  tiers: Tier[];
}

const EASE = [0.22, 0.61, 0.36, 1] as const;

function useReSolving(signature: string, reduce: boolean): boolean {
  const [resolving, setResolving] = useState(false);
  const prev = useRef(signature);
  useEffect(() => {
    if (prev.current === signature) return;
    prev.current = signature;
    if (reduce) return;
    setResolving(true);
    const t = setTimeout(() => setResolving(false), 270);
    return () => clearTimeout(t);
  }, [signature, reduce]);
  return resolving;
}

export function DecisionZone({ response, repairItems, targets, tiers }: DecisionZoneProps) {
  const reduce = useReducedMotion() ?? false;
  const theme = reasonTheme(response.binding_reason, response.feasible);

  const [gl, setGl] = useState(false);
  useEffect(() => setGl(hasWebGL()), []);

  const signature = useMemo(() => {
    if (isBuildResult(response)) {
      return `${response.feasible}|${response.headline}|${JSON.stringify(response.builds)}`;
    }
    const r = response as RepairResult;
    return `${r.headline}|${JSON.stringify(r.buckets)}`;
  }, [response]);
  const resolving = useReSolving(signature, reduce);

  const build = isBuildResult(response);
  const infeasible = build && !response.feasible;

  // The plain-language bottom line: the limiting factor + the lever to do better. repairItems
  // lets the repair path name the next deferred part's cost instead of a misleading "to spare".
  const situation = useMemo(() => buildSituation(response, repairItems), [response, repairItems]);

  return (
    <div className="stage-field relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* (Removed the reason-colored top rule: with the header band in place it read as a stray
          border stranded above the band. The answer color still carries through the headline verb,
          the priority-value figure, and the coverage fills.) */}
      {/* infeasible wash — a faint alert tint over the stage, never a hard border */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        animate={{ backgroundColor: infeasible ? "rgba(173,69,40,0.05)" : "rgba(173,69,40,0)" }}
        transition={{ duration: 0.34, ease: EASE }}
      />

      {/* HEADER BAND — matches the rails (white, hairline-bordered, same py-3 height + 13px label)
          so all three zone labels — Controls · Decision · Read-out — sit on ONE continuous top
          band. This shared baseline is the strongest stitch tying the three panes into a single
          workspace instead of letting the center read as a separate floating surface. */}
      <div className="relative z-20 flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <span className="text-[13px] font-semibold tracking-tight text-ink">Decision</span>
        <span className="mono text-[9px] uppercase tracking-tag text-ink-faint">live re-solve</span>
      </div>

      {/* re-solving overlay: a faint dim + a single soft sweep (tinted by the reason color) */}
      {resolving ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 bg-canvas/40" />
          <div className="scan-sweep z-20" style={{ ["--sweep" as string]: theme.rgb }} />
        </>
      ) : null}

      {/* THE ANSWER — VERTICALLY CENTERED between the header band and the bottom-line card. The
          short 2D stages (REPAIR's three buckets, the BUILD 2D fallback, the verdict) carry far
          less height than the WebGL battlespace, so top-anchoring them opened a tall void below
          with the value pill marooned in it. Centering balances the whitespace top and bottom so
          the composition reads as one intentional block instead of content stranded at the top.
          (The WebGL HoloViewport branch below is separate and still fills flex-1.) */}
      {/* Only BUILD gets the 3D holographic battlespace. REPAIR keeps the original 2D triage
          buckets (and any no-WebGL case falls through to the 2D stages too).
          `isBuildResult(response)` directly in the condition (not the `build` alias) so TS
          narrows `response` to BuildResult for BattlespaceStage/DecisionOverlay — unambiguous. */}
      {gl && isBuildResult(response) ? (
        <HoloViewport>
          <BattlespaceStage result={response} targets={targets} tiers={tiers} />
          <DecisionOverlay result={response} />
        </HoloViewport>
      ) : (
        <div className="relative z-0 flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8">
          {build ? (
            response.feasible ? (
              <BuildStage result={response} reduce={reduce} accentHex={theme.hex} />
            ) : (
              <VerdictStage result={response} reduce={reduce} />
            )
          ) : (
            <RepairStage
              result={response as RepairResult}
              repairItems={repairItems}
              accentHex={theme.hex}
            />
          )}
        </div>
      )}

      {/* BOTTOM LINE — the persistent "why + what to change", anchored at the stage base. States
          the limiting factor and the concrete lever in plain language, so the answer's meaning is
          legible without parsing the read-out rail. */}
      <div className="relative z-20 flex justify-center px-5 pb-6 pt-2">
        <Bottomline situation={situation} accentHex={theme.hex} />
      </div>
    </div>
  );
}

// ── HOLO VIEWPORT — theater toggle ───────────────────────────────────
// Wraps a 3D canvas + overlays. The "theater" toggle expands it to a full-screen fixed layer
// for the demo reveal, then collapses back into the center pane. Used by both 3D branches.
function HoloViewport({ children }: { children: React.ReactNode }) {
  const [theater, setTheater] = useState(false);
  return (
    <div className={theater ? "fixed inset-0 z-50 p-0" : "relative z-0 min-h-0 flex-1 p-3"}>
      <div
        className={`relative h-full w-full overflow-hidden ${theater ? "" : "rounded-xl"}`}
        style={{ background: "#070604" }}
      >
        {children}
        <button
          type="button"
          onClick={() => setTheater((v) => !v)}
          className="mono absolute right-3 top-3 z-20 rounded-md px-2.5 py-1 text-[10px] uppercase tracking-tag transition-colors"
          style={{ background: "rgba(20,18,12,0.72)", color: "#E8A13A", pointerEvents: "auto" }}
        >
          {theater ? "⤢ exit" : "⤢ theater"}
        </button>
      </div>
    </div>
  );
}

// ── BUILD stage (feasible) ───────────────────────────────────────────
function BuildStage({
  result,
  reduce,
  accentHex,
}: {
  result: BuildResult;
  reduce: boolean;
  accentHex: string;
}) {
  // Flatten builds → one unit per silhouette, STRIKE-first so a mixed build reads big→small.
  const order = ["STRIKE_L", "ISR_M", "SCOUT_S"];
  const rank = (id: string): number => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  const units: { tierId: string; key: string }[] = [];
  for (const tierId of [...Object.keys(result.builds)].sort((a, b) => rank(a) - rank(b))) {
    const n = result.builds[tierId] ?? 0;
    for (let i = 0; i < n; i += 1) units.push({ tierId, key: `${tierId}-${i}` });
  }

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-7">
      {/* a small verb-chip above the headline so the eye lands on the action first */}
      <AnimatePresence mode="wait">
        <motion.div
          key={result.headline}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: EASE }}
          className="flex flex-col items-center gap-3"
        >
          <span className="mono text-[10px] uppercase tracking-label text-ink-mute">
            recommended build
          </span>
          {/* HEADLINE — the towering focal line; readable across a room. Length-aware so the
              long mixed build still fits cleanly and never breaks inside a tier token. */}
          <Headline text={result.headline} accentHex={accentHex} />
        </motion.div>
      </AnimatePresence>

      {/* ICON ROW — the FLIP. Outgoing scale→0 staggered; incoming scales up at tier size. */}
      <LayoutGroup>
        <div className="flex min-h-[120px] w-full flex-wrap items-end justify-center gap-x-9 gap-y-5">
          <AnimatePresence mode="popLayout">
            {units.map((u, i) => (
              <motion.div
                key={u.key}
                layout
                initial={reduce ? false : { opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.1 }}
                transition={{
                  duration: 0.3,
                  ease: EASE,
                  delay: reduce ? 0 : i * 0.035,
                }}
                className="flex flex-col items-center gap-2.5"
              >
                <span
                  className="grid place-items-center"
                  style={{
                    color: accentHex,
                    filter: `drop-shadow(0 6px 16px ${accentHex}2e)`,
                  }}
                >
                  <AirframeIcon tierId={u.tierId} size={TIER_SIZE[u.tierId] ?? 46} />
                </span>
                <span className="mono rounded-full bg-surface px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-tag text-ink-soft shadow-card">
                  {u.tierId.replace(/_/g, "-")}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      <Coverage result={result} accentHex={accentHex} reduce={reduce} />
    </div>
  );
}

function Headline({ text, accentHex }: { text: string; accentHex: string }) {
  // The verb (first word) carries the live accent; the rest stays ink. Each token is rendered
  // non-breaking so a tier id like "STRIKE-L" never hyphenates mid-word; the whole line scales
  // down for longer (mixed) builds so it stays one tidy block instead of wrapping awkwardly.
  const [verb, ...rest] = text.split(" ");
  // size tier by length: short headlines tower; the long mixed string steps down gracefully.
  const len = text.length;
  const sizeCls =
    len <= 18
      ? "text-display-lg xl:text-display-xl"
      : len <= 30
        ? "text-display-md xl:text-display-lg"
        : "text-[1.7rem] leading-[1.06] xl:text-display-md";
  return (
    <h1
      className={`flex flex-wrap items-baseline justify-center gap-x-[0.4ch] gap-y-1 px-2 text-center font-bold tracking-[-0.02em] text-ink ${sizeCls}`}
    >
      <span className="whitespace-nowrap" style={{ color: accentHex }}>
        {verb}
      </span>
      {rest.map((tok, i) => (
        <span key={`${tok}-${i}`} className="whitespace-nowrap text-ink">
          {tok}
        </span>
      ))}
    </h1>
  );
}

function Coverage({
  result,
  accentHex,
  reduce,
}: {
  result: BuildResult;
  accentHex: string;
  reduce: boolean;
}) {
  const { covered, total } = result.coverage;
  return (
    <div className="flex flex-col items-center gap-3.5">
      <div className="flex items-stretch gap-3">
        <StatCard label="Coverage">
          <span className="mono text-[26px] font-bold leading-none text-ink">{covered}</span>
          <span className="mono text-[15px] leading-none text-ink-mute"> / {total}</span>
        </StatCard>
        <StatCard label="Priority value" accentHex={accentHex}>
          <span className="mono text-[26px] font-bold leading-none" style={{ color: accentHex }}>
            {result.covered_value}
          </span>
        </StatCard>
      </div>
      {/* segmented coverage bar — filled = covered, hollow = unmet */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < covered;
          return (
            <motion.span
              key={i}
              layout
              initial={false}
              animate={{
                // empty slots: a faint cool inset fill + a visible cool-gray outline (was a warm
                // #E3DFD7 hairline on transparent, which vanished against the cool light well).
                backgroundColor: filled ? accentHex : "rgba(27,29,36,0.05)",
                borderColor: filled ? accentHex : "#B6BCC6",
              }}
              transition={{ duration: 0.28, ease: EASE, delay: reduce ? 0 : i * 0.025 }}
              className="h-2.5 w-6 rounded-full border"
            />
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  children,
  accentHex,
}: {
  label: string;
  children: React.ReactNode;
  accentHex?: string;
}) {
  return (
    <div
      className="flex min-w-[120px] flex-col items-center gap-1.5 rounded-lg bg-surface px-5 py-3 shadow-card"
      style={accentHex ? { boxShadow: `0 0 0 1px ${accentHex}30, 0 1px 3px rgba(28,26,23,0.05)` } : undefined}
    >
      <span className="mono text-[9px] uppercase tracking-label text-ink-mute">{label}</span>
      <div className="flex items-baseline">{children}</div>
    </div>
  );
}

// ── BUILD stage (infeasible) — the CANNOT-BUILD / resupply verdict ──
function VerdictStage({ result, reduce }: { result: BuildResult; reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE, delay: reduce ? 0 : 0.12 }}
      className="flex w-full max-w-2xl flex-col items-center gap-6 px-6"
    >
      <span className="mono flex items-center gap-2 rounded-full bg-alert-wash px-3.5 py-1 text-[10px] uppercase tracking-label text-alert ring-1 ring-alert/25">
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 3 L22 20 H2 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 9 V14 M12 17 v0.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        operational verdict
      </span>
      <h1 className="text-balance max-w-[18ch] text-center font-bold leading-[1.04] text-display-md text-alert xl:text-display-lg">
        {result.headline}
      </h1>
      <div className="flex items-center gap-4 rounded-lg bg-surface px-5 py-2.5 shadow-card">
        <span className="mono text-[12px] uppercase tracking-tag text-ink-soft">
          coverage {result.coverage.covered} / {result.coverage.total}
        </span>
        <span className="h-3.5 w-px bg-line" />
        <span className="mono text-[12px] uppercase tracking-tag text-ink-mute">built none</span>
      </div>
    </motion.div>
  );
}

// ── REPAIR stage — the three buckets ─────────────────────────────────
// Order matches the solver headline ("PRINT … · DEFER · SAFETY-HOLD"). Each bucket carries its
// own one-line definition (note) and a non-color glyph (Icon) so the meaning is legible without
// crossing to a separate legend and without relying on hue alone.
const BUCKET_META: {
  key: "print_now" | "cant_print_safety" | "defer";
  title: string;
  tone: "go" | "hold" | "defer";
  Icon: LucideIcon;
  note: string;
  empty: string;
}[] = [
  { key: "print_now", title: "Print now", tone: "go", Icon: Check, note: "highest value within budget", empty: "None selected" },
  { key: "defer", title: "Defer", tone: "defer", Icon: Clock, note: "budget bound it out", empty: "None deferred" },
  { key: "cant_print_safety", title: "Safety hold", tone: "hold", Icon: ShieldAlert, note: "needs sign-off to print", empty: "None held" },
];

function RepairStage({
  result,
  repairItems,
  accentHex,
}: {
  result: RepairResult;
  repairItems: RepairItem[];
  accentHex: string;
}) {
  const itemOf = (id: string): RepairItem | undefined => repairItems.find((it) => it.id === id);

  const toneHex = (tone: "go" | "hold" | "defer"): string =>
    tone === "go" ? "#3C7551" : tone === "hold" ? "#AD4528" : "#857D72";

  // The denominator for the value figure: total mission value an operator could actually
  // capture once safety holds are set aside — every item NOT held for safety (i.e. the
  // print-now + defer pool). The gap between selected_value and this is exactly what the
  // budget cost (the deferred parts), which is why it reads as a ratio rather than a bare
  // number.
  const achievable = repairItems
    .filter((it) => !result.buckets.cant_print_safety.includes(it.id))
    .reduce((sum, it) => sum + it.mission_value, 0);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={result.headline}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: EASE }}
          className="flex flex-col items-center gap-2.5"
        >
          <span className="mono text-[10px] uppercase tracking-label text-ink-mute">
            repair triage
          </span>
          <Headline text={result.headline} accentHex={accentHex} />
        </motion.div>
      </AnimatePresence>

      <div className="grid w-full grid-cols-1 items-start gap-3 sm:grid-cols-3">
        {BUCKET_META.map(({ key, title, tone, Icon, note, empty }) => {
          const ids = result.buckets[key];
          const color = toneHex(tone);
          return (
            <div
              key={key}
              className="flex min-h-[112px] flex-col overflow-hidden rounded-xl bg-surface shadow-card"
            >
              <div
                className="px-3 py-2"
                style={{
                  borderBottom: `1px solid ${color}2e`,
                  background: `${color}0f`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="mono flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-tag"
                    style={{ color }}
                  >
                    <Icon className="size-3" strokeWidth={2.5} aria-hidden />
                    {title}
                  </span>
                  <span
                    className="mono grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold"
                    style={{ color, background: `${color}1f` }}
                    aria-label={`${title}: ${ids.length}`}
                  >
                    {ids.length}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-tight text-ink-mute">{note}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-1.5 p-2.5">
                <AnimatePresence mode="popLayout">
                  {ids.map((id, i) => {
                    const it = itemOf(id);
                    return (
                      <motion.li
                        key={id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.22, ease: EASE, delay: i * 0.03 }}
                        className="rounded-lg bg-base px-2.5 py-2"
                      >
                        <div className="text-[12px] font-medium text-ink">{it?.name ?? id}</div>
                        <div className="mono mt-0.5 flex items-center justify-between text-[9.5px] text-ink-faint">
                          <span className="tracking-tag">{id}</span>
                          <span style={{ color }}>{it ? `${it.mission_value} pts` : ""}</span>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                {ids.length === 0 ? (
                  <li className="mono grid flex-1 place-items-center py-2 text-[10px] uppercase tracking-tag text-ink-faint">
                    {empty}
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3.5 rounded-lg bg-surface px-5 py-2.5 shadow-card">
        <span className="mono flex items-center gap-1.5 text-[9px] uppercase tracking-label text-ink-mute">
          Mission value printed
          <HelpTip text="Mission value = the operational readiness each repair restores (operator-set, 1–10 pts). The denominator is total printable value; safety-held parts are excluded pending sign-off." />
        </span>
        <span className="flex items-baseline gap-1">
          <span className="mono text-[22px] font-bold leading-none" style={{ color: accentHex }}>
            {result.selected_value}
          </span>
          <span className="mono text-[13px] leading-none text-ink-mute">/ {achievable} pts</span>
        </span>
      </div>
    </div>
  );
}
