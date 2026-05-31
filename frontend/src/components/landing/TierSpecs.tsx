"use client";

// The catalog — three discrete, spec'd airframe classes drawn straight from the console's seeded
// data (SCAFFOLD.tiers), so the marketing numbers can never drift from the solver's. The
// silhouette is rendered at its proportional TIER_SIZE, so the cards themselves show "small swarm
// vs one big bird". Print time is derived the same way the solver does it: feedstock ÷ rate.

import { Reveal } from "./Reveal";
import { AirframeIcon, TIER_SIZE } from "@/components/AirframeIcon";
import { SCAFFOLD } from "@/lib/data";

const RATE = SCAFFOLD.deposition_rate_g_per_hr;

export function TierSpecs() {
  return (
    <section id="specs" className="scroll-mt-28 px-6 py-24">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="max-w-2xl">
          <p className="mono text-[11px] uppercase tracking-label text-ink-mute">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-gate align-middle" />
            the airframes
          </p>
          <h2 className="mt-5 text-display-lg font-semibold tracking-tight text-ink">
            Three tiers, one material.{" "}
            <span className="text-ink-mute">Wildly different missions.</span>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">
            The solver builds whole airframes, never fractions — and only the tiers that clear the
            mission&apos;s range, payload, and wind gates are ever eligible.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {SCAFFOLD.tiers.map((t, i) => {
            const hours = t.feedstock_g / RATE;
            const specs = [
              { k: "Feedstock", v: `${t.feedstock_g} g` },
              { k: "Print time", v: `${hours.toFixed(1)} h` },
              { k: "Energy", v: `${t.energy_wh} Wh` },
              { k: "Range", v: `${t.range_km} km` },
              { k: "Payload", v: `${t.payload_cap_g} g` },
              { k: "Max wind", v: `${t.wind_kt} kt` },
            ];
            return (
              <Reveal
                key={t.id}
                delay={i * 0.1}
                className="flex flex-col rounded-xl2 border border-line bg-surface p-7 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raise"
              >
                <div className="flex h-[112px] items-center justify-center text-gate">
                  <AirframeIcon tierId={t.id} size={Math.round(TIER_SIZE[t.id] * 1.05)} />
                </div>
                <div className="mt-2">
                  <h3 className="mono text-[18px] font-semibold tracking-tight text-ink">{t.name}</h3>
                  <p className="mt-1 text-[13px] capitalize text-ink-mute">{t.role}</p>
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3.5 border-t border-line pt-5">
                  {specs.map((sp) => (
                    <div key={sp.k} className="flex flex-col">
                      <dt className="mono text-[10px] uppercase tracking-label text-ink-mute">
                        {sp.k}
                      </dt>
                      <dd className="mono mt-0.5 text-[15px] font-medium tabular text-ink">{sp.v}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
