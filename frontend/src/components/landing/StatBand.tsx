"use client";

// Headline figures — the four numbers that make the claim concrete, ticking up as the band
// scrolls into view. Hairline grid built from a 1px gap over a bg-line backing (no fiddly
// per-cell border math). Figures cross-checked against the planning/spec docs.

import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";

interface Stat {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  sub: string;
}

const STATS: Stat[] = [
  { to: 400, prefix: "< ", suffix: " ms", label: "solve time", sub: "edit → re-solve → re-render" },
  { to: 100, suffix: "%", label: "offline", sub: "deterministic, byte-stable" },
  { to: 3, label: "drone tiers", sub: "SCOUT · ISR · STRIKE" },
  { to: 8, label: "binding reasons", sub: "named on every answer" },
];

export function StatBand() {
  return (
    <section className="px-6 py-6">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl2 border border-line bg-line shadow-card lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="bg-surface px-6 py-8 text-center">
            <div className="mono text-display-md font-medium tracking-tight text-ink">
              <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
            </div>
            <div className="mono mt-2 text-[11px] uppercase tracking-label text-gate">{s.label}</div>
            <div className="mt-1 text-[12px] text-ink-mute">{s.sub}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
