"use client";
import { HOLO } from "@/lib/holoColors";

// The field-forge node at origin: a faceted low-poly bronze solid with an emissive core.
// `fault` (CANNOT-BUILD) shifts it cold/red — the only state change this component carries.
export function Forge({ fault = false }: { fault?: boolean }) {
  const accent = fault ? HOLO.uncovered : HOLO.structure;
  return (
    <group position={[0, 0.25, 0]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={fault ? 0.5 : 0.9}
          metalness={0.6}
          roughness={0.35}
          flatShading
        />
      </mesh>
      <mesh position={[0, -0.34, 0]}>
        <cylinderGeometry args={[0.5, 0.62, 0.16, 6]} />
        <meshStandardMaterial color={HOLO.structureDim} metalness={0.5} roughness={0.5} flatShading />
      </mesh>
    </group>
  );
}
