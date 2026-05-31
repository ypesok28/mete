"use client";

// The hero move, named and explained — copy on the left, a second live flip stage on the right.
// This is where "size is a gate, not a score" gets its paragraph: the answer doesn't re-rank,
// it structurally reorganizes, and the binding badge says why.

import { Reveal } from "./Reveal";
import { HeroFlip } from "./HeroFlip";

export function FlipExplained() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="mono text-[11px] uppercase tracking-label text-ink-mute">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-gate align-middle" />
            the hero move
          </p>
          <h2 className="mt-5 text-display-lg font-semibold tracking-tight text-ink">
            Size is a gate, <span className="text-gate">not a score.</span>
          </h2>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-soft">
            Push one target from 3 km to 120 km and the answer doesn&apos;t just re-rank. It
            structurally reorganizes: five small recon drones dissolve into one long-range strike
            airframe.
          </p>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Same printer. Same 2 kg of filament. The mission decided the airframe — not an
            operator&apos;s intuition, and not a hidden oracle. The binding badge names exactly which
            limit bound the build.
          </p>
          <p className="mono mt-7 border-l-2 border-gate pl-4 text-[14px] leading-relaxed text-ink">
            &ldquo;The mission picks the airframe, not us. There&apos;s no canned path — a
            deterministic solver, running offline on this machine.&rdquo;
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <HeroFlip iconScale={1.15} />
        </Reveal>
      </div>
    </section>
  );
}
