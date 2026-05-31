"use client";
import { Html } from "@react-three/drei";
import type { RangeRing } from "@/lib/battlespaceLayout";
import { HOLO } from "@/lib/holoColors";

// Concentric reachability rings, one per tier, EVENLY spaced (km lives on the label, not the radius —
// the real ranges span 24× and no linear scale renders that legibly). A target inside a ring is within
// that tier's range, by construction. The label turns each ring into the scale legend: "SCOUT-S · 5 km".
// Thin, low-opacity amber — context, not decoration. Labels are DOM (drei <Html>) so they reuse the
// self-hosted font and stay crisp + offline-clean (troika <Text> would fetch a CDN font).
export function RangeRings({ rings }: { rings: RangeRing[] }) {
  return (
    <group>
      {rings.map((r, i) => {
        // stagger label bearing per ring so the three don't stack along one spoke
        const theta = -Math.PI / 2 + i * 0.5;
        return (
          <group key={r.tierId}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r.radius - 0.015, r.radius + 0.015, 96]} />
              <meshBasicMaterial color={HOLO.structure} transparent opacity={0.28} />
            </mesh>
            <Html
              center
              distanceFactor={14}
              position={[r.radius * Math.cos(theta), 0.05, r.radius * Math.sin(theta)]}
            >
              <div
                style={{
                  font: "600 9px ui-monospace, monospace",
                  color: HOLO.structure,
                  whiteSpace: "nowrap",
                  opacity: 0.75,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  pointerEvents: "none",
                }}
              >
                {r.label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
