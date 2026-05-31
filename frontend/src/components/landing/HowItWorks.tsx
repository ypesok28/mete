"use client";

// Three moves on one screen — the loop the operator runs all night. Numbered cards that lift on
// hover and reveal in a left-to-right stagger as the row enters view.

import { Gauge, Layers, Target } from "lucide-react";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    n: "01",
    icon: Target,
    title: "Load the mission",
    body: "Pick a preset or set targets — standoff distance, payload, wind tolerance, and how much each one is worth.",
  },
  {
    n: "02",
    icon: Gauge,
    title: "Set tonight's budget",
    body: "Filament on hand, printer-hours before the window closes, and a rationed energy budget. Every number is editable.",
  },
  {
    n: "03",
    icon: Layers,
    title: "Read the build plan",
    body: "The solver returns how many of each tier to build, what's covered, and the one constraint that bound the answer.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-28 px-6 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="max-w-2xl">
          <p className="mono text-[11px] uppercase tracking-label text-ink-mute">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-gate align-middle" />
            how it works
          </p>
          <h2 className="mt-5 text-display-lg font-semibold tracking-tight text-ink">
            Edit an input. Re-solve. Re-render.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">
            One screen, no dashboards to assemble — change anything and the answer reorganizes live.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal
                key={s.n}
                delay={i * 0.1}
                className="rounded-xl2 border border-line bg-surface p-7 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raise"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-lg bg-gate-wash text-gate">
                    <Icon className="size-5" />
                  </span>
                  <span className="mono text-[28px] font-medium leading-none text-ink-faint">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 text-[18px] font-semibold tracking-tight text-ink">{s.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-ink-soft">{s.body}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
