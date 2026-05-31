// Footer — the locked wordmark + tagline, a few jumps, and the offline/deterministic stamp.

import { MeteWordmark } from "@/components/MeteBrand";

export function Footer() {
  return (
    <footer className="border-t border-line px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <MeteWordmark size="text-[20px]" tagline />

        <div className="flex flex-col gap-2 sm:items-end">
          <nav className="flex items-center gap-5 text-[13px] text-ink-soft">
            <a href="/console" className="transition-colors duration-150 hover:text-ink">
              Console
            </a>
            <a href="#how" className="transition-colors duration-150 hover:text-ink">
              How it works
            </a>
            <a href="#specs" className="transition-colors duration-150 hover:text-ink">
              Airframes
            </a>
          </nav>
          <p className="mono text-[11px] tracking-tag text-ink-mute">
            Fully offline · deterministic · UCSD Defense Hackathon 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
