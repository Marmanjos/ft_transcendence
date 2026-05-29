import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const N = 32; // particle count

const ELEM_COLORS: Record<string, THREE.Color> = {
  TITAN:  new THREE.Color("#ff7700"),
  RAZOR:  new THREE.Color("#00ffff"),
  WRAITH: new THREE.Color("#cc00ff"),
};

export function ImpactParticles({
  gameState,
  attackerElemental,
  impactPos = [0, 1.8, 0],
}: {
  gameState: string;
  attackerElemental: string | null;
  impactPos?: [number, number, number];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Per-particle state (stored in flat arrays for perf)
  const vx = useRef(new Float32Array(N));
  const vy = useRef(new Float32Array(N));
  const vz = useRef(new Float32Array(N));
  const life = useRef(new Float32Array(N));  // max lifetime
  const alive = useRef(new Float32Array(N)); // 1 = active

  const timerRef = useRef(0);
  const prevGameState = useRef(gameState);
  const burstDoneRef = useRef(false);

  const color = ELEM_COLORS[attackerElemental ?? "RAZOR"] ?? new THREE.Color("#ffffff");

  // Trigger burst when ROUND_RESULT starts
  useEffect(() => {
    const entered = prevGameState.current !== "ROUND_RESULT" && gameState === "ROUND_RESULT";
    prevGameState.current = gameState;
    if (!entered) return;

    timerRef.current = 0;
    burstDoneRef.current = false;

    for (let i = 0; i < N; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevAngle = Math.random() * Math.PI * 0.5 + 0.2; // upward bias
      const speed = 3.5 + Math.random() * 5.0;
      vx.current[i] = Math.cos(angle) * Math.cos(elevAngle) * speed;
      vy.current[i] = Math.sin(elevAngle) * speed + 2.0;
      vz.current[i] = Math.sin(angle) * Math.cos(elevAngle) * speed * 0.6;
      life.current[i] = 0.7 + Math.random() * 0.9;
      alive.current[i] = 1;
    }
  }, [gameState]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const isActive = gameState === "ROUND_RESULT";
    if (!isActive && burstDoneRef.current) return;

    if (isActive) {
      timerRef.current += delta;
    }

    const t = timerRef.current;
    let anyAlive = false;

    for (let i = 0; i < N; i++) {
      if (!alive.current[i]) {
        dummy.position.set(0, -200, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const age = t / life.current[i];
      if (age > 1.0) {
        alive.current[i] = 0;
        dummy.position.set(0, -200, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      anyAlive = true;
      const px = impactPos[0] + vx.current[i] * t;
      const py = Math.max(impactPos[1] + vy.current[i] * t - 6.5 * t * t, 0.1);
      const pz = impactPos[2] + vz.current[i] * t;

      dummy.position.set(px, py, pz);
      const sc = (1 - age * 0.75) * 0.18;
      dummy.scale.setScalar(Math.max(sc, 0.001));
      dummy.rotation.set(t * 4 + i, t * 6 + i * 0.7, t * 5 + i * 1.1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Fade color
      const fadeColor = color.clone().multiplyScalar(Math.max(1 - age * 0.8, 0.2));
      mesh.setColorAt(i, fadeColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (!anyAlive) burstDoneRef.current = true;
  });

  // Also render a shockwave ring
  const ringRef = useRef<THREE.Mesh>(null);
  const ringTimerRef = useRef(0);
  const ringActiveRef = useRef(false);
  const prevGS2 = useRef(gameState);

  useEffect(() => {
    if (prevGS2.current !== "ROUND_RESULT" && gameState === "ROUND_RESULT") {
      ringTimerRef.current = 0;
      ringActiveRef.current = true;
    }
    prevGS2.current = gameState;
  }, [gameState]);

  useFrame((_, delta) => {
    const ring = ringRef.current;
    if (!ring || !ringActiveRef.current) return;
    ringTimerRef.current += delta;
    const t = ringTimerRef.current;
    const dur = 0.65;
    if (t > dur) {
      ring.visible = false;
      ringActiveRef.current = false;
      return;
    }
    ring.visible = true;
    const p = t / dur;
    ring.scale.setScalar(1 + p * 7);
    (ring.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.85;
    ring.position.set(impactPos[0], impactPos[1] - 1.2, impactPos[2]);
  });

  return (
    <>
      {/* Impact particle burst */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </instancedMesh>

      {/* Shockwave ring */}
      <mesh
        ref={ringRef}
        visible={false}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[impactPos[0], 0.08, impactPos[2]]}
      >
        <ringGeometry args={[0.3, 0.55, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
