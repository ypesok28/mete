"use client";

// The persistent binding-reason badge (the "why") — a clean light pill: white surface, soft
// shadow, hairline ring. The reason color shows only where it carries meaning (the status dot +
// the verdict word) so it meshes with the calm chrome rather than shouting. Fires exactly ONE
// soft pulse on a class change. Third in the change→answer→reason eye path.

import { motion, useReducedMotion } from "framer-motion";
import type { BindingReason } from "@contract";
import { reasonTheme, REASON_TEXT } from "@/lib/reasonTheme";

interface BindingBadgeProps {
  reason: BindingReason;
  feasible: boolean;
}

export function BindingBadge({ reason, feasible }: BindingBadgeProps) {
  const theme = reasonTheme(reason, feasible);
  const reduce = useReducedMotion();

  const verdict = feasible ? "BINDING REASON" : "CANNOT BUILD";

  return (
    <motion.div
      key={`${theme.cls}-${reason}`}
      initial={reduce ? false : { boxShadow: `0 0 0 0px ${theme.hex}00`, y: 4, opacity: 0 }}
      animate={
        reduce
          ? {}
          : {
              y: 0,
              opacity: 1,
              boxShadow: [
                `0 1px 3px rgba(28,26,23,0.05), 0 0 0 0px ${theme.hex}00`,
                `0 1px 3px rgba(28,26,23,0.05), 0 0 0 4px ${theme.hex}26`,
                `0 1px 3px rgba(28,26,23,0.05), 0 0 0 0px ${theme.hex}00`,
              ],
            }
      }
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className="flex max-w-full items-center gap-3 rounded-full bg-surface px-4 py-2.5 ring-1 ring-line"
      style={{ boxShadow: "0 1px 3px rgba(28,26,23,0.05)" }}
    >
      {/* semantic status dot */}
      <span className="relative flex size-2.5 shrink-0" style={{ color: theme.hex }}>
        <span
          className="absolute inline-flex size-full rounded-full opacity-50"
          style={{
            backgroundColor: theme.hex,
            animation: reduce ? undefined : "pulse-ring 2.2s var(--ease) infinite",
          }}
        />
        <span
          className="relative inline-flex size-2.5 rounded-full"
          style={{ backgroundColor: theme.hex }}
        />
      </span>

      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="mono shrink-0 text-[10px] font-semibold uppercase tracking-tag"
          style={{ color: theme.hex }}
        >
          {verdict}
        </span>
        <span className="h-3.5 w-px shrink-0 bg-line" aria-hidden />
        <span className="mono shrink-0 text-[11px] font-semibold uppercase tracking-tag text-ink">
          {reason.replace(/_/g, " ")}
        </span>
        <span className="hidden truncate text-[12.5px] text-ink-soft sm:inline">
          {REASON_TEXT[reason]}
        </span>
      </div>
    </motion.div>
  );
}
