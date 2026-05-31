"use client";

// Above-the-fold — a centered, instrument-calm statement of the whole idea, then the live flip
// stage so the value proposition is on screen before a word is read. Elements rise in on load
// (staggered), not on scroll, since they start in view. Reduced-motion renders them static.

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { HeroFlip } from "./HeroFlip";

const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: EASE, delay },
        };

  return (
    <section id="top" className="relative px-6 pb-16 pt-32 sm:pt-36">
      <div className="mx-auto w-full max-w-4xl text-center">
        <motion.p
          {...rise(0)}
          className="mono inline-flex items-center gap-2 text-[11px] uppercase tracking-label text-ink-mute"
        >
          <span className="size-1.5 rounded-full bg-gate" />
          mission-driven build optimizer
        </motion.p>

        <motion.h1
          {...rise(0.08)}
          className="mt-6 text-display-lg font-semibold tracking-tight text-ink sm:text-display-2xl"
        >
          The mission decides
          <br className="hidden sm:block" /> <span className="text-gate">the airframe.</span>
        </motion.h1>

        <motion.p
          {...rise(0.16)}
          className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-ink-soft sm:text-[17px]"
        >
          METE is a deterministic, fully-offline build optimizer. Given one printer and a finite
          budget of filament, hours, and energy, it returns exactly which drones to build tonight —
          and names the constraint that decided it.
        </motion.p>

        <motion.div {...rise(0.24)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/console"
            className="group inline-flex items-center gap-2 rounded-lg bg-gate px-5 py-3 text-[14px] font-semibold text-white shadow-card transition-all duration-150 hover:-translate-y-px hover:shadow-pop"
          >
            Open the console
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-5 py-3 text-[14px] font-semibold text-ink-soft shadow-card transition-all duration-150 hover:-translate-y-px hover:text-ink hover:shadow-pop"
          >
            See how it works
            <ArrowDown className="size-4" />
          </a>
        </motion.div>
      </div>

      <motion.div
        {...(reduce
          ? {}
          : {
              initial: { opacity: 0, y: 28 },
              animate: { opacity: 1, y: 0 },
              transition: { duration: 0.8, ease: EASE, delay: 0.34 },
            })}
        className="mx-auto mt-14 w-full max-w-3xl"
      >
        <HeroFlip iconScale={1.05} />
      </motion.div>
    </section>
  );
}
