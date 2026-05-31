"use client";

// Why it holds up under a judge's poke — the six properties that make METE a decision instrument
// rather than a magic oracle. A responsive card grid with a per-row reveal stagger.

import { Check, Gauge, ShieldCheck, Target, WifiOff, Wrench } from "lucide-react";
import { Reveal } from "./Reveal";

const CAPS = [
  {
    icon: ShieldCheck,
    title: "Three hard gates",
    body: "Material class, build envelope, and components-on-hand each force an honest CANNOT-BUILD when the physics says so.",
  },
  {
    icon: Target,
    title: "The reason is named",
    body: "Every answer ships with the one limit that gave it its shape — FEEDSTOCK, RANGE, ENERGY, WIND, and five more.",
  },
  {
    icon: Check,
    title: "Every coefficient cited",
    body: "No hidden logic. Each number is a sourced, editable assumption — a frontier you can argue with, not a black box.",
  },
  {
    icon: Gauge,
    title: "Sub-second & deterministic",
    body: "The plan recomputes in under 400 ms and is byte-stable: the same inputs always return the same answer.",
  },
  {
    icon: WifiOff,
    title: "Fully offline",
    body: "Runs airplane-mode on a single machine — self-hosted fonts, bundled data, zero network calls.",
  },
  {
    icon: Wrench,
    title: "Build and Repair",
    body: "The same engine triages field repairs into print-now, can't-print-safety, and defer — one solver, two missions.",
  },
];

export function Features() {
  return (
    <section id="capabilities" className="scroll-mt-28 px-6 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="max-w-2xl">
          <p className="mono text-[11px] uppercase tracking-label text-ink-mute">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-gate align-middle" />
            why it holds up
          </p>
          <h2 className="mt-5 text-display-lg font-semibold tracking-tight text-ink">
            A decision instrument, <span className="text-ink-mute">not a magic oracle.</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal
                key={c.title}
                delay={(i % 3) * 0.08}
                className="rounded-xl2 border border-line bg-surface p-7 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raise"
              >
                <span className="grid size-11 place-items-center rounded-lg bg-gate-wash text-gate">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-[16px] font-semibold tracking-tight text-ink">{c.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{c.body}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
