import type { Config } from "tailwindcss";

// FORGE-MIX · "Forward-Edge Operations Console" — the refined LIGHT redesign.
// Loaded into the Tailwind v4 pipeline via `@config` from app/globals.css. shadcn's semantic
// tokens (background/foreground/card/primary/…) live in globals.css `@theme inline`; THIS file
// owns the bespoke console tokens so the two namespaces never collide.
//
// Design system (hand-built, deliberately calm + premium — Palantir/Linear-grade restraint):
//  • LIGHT warm-neutral stone surfaces. ONE continuous surface, not a pile of floating panels.
//    Depth reads from soft shadows + hairlines, never from neon glows or nested borders.
//  • The reason-color engine is keyed by CLASS, not hue, so a recolor is a 4-token change. The
//    four classes are MUTED instrument inks (no neon, no default-blue, no purple-on-white):
//      gate    = bronze        → an exclusion forced the build / the live answer (the HERO)
//      budget  = slate-indigo  → a budget (feedstock / hours / energy) is the limiter
//      covered = forest green  → mission covered, slack to spare
//      alert   = terracotta    → cannot-build / resupply / safety-hold
//  • Single-accent discipline: exactly ONE reason color is foreground at a time (reasonTheme.ts).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── surfaces (cool-neutral gray, light — the premium ground that lets the warm bronze
        //    accent pop. Cool-on-warm is what reads "designed", not "dated cream") ──
        canvas: "#EDEFF2", // recessed wells / the decision stage ground / behind the frame
        base: "#F3F5F7", // quiet inset wells (inputs, sub-cards)
        surface: "#FFFFFF", // the primary working surface (rails, header)
        "surface-2": "#F9FAFB", // faintly raised cards
        "surface-3": "#EBEEF1", // hover lift
        line: "#E1E4E9", // structural hairline borders / pane dividers
        "line-soft": "#ECEEF1", // quiet internal dividers
        glassline: "#1B1E2408", // translucent edge highlight (very faint, dark on light)

        // ── text (cool near-black inks) ──
        ink: "#1B1E24", // headline / key figures
        "ink-soft": "#414650", // labels
        "ink-mute": "#717783", // tags, secondary meta
        "ink-faint": "#A7ADB7", // grid, inert garnish

        // ── reason classes (muted instrument inks — none neon, none default-blue) ──
        gate: "#9A6312", // HERO: an exclusion forced the chosen tier (RANGE/PAYLOAD/WIND…)
        "gate-2": "#7C4F0E", // deeper bronze for fills / gradients
        "gate-dim": "#CDBB9C", // gate at rest (trace)
        "gate-wash": "#F4ECDC", // faint gate-tinted fill
        budget: "#475078", // a budget is the limiter (FEEDSTOCK / HOURS / ENERGY)
        "budget-2": "#39416190",
        "budget-dim": "#C4C7D7",
        "budget-wash": "#ECEEF4",
        covered: "#3C7551", // MISSION COVERED (slack) / PRINT-NOW go
        "covered-dim": "#BCD3C3",
        "covered-wash": "#E8F1EB",
        alert: "#AD4528", // CANNOT-BUILD / resupply / safety-hold
        "alert-dim": "#E7C5B9",
        "alert-wash": "#F8ECE6",
      },
      fontFamily: {
        // self-hosted (next/font/local) — NO Google/CDN fetch; works fully offline.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      fontSize: {
        // a deliberate modern scale; the answer headline towers over everything.
        "display-2xl": ["4.25rem", { lineHeight: "0.96", letterSpacing: "-0.04em" }],
        "display-xl": ["3.25rem", { lineHeight: "1.0", letterSpacing: "-0.03em" }],
        "display-lg": ["2.6rem", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        "display-md": ["1.9rem", { lineHeight: "1.06", letterSpacing: "-0.02em" }],
      },
      letterSpacing: {
        label: "0.16em", // small uppercase section labels (instrument feel)
        tag: "0.08em",
      },
      borderRadius: {
        xl2: "0.875rem",
        "2xl2": "1.125rem",
      },
      boxShadow: {
        // soft, refined light-theme elevation. Depth from blur + low-alpha ink, never neon.
        card: "0 1px 2px -1px rgba(28,26,23,0.06), 0 1px 3px rgba(28,26,23,0.05)",
        raise: "0 4px 14px -4px rgba(28,26,23,0.10), 0 2px 6px -2px rgba(28,26,23,0.06)",
        pop: "0 10px 28px -8px rgba(28,26,23,0.16), 0 3px 8px -3px rgba(28,26,23,0.10)",
        // reason "rings" — a hairline tint + a soft tinted lift, kept restrained for a light surface
        "gate-glow": "0 0 0 1px rgba(154,99,18,0.22), 0 8px 22px -10px rgba(154,99,18,0.30)",
        "budget-glow": "0 0 0 1px rgba(71,80,120,0.22), 0 8px 22px -10px rgba(71,80,120,0.28)",
        "covered-glow": "0 0 0 1px rgba(60,117,81,0.22), 0 8px 22px -10px rgba(60,117,81,0.28)",
        "alert-glow": "0 0 0 1px rgba(173,69,40,0.24), 0 8px 22px -10px rgba(173,69,40,0.30)",
      },
      transitionTimingFunction: {
        instrument: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.3, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
