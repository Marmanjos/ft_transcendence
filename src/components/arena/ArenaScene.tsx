import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import * as THREE from "three";
import { NeonNexusArena } from "./NeonNexusArena";
import { CyberRingArena } from "./CyberRingArena";
import { ArenaCamera } from "./ArenaCamera";
import { ArenaParticles } from "./ArenaParticles";
import { ElementalVFX } from "./ElementalVFX";
import type { ArenaSceneProps, ArenaType, ArenaGameState } from "./types";

function SceneContent({
  arenaType,
  gameState,
  playerElemental,
  aiElemental,
  roundOutcome,
}: {
  arenaType: ArenaType;
  gameState: ArenaGameState;
  playerElemental: string | null | undefined;
  aiElemental: string | null | undefined;
  roundOutcome?: "WIN" | "LOSS" | "DRAW" | null;
}) {
  const vfxActive =
    gameState === "CLASH" ||
    gameState === "ROUND_RESULT" ||
    gameState === "MATCH_OVER";

  const isClashing = gameState === "CLASH";

  const aberrationOffset = isClashing
    ? new THREE.Vector2(0.004, 0.004)
    : new THREE.Vector2(0.0008, 0.0008);

  return (
    <>
      <ArenaCamera gameState={gameState} />

      {arenaType === "neon-nexus" ? <NeonNexusArena /> : <CyberRingArena />}

      <ArenaParticles arenaType={arenaType} />

      <ElementalVFX
        playerElemental={playerElemental}
        aiElemental={aiElemental}
        active={vfxActive}
        isClashing={isClashing}
        roundOutcome={roundOutcome}
      />

      <EffectComposer>
        <Bloom
          intensity={arenaType === "neon-nexus" ? 1.4 : 1.8}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          offset={aberrationOffset}
          radialModulation={false}
          modulationOffset={0}
        />
        <Vignette
          darkness={arenaType === "neon-nexus" ? 0.65 : 0.75}
          offset={0.35}
        />
      </EffectComposer>
    </>
  );
}

export function ArenaScene({
  gameState = "SELECTING",
  playerElemental,
  aiElemental,
  roundOutcome,
}: ArenaSceneProps) {
  const [arenaType] = useState<ArenaType>(() =>
    Math.random() < 0.5 ? "neon-nexus" : "cyber-ring"
  );

  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const ctx =
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (!ctx) setWebglSupported(false);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported) {
    return <CSSFallbackBackground />;
  }

  return (
    <div className="fixed inset-0 z-[-1]">
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 200, position: [0, 10, 20] }}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
        }}
        dpr={[1, 1.5]}
        shadows={false}
        style={{ background: "#000000" }}
      >
        <SceneContent
          arenaType={arenaType}
          gameState={gameState}
          playerElemental={playerElemental}
          aiElemental={aiElemental}
          roundOutcome={roundOutcome}
        />
      </Canvas>
    </div>
  );
}

function CSSFallbackBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, #0a0a1a 0%, #000000 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "60%",
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.07) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          transform: "perspective(400px) rotateX(45deg)",
          transformOrigin: "bottom center",
          animation: "gridScroll 8s linear infinite",
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div
        className="absolute"
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(0,255,255,0.08) 0%, transparent 70%)",
          top: "10%",
          left: "-10%",
          animation: "pulse 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute"
        style={{
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,0,200,0.08) 0%, transparent 70%)",
          top: "10%",
          right: "-10%",
          animation: "pulse 4s ease-in-out infinite 2s",
        }}
      />
      <style>{`
        @keyframes gridScroll { from{background-position-y:0}to{background-position-y:60px} }
        @keyframes pulse { 0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.1)} }
      `}</style>
    </div>
  );
}
