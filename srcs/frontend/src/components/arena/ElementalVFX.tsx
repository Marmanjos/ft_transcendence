import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ELEMENTAL_COLORS: Record<string, { primary: string; secondary: string }> = {
  TITAN:  { primary: "#ff4400", secondary: "#ff8800" },
  RAZOR:  { primary: "#00ffff", secondary: "#0088ff" },
  WRAITH: { primary: "#aa00ff", secondary: "#ff00cc" },
};

const COUNT = 45;

interface ElementalParticlesProps {
  elemental: string;
  side: "left" | "right";
  active: boolean;
}

function ElementalParticles({ elemental, side, active }: ElementalParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const config = ELEMENTAL_COLORS[elemental] ?? ELEMENTAL_COLORS.TITAN;
  const xBase = side === "left" ? -6 : 6;

  const data = useMemo(() => {
    const offsets: THREE.Vector3[] = [];
    const speeds: number[] = [];
    const phases: number[] = [];
    const radii: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2;
      const r = 1.5 + Math.random() * 2.5;
      offsets.push(
        new THREE.Vector3(
          Math.cos(angle) * r,
          Math.random() * 5,
          Math.sin(angle) * r * 0.5
        )
      );
      speeds.push(0.6 + Math.random() * 1.4);
      phases.push(Math.random() * Math.PI * 2);
      radii.push(r);
    }
    return { offsets, speeds, phases, radii };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (!active) {
      for (let i = 0; i < COUNT; i++) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      return;
    }

    timeRef.current += delta;
    for (let i = 0; i < COUNT; i++) {
      const t = timeRef.current * data.speeds[i] + data.phases[i];
      const yOsc = Math.sin(t * 0.8) * 1.5;
      const xOsc = Math.cos(t * 0.5) * 0.5;

      dummy.position.set(
        xBase + data.offsets[i].x + xOsc,
        data.offsets[i].y + yOsc,
        data.offsets[i].z
      );

      const scale = 0.7 + Math.sin(t * 2.5) * 0.3;
      dummy.scale.setScalar(scale);
      dummy.rotation.y = t;
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    switch (elemental) {
      case "TITAN":
        return <boxGeometry args={[0.12, 0.12, 0.12]} />;
      case "RAZOR":
        return <tetrahedronGeometry args={[0.09]} />;
      default:
        return <sphereGeometry args={[0.08, 5, 5]} />;
    }
  }, [elemental]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      {geometry}
      <meshBasicMaterial color={config.primary} transparent opacity={0.9} />
    </instancedMesh>
  );
}

interface ClashFlashProps {
  active: boolean;
  outcome: "WIN" | "LOSS" | "DRAW" | null | undefined;
}

function ClashFlash({ active, outcome }: ClashFlashProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    if (!active) {
      ringRef.current.scale.setScalar(0);
      return;
    }
    timeRef.current += delta;
    const scale = 1 + timeRef.current * 3;
    const opacity = Math.max(0, 1 - timeRef.current * 1.5);
    ringRef.current.scale.setScalar(scale);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    if (opacity <= 0) timeRef.current = 0;
  });

  const color =
    outcome === "WIN" ? "#00ffff" : outcome === "LOSS" ? "#ff2222" : "#ffffff";

  return (
    <mesh ref={ringRef} position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[3, 0.15, 8, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0} />
    </mesh>
  );
}

interface ElementalVFXProps {
  playerElemental: string | null | undefined;
  aiElemental: string | null | undefined;
  active: boolean;
  isClashing?: boolean;
  roundOutcome?: "WIN" | "LOSS" | "DRAW" | null;
}

export function ElementalVFX({
  playerElemental,
  aiElemental,
  active,
  isClashing = false,
  roundOutcome,
}: ElementalVFXProps) {
  return (
    <>
      {playerElemental && (
        <ElementalParticles
          elemental={playerElemental}
          side="left"
          active={active}
        />
      )}
      {aiElemental && (
        <ElementalParticles
          elemental={aiElemental}
          side="right"
          active={active}
        />
      )}
      <ClashFlash active={isClashing} outcome={roundOutcome} />
    </>
  );
}
