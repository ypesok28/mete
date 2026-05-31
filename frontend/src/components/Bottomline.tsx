"use client";

// THE BOTTOM LINE — the anchored "why + what to change" band at the base of the decision stage.
// Two flush cells on one card: LEFT = the limiting factor (reason-tinted), RIGHT = the concrete
// lever to do better. Replaces the old terse binding pill: same footprint, far more meaning. It
// states, in plain language with real figures, exactly what an operator wants to read off the
// screen — what's binding now, and the one number that would change the outcome.

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { Situation, SituationCell } from "@/lib/insight";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function Bottomline({ situation, accentHex }: { situation: Situation; accentHex: string }) {
  return (
    <motion.div
      key={`${situation.limit.kicker}·${situation.limit.title}·${situation.lever.title}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-surface shadow-card"
    >
      {/* reason rule — ties the band to the live answer color */}
      <motion.span
        className="absolute inset-y-0 left-0 z-10 w-[3px]"
        animate={{ backgroundColor: accentHex }}
        transition={{ duration: 0.34, ease: EASE }}
      />
      <div className="grid grid-cols-1 divide-y divide-line-soft sm:grid-cols-[1fr_1fr] sm:divide-x sm:divide-y-0">
        <Cell cell={situation.limit} accentHex={accentHex} role="limit" />
        <Cell cell={situation.lever} accentHex={accentHex} role="lever" actionable={situation.actionable} />
      </div>
    </motion.div>
  );
}

function Cell({
  cell,
  accentHex,
  role,
  actionable = false,
}: {
  cell: SituationCell;
  accentHex: string;
  role: "limit" | "lever";
  actionable?: boolean;
}) {
  const isLimit = role === "limit";
  // The limit kicker carries the reason color (it IS the binding factor). The lever kicker carries
  // it only when actionable, so the "+X" change reads as the thing to act on.
  const kickerTint = isLimit || actionable;
  const titleTint = !isLimit && actionable; // accent the "+280 g" figure to pull the eye

  return (
    <div className="flex flex-col gap-1 px-5 py-3.5">
      <span
        className="mono flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-label"
        style={{ color: kickerTint ? accentHex : undefined }}
      >
        {isLimit ? (
          <span className="size-1.5 rounded-full" style={{ backgroundColor: accentHex }} />
        ) : actionable ? (
          <ArrowRight className="size-3" />
        ) : (
          <span className="size-1.5 rounded-full bg-ink-faint" />
        )}
        <span className={kickerTint ? "" : "text-ink-mute"}>{cell.kicker}</span>
      </span>

      <span
        className="text-[15px] font-bold leading-tight tracking-tight"
        style={{ color: titleTint ? accentHex : undefined }}
      >
        <span className={titleTint ? "" : "text-ink"}>{cell.title}</span>
      </span>

      <span className="text-[12px] leading-snug text-ink-soft">{cell.detail}</span>

      {cell.metric ? <span className="mono text-[10.5px] text-ink-faint">{cell.metric}</span> : null}
    </div>
  );
}
