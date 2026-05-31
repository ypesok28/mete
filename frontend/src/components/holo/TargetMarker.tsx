"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { Html } from "@react-three/drei";
import type { TargetLayout } from "@/lib/battlespaceLayout";
import { HOLO } from "@/lib/holoColors";

// One marker per target. Covered → steady green node. Uncovered → red node + a pulsing ring
// (the pulse is the only animation, and it MEANS "unserviced" — disciplined). Size ∝ value.
// Labels are kept sparse so the rotating scene stays legible: an uncovered target shows its one-word
// blocking limit (RANGE / PAYLOAD / FEEDSTOCK …) — the highest-value glyph on screen; a covered HVT
// shows its id + value; a covered soft contact shows nothing (its green node inside a labeled ring
// already says "serviced, in this tier's reach").
export function TargetMarker({ t }: { t: TargetLayout }) {
  const ringRef = useRef<Mesh>(null);
  const color = t.covered ? HOLO.covered : HOLO.uncovered;

  // What (if anything) to label this marker with.
  let labelText: string | null = null;
  let labelColor: string = HOLO.covered;
  if (!t.covered && t.cause) {
    labelText = t.cause; // e.g. "RANGE" — why it's unserviced
    labelColor = HOLO.uncovered;
  } else if (t.covered && t.value >= 8) {
    labelText = `${t.label} · v${t.value}`; // HVT id + value
    labelColor = HOLO.covered;
  }

  useFrame((state) => {
    if (t.covered || !ringRef.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.25;
    ringRef.current.scale.set(s, s, s);
    const mat = ringRef.current.material as { opacity: number };
    mat.opacity = 0.5 - (s - 1) * 0.8;
  });

  return (
    <group position={[t.position[0], t.size, t.position[2]]}>
      <mesh>
        <icosahedronGeometry args={[t.size, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} flatShading />
      </mesh>
      {!t.covered ? (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -t.size + 0.02, 0]}>
          <ringGeometry args={[t.size * 1.3, t.size * 1.5, 48]} />
          <meshBasicMaterial color={HOLO.uncovered} transparent opacity={0.5} />
        </mesh>
      ) : null}
      {labelText ? (
        <Html center distanceFactor={12} position={[0, t.size + 0.5, 0]}>
          <div
            style={{
              font: "600 10px ui-monospace, monospace",
              color: labelColor,
              whiteSpace: "nowrap",
              opacity: 0.92,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              pointerEvents: "none",
            }}
          >
            {labelText}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
