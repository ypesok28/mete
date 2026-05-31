"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine } from "@react-three/drei";
import { Vector3, type Group } from "three";
import type { TrailLayout } from "@/lib/battlespaceLayout";
import { HOLO } from "@/lib/holoColors";

// A glowing arc from the forge to a covered target + a small craft glyph that flies along it.
// Craft size by tier: STRIKE_L large, ISR_M medium, SCOUT_S small. The fly-out IS the launch
// animation that plays on every (re)assignment.
const TIER_SCALE: Record<string, number> = { STRIKE_L: 0.34, ISR_M: 0.26, SCOUT_S: 0.18 };

export function AssignmentTrail({ trail }: { trail: TrailLayout }) {
  const craft = useRef<Group>(null);
  const from = useMemo(() => new Vector3(...trail.from), [trail.from]);
  const to = useMemo(() => new Vector3(...trail.to), [trail.to]);
  const mid = useMemo(
    () => new Vector3().addVectors(from, to).multiplyScalar(0.5).setY(2.2),
    [from, to],
  );
  const scale = TIER_SCALE[trail.tierId] ?? 0.22;

  useFrame((state) => {
    if (!craft.current) return;
    const t = (Math.sin(state.clock.elapsedTime * 0.6) + 1) / 2;
    const omt = 1 - t;
    const x = omt * omt * from.x + 2 * omt * t * mid.x + t * t * to.x;
    const y = omt * omt * from.y + 2 * omt * t * mid.y + t * t * to.y;
    const z = omt * omt * from.z + 2 * omt * t * mid.z + t * t * to.z;
    craft.current.position.set(x, y, z);
  });

  return (
    <group>
      <QuadraticBezierLine start={from} mid={mid} end={to} color={HOLO.covered} lineWidth={1.4} transparent opacity={0.7} />
      <group ref={craft}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[scale * 0.6, scale * 1.6, 4]} />
          <meshStandardMaterial color={HOLO.covered} emissive={HOLO.covered} emissiveIntensity={0.7} flatShading />
        </mesh>
      </group>
    </group>
  );
}
