"use client";

// Closing band — the recessed decision-stage well (reused from the console) framing one last
// invitation into the live tool.

import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function ClosingCTA() {
  return (
    <section className="px-6 py-24">
      <Reveal className="mx-auto w-full max-w-5xl">
        <div className="stage-field relative overflow-hidden rounded-2xl2 border border-line px-6 py-16 text-center shadow-card sm:py-20">
          <h2 className="mx-auto max-w-2xl text-display-lg font-semibold tracking-tight text-ink sm:text-display-xl">
            Open the console.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-soft">
            Change any input and watch the build plan structurally reorganize — with the binding
            reason named, every time. Fully offline, fully deterministic.
          </p>
          <a
            href="/console"
            className="group mt-9 inline-flex items-center gap-2 rounded-lg bg-gate px-6 py-3.5 text-[15px] font-semibold text-white shadow-raise transition-all duration-150 hover:-translate-y-px hover:shadow-pop"
          >
            Open the console
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}
