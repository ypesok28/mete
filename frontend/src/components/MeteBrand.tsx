// METE brand lockup — the locked identity (brand/mete-brand.html): the "allocation bars" mark
// (center bar = the selected tier, in the accent) + the METE wordmark with an accented leading M.
//
// On THIS surface the accent is the console's bronze (#9A6312 / text-gate), NOT the brand's
// dark-surface amber (#E79A3C) — single-accent discipline on the light console. The wordmark is
// set in the already-bundled IBM Plex Mono (font-mono), self-hosted/offline: the locked logo
// font is Geist Mono, but it ships only over a CDN and would break the airplane-mode guarantee,
// so we hold the mono character without the network dependency.

import { cn } from "@/lib/utils";

const ACCENT = "#9A6312"; // bronze — matches --primary / text-gate

// The allocation-bars glyph (brand/mete-brand.html #bars). Outer bars ride currentColor so the
// caller sets their ink via text-*; the center bar is always the accent (the "chosen tier").
export function MeteMark({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="METE"
      className={className}
    >
      <rect x="44" y="112" width="26" height="44" rx="6" fill="currentColor" />
      <rect x="87" y="62" width="26" height="94" rx="6" fill={ACCENT} />
      <rect x="130" y="92" width="26" height="64" rx="6" fill="currentColor" />
    </svg>
  );
}

// A softly-tiled mark for headers — the bars in ink-soft inside a faint bronze-wash chip.
export function MeteMarkTile({ className, size = 9 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-lg border border-gate/20 bg-gate-wash text-ink-soft shadow-card",
        className
      )}
      style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
    >
      <MeteMark size={size === 9 ? 20 : Math.round(size * 2.2)} />
    </span>
  );
}

// The METE wordmark — leading M in the bronze accent, the rest in ink. `tagline` appends the
// brand line "mete the mission". `size` is a Tailwind text-* class for the wordmark row.
export function MeteWordmark({
  className,
  size = "text-[15px]",
  tagline = false,
}: {
  className?: string;
  size?: string;
  tagline?: boolean;
}) {
  return (
    <span className={cn("inline-block leading-none", className)}>
      <span className={cn("font-mono font-medium tracking-tight text-ink", size)}>
        <span className="text-gate">M</span>ETE
      </span>
      {tagline ? (
        <span className="mt-1.5 block font-mono text-[10px] lowercase tracking-label text-ink-mute">
          mete the mission
        </span>
      ) : null}
    </span>
  );
}
