"use client";

// The stakes — one tight editorial block that frames the allocation problem, then the three
// hard budgets as instrument chips. Sets up why a deterministic solver matters before the
// "how it works" walkthrough.

import { Boxes, Clock, Zap } from "lucide-react";
import { Reveal } from "./Reveal";

const CONSTRAINTS = [
  { icon: Boxes, label: "Filament", value: "2 kg on hand" },
  { icon: Clock, label: "Printer-hours", value: "18 before the window" },
  { icon: Zap, label: "Energy", value: "900 Wh rationed" },
];

export function Problem() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto w-full max-w-4xl">
        <Reveal>
          <p className="mono text-[11px] uppercase tracking-label text-ink-mute">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-gate align-middle" />
            the stakes
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="mt-5 text-display-lg font-semibold tracking-tight text-ink">
            One printer. Finite filament, hours, and watts.{" "}
            <span className="text-ink-mute">Which drones do you build tonight?</span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
            A forward-deployed operator has one machine and a hard budget. Spend it on the wrong
            airframe and the grams, hours, and watts are gone. METE turns that high-stakes guess
            into a defensible, auditable decision — in under a second.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl2 border border-line bg-line shadow-card sm:grid-cols-3">
          {CONSTRAINTS.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal
                key={c.label}
                delay={0.18 + i * 0.07}
                className="flex items-center gap-3.5 bg-surface px-5 py-5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gate-wash text-gate">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="mono block text-[11px] uppercase tracking-label text-ink-mute">
                    {c.label}
                  </span>
                  <span className="mt-0.5 block text-[14px] font-medium text-ink">{c.value}</span>
                </span>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
