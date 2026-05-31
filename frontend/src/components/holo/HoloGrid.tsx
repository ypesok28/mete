"use client";
import { Grid } from "@react-three/drei";
import { HOLO } from "@/lib/holoColors";

// Emissive amber ground grid, radially faded at the edges (drei's Grid handles the fade).
// Disciplined: thin lines, low intensity — a tactical floor, not a light show.
export function HoloGrid() {
  return (
    <Grid
      args={[24, 24]}
      cellSize={0.8}
      cellThickness={0.6}
      cellColor={HOLO.structureDim}
      sectionSize={3.2}
      sectionThickness={1}
      sectionColor={HOLO.structure}
      fadeDistance={20}
      fadeStrength={2.2}
      infiniteGrid
      position={[0, -0.01, 0]}
    />
  );
}
