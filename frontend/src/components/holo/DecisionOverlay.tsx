"use client";
import type { ReactNode } from "react";
import type { BuildResult } from "@contract";
import { HOLO } from "@/lib/holoColors";

// Crisp HTML chrome rendered ON TOP of the dark 3D viewport (text stays HTML, sharp at any
// resolution; 3D handles only the spatial picture). Headline + verdict + coverage figures, plus a
// color key for the battlespace — without it the green/red/amber picture is undecodable on a first
// read. The non-color cues (pulse, size) are spelled out so the read survives red/green colorblindness.
export function DecisionOverlay({ result }: { result: BuildResult }) {
  const infeasible = !result.feasible;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-start p-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="mono text-[10px] uppercase tracking-label" style={{ color: "#cabfae" }}>
          {infeasible ? "operational verdict" : "recommended build"}
        </span>
        <h1
          className="font-bold tracking-[-0.02em] text-display-md xl:text-display-lg"
          style={{ color: infeasible ? "#FF6B62" : "#F6F1E8" }}
        >
          {result.headline}
        </h1>
        {/* priority value rides with the hero (coverage + headroom live in the bottom-line card
            below the viewport — keeping it here means nothing is duplicated and nothing is orphaned). */}
        <span className="mono text-[10px] uppercase tracking-label" style={{ color: "#cabfae", opacity: 0.8 }}>
          priority value {result.covered_value}
        </span>
      </div>

      <Legend />
    </div>
  );
}

// Color key for the battlespace, pinned to the bottom-left corner of the viewport (DOM, so it stays
// crisp and fixed as the scene orbits). Mirrors the REPAIR-mode legend pattern in ReadoutZone.
function Legend() {
  return (
    <div
      className="mono absolute bottom-6 left-6 flex flex-col gap-1.5 rounded-lg px-3 py-2.5 text-[10px] uppercase tracking-tag"
      style={{ background: "rgba(20,18,12,0.6)", color: "#cabfae", backdropFilter: "blur(2px)" }}
    >
      <LegendRow
        swatch={<span className="inline-block size-2 rounded-full" style={{ background: HOLO.covered }} />}
        label="covered"
      />
      <LegendRow
        swatch={<span className="inline-block size-2 rounded-full" style={{ background: HOLO.uncovered }} />}
        label="uncovered · pulsing"
      />
      <LegendRow
        swatch={<span className="inline-block size-2 rotate-45" style={{ background: HOLO.structure }} />}
        label="forward base"
      />
      <LegendRow
        swatch={<span className="inline-block size-2 rounded-full" style={{ border: `1px solid ${HOLO.structure}` }} />}
        label="rings = tier reach (km)"
      />
      <span className="mt-0.5 normal-case tracking-normal" style={{ color: "#cabfae99" }}>
        red tag = blocking limit · node size ∝ value
      </span>
    </div>
  );
}

function LegendRow({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2">
      {swatch}
      <span>{label}</span>
    </span>
  );
}
