"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { BuildResult, Target, Tier } from "@contract";
import { layoutBattlespace } from "@/lib/battlespaceLayout";
import { HOLO } from "@/lib/holoColors";
import { HoloGrid } from "./HoloGrid";
import { Forge } from "./Forge";
import { RangeRings } from "./RangeRings";
import { TargetMarker } from "./TargetMarker";
import { AssignmentTrail } from "./AssignmentTrail";

export interface BattlespaceStageProps {
  result: BuildResult;
  targets: Target[];
  tiers: Tier[];
}

export default function BattlespaceStage({ result, targets, tiers }: BattlespaceStageProps) {
  const layout = layoutBattlespace(result, targets, tiers);
  const fault = !result.feasible;

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 7.5, 9], fov: 42 }}
      style={{ background: HOLO.viewportBg }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 8, 4]} intensity={40} distance={30} color="#fff3df" />
      <HoloGrid />
      <RangeRings rings={layout.rangeRings} />
      <Forge fault={fault} />
      {layout.targets.map((t) => (
        <TargetMarker key={t.targetId} t={t} />
      ))}
      {layout.trails.map((tr) => (
        <AssignmentTrail key={tr.targetId} trail={tr} />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom
        zoomSpeed={0.8}
        minDistance={5}
        maxDistance={22}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.42}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.25}
      />
      <EffectComposer>
        <Bloom intensity={0.6} luminanceThreshold={0.25} luminanceSmoothing={0.5} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
