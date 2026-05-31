# METE — Marketing Landing Page

A Framer-style, scroll-animated landing page for METE, built in the software's own light /
warm-neutral command-console aesthetic (single bronze accent) so clicking through to the tool
feels seamless. It conveys the whole idea simply, shows headline statistics, and animates as you
scroll.

## Routing (important — the demo opening URL changed)

| Route | Serves |
|-------|--------|
| `/` | the new marketing landing page (front door) |
| `/console` | the working allocation console (was previously at `/`) |

- The console's data path is **unchanged** — it still calls the absolute `fetch('/solve')`.
- `next.config.ts` sets **`trailingSlash: true`** so the static export emits
  `out/console/index.html` (not `out/console.html`). This is required for the offline demo, where
  `solver/main.py` mounts `StaticFiles(directory=out, html=True)` — that mount only resolves a
  directory's `index.html` and never strips a `.html` suffix, so a bare `/console` would 404
  without the directory-index file. With it, `/console` redirects once to `/console/` and serves.
- **The offline demo should now open `/console`** (or `/` for the landing page).

## What was added / changed

```
app/
  page.tsx                     landing page (was the console; now composes landing sections)
  console/page.tsx             the console (moved here; header swapped to the METE wordmark)
  layout.tsx                   metadata → METE
  globals.css                  added guarded `html { scroll-behavior: smooth }` (reduced-motion off)
next.config.ts                 added `trailingSlash: true`

src/components/
  MeteBrand.tsx                shared METE lockup: MeteMark / MeteMarkTile / MeteWordmark
  landing/
    Reveal.tsx                 scroll-reveal primitive (fade + rise, reduced-motion aware)
    CountUp.tsx                in-view count-up figure (tabular/mono)
    HeroFlip.tsx               THE signature: 5×SCOUT ⇄ 1×STRIKE flip + binding badge FEEDSTOCK↔RANGE
    Nav.tsx                    sticky, translucent-on-scroll top bar
    Hero.tsx                   headline + dual CTAs + embedded HeroFlip
    StatBand.tsx               < 400 ms · 100% offline · 3 tiers · 8 binding reasons
    Problem.tsx                the stakes + the three hard budgets
    HowItWorks.tsx             load mission → set budget → read plan
    FlipExplained.tsx          "Size is a gate, not a score." + a second live flip
    TierSpecs.tsx              SCOUT-S / ISR-M / STRIKE-L cards (real specs from SCAFFOLD.tiers)
    Features.tsx               6 capability cards
    ClosingCTA.tsx             closing band on the recessed decision-stage well
    Footer.tsx                 wordmark + "mete the mission" + offline/deterministic stamp
```

## Design system

Reuses the console's tokens throughout (no new dependencies):

- **Theme:** light, cool-white surfaces, single bronze accent (`text-gate` `#9A6312`).
- **Type:** self-hosted IBM Plex Sans (body) + IBM Plex Mono (figures/wordmark) — offline, no CDN.
- **Reused code:** `AirframeIcon` + `TIER_SIZE` (drone silhouettes), `SCAFFOLD.tiers` (tier data),
  the `.stage-field` recessed well, `.scan-sweep` / `.pulse-dot` helpers, `cn()`.
- **Tier numbers are sourced, not hardcoded** — e.g. print time is `feedstock_g ÷ deposition_rate`
  (STRIKE-L = 1400 ÷ 150 = `9.3 h`), so the marketing figures can never drift from the solver.

## Animation

- `framer-motion@12.40` (already installed): `whileInView` reveals, `useInView` count-ups,
  `AnimatePresence` for the flip.
- The `HeroFlip` loop pauses when off-screen and freezes on the first state under reduced motion.
- Every animation honors `prefers-reduced-motion` (Reveal/CountUp render static; the smooth-scroll
  rule is disabled).

## Run it

```bash
# from this directory: dlc/src/frontend-linear
npm run dev            # http://localhost:3000  (/ = landing, /console = console)
npm run build          # static export → out/  (emits out/index.html + out/console/index.html)
```

Pre-req for `next build`: `node_modules` must be a real directory, not the escaping symlink
(Turbopack rejects it — APFS clone is fine), or the build fails.

Offline single-port demo: build the export, then run the FastAPI server in `dlc/src/solver`
(`uvicorn main:app --port 8000 --workers 1`), which serves `out/` and answers `/solve` on one
origin. Open `http://localhost:8000/` (landing) or `/console` (the tool).

## Verified

- `npm run build` passes typecheck + static export; both routes prerender.
- Landing renders every section with correct real data; hero confirmed visually; zero client
  console errors.
- `/console` resolves (redirects to `/console/`), header shows the METE wordmark (FORGE·MIX gone),
  solve path intact.

## Optional follow-ups

- **Exact logo font:** the wordmark uses bundled IBM Plex Mono because the locked logo's Geist Mono
  is CDN-only and would break the offline guarantee. Self-host Geist Mono's woff2 to match exactly.
- Apply the METE header treatment anywhere FORGE·MIX still appears in the app body.
