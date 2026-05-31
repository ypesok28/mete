"use client";

// THE signature moment — the same printer, the same 2 kg of filament, two missions. The stage
// loops between the two demo seeds the console ships with:
//
//   WIDE-AREA RECON → BUILD 5× SCOUT-S   · binding FEEDSTOCK (a budget caps the swarm)
//   DEEP STRIKE     → BUILD 1× STRIKE-L  · binding RANGE     (a gate forces the airframe)
//
// The airframe row, the headline, and the binding badge all reorganize together — silhouette
// AREA carries the "small swarm vs one big bird" read before the text does. Colors come straight
// from the console's reason engine (budget = slate-indigo, gate = bronze). The loop pauses when
// off-screen and freezes on the first state under prefers-reduced-motion.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AirframeIcon, TIER_SIZE } from "@/components/AirframeIcon";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

type ReasonClass = "budget" | "gate";

interface FlipState {
  key: string;
  mission: string;
  reason: string; // binding reason label
  reasonClass: ReasonClass;
  tier: "SCOUT_S" | "ISR_M" | "STRIKE_L";
  count: number;
  build: string; // "5× SCOUT-S"
  coverage: string; // "5 / 8 targets"
  standoff: string; // the lever that moved
  detail: string;
}

const STATES: FlipState[] = [
  {
    key: "swarm",
    mission: "WIDE-AREA RECON",
    reason: "FEEDSTOCK",
    reasonClass: "budget",
    tier: "SCOUT_S",
    count: 5,
    build: "5× SCOUT-S",
    coverage: "5 / 8 targets",
    standoff: "3 km standoff",
    detail: "A 6th airframe needs more than the 2 kg of filament on hand.",
  },
  {
    key: "deep",
    mission: "DEEP STRIKE",
    reason: "RANGE",
    reasonClass: "gate",
    tier: "STRIKE_L",
    count: 1,
    build: "1× STRIKE-L",
    coverage: "1 / 1 target",
    standoff: "120 km standoff",
    detail: "Only STRIKE-L reaches — SCOUT and ISR are gated out by range.",
  },
];

const REASON: Record<
  ReasonClass,
  { text: string; wash: string; ring: string; dot: string; rgb: string }
> = {
  budget: {
    text: "text-budget",
    wash: "bg-budget-wash",
    ring: "ring-budget/25",
    dot: "bg-budget",
    rgb: "71, 80, 120",
  },
  gate: {
    text: "text-gate",
    wash: "bg-gate-wash",
    ring: "ring-gate/25",
    dot: "bg-gate",
    rgb: "154, 99, 18",
  },
};

export function HeroFlip({
  className,
  iconScale = 1,
}: {
  className?: string;
  iconScale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-100px" });
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduce || !inView) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % STATES.length), 3400);
    return () => clearInterval(t);
  }, [reduce, inView]);

  const s = STATES[idx];
  const r = REASON[s.reasonClass];
  const iconSize = Math.round(TIER_SIZE[s.tier] * iconScale);
  // The sweep's tint is the live reason RGB, handed to .scan-sweep via a CSS custom property.
  // (This @types/react build doesn't accept --custom keys on CSSProperties directly.)
  const sweepVars = { "--sweep": r.rgb } as unknown as CSSProperties;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl2 border border-line bg-surface shadow-pop",
        className
      )}
    >
      {/* header strip — mission + the live binding badge */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <span className="mono text-[11px] uppercase tracking-label text-ink-mute">
          <span className="pulse-dot mr-2.5 inline-block size-1.5 rounded-full bg-covered align-middle text-covered" />
          edge-node · 1 printer · 2 kg filament
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={s.key + "-badge"}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.28, ease: EASE }}
            className={cn(
              "mono inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-label ring-1",
              r.wash,
              r.text,
              r.ring
            )}
          >
            <span className={cn("size-1.5 rounded-full", r.dot)} />
            binding · {s.reason}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* the decision stage — reuses the console's recessed well + dot lattice */}
      <div className="stage-field relative grid min-h-[208px] place-items-center px-5 py-8">
        {/* re-mounting scan-sweep replays once per flip, tinted by the live reason color */}
        {!reduce ? (
          <span key={s.key + "-sweep"} className="scan-sweep" style={sweepVars} />
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={s.key + "-frames"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.34, ease: EASE }}
            className={cn("flex flex-wrap items-center justify-center gap-5", r.text)}
          >
            {Array.from({ length: s.count }).map((_, i) => (
              <motion.span
                key={i}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: 0.06 * i }}
              >
                <AirframeIcon tierId={s.tier} size={iconSize} />
              </motion.span>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* answer line — headline + coverage + the lever that moved */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-line px-5 py-4">
        <div>
          <span className="mono block text-[10px] uppercase tracking-label text-ink-mute">
            build plan
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={s.key + "-build"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mono mt-1 block text-display-md font-medium tracking-tight text-ink"
            >
              {s.build}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2.5">
          <AnimatePresence mode="wait">
            <motion.span
              key={s.key + "-trigger"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="mono inline-flex items-center gap-2 rounded-md border border-line bg-base px-2.5 py-1 text-[11px] tracking-tag text-ink-soft"
            >
              {s.mission}
              <span className="text-ink-faint">·</span>
              {s.standoff}
            </motion.span>
          </AnimatePresence>
          <ArrowRight className="size-4 text-ink-faint" />
          <AnimatePresence mode="wait">
            <motion.span
              key={s.key + "-cov"}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="mono text-[12px] tracking-tag text-ink-soft"
            >
              {s.coverage}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
