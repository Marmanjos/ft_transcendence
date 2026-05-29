import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ArenaType } from "./types";

interface ParticleSystemProps {
  count: number;
  spreadX: number;
  spreadZ: number;
  maxHeight: number;
  color: string;
  size: number;
  speedMult: number;
  baseOpacity?: number;
}

function ParticleSystem({
  count,
  spreadX,
  spreadZ,
  maxHeight,
  color,
  size,
  speedMult,
  baseOpacity = 0.85,
}: ParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const velocities: THREE.Vector3[] = [];
    const phases: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * spreadX * 2,
          Math.random() * maxHeight,
          (Math.random() - 0.5) * spreadZ * 2
        )
      );
      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.015 * speedMult,
          (Math.random() * 0.03 + 0.01) * speedMult,
          (Math.random() - 0.5) * 0.015 * speedMult
        )
      );
      phases.push(Math.random() * Math.PI * 2);
    }
    return { positions, velocities, phases };
  }, [count, spreadX, spreadZ, maxHeight, speedMult]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      data.positions[i].x += data.velocities[i].x * delta * 60;
      data.positions[i].y += data.velocities[i].y * delta * 60;
      data.positions[i].z += data.velocities[i].z * delta * 60;

      if (data.positions[i].y > maxHeight) {
        data.positions[i].y = 0;
        data.positions[i].x = (Math.random() - 0.5) * spreadX * 2;
        data.positions[i].z = (Math.random() - 0.5) * spreadZ * 2;
      }
      if (Math.abs(data.positions[i].x) > spreadX)
        data.positions[i].x *= -0.95;
      if (Math.abs(data.positions[i].z) > spreadZ)
        data.positions[i].z *= -0.95;

      const pulse = 0.6 + Math.sin(t * 1.5 + data.phases[i]) * 0.4;
      dummy.position.copy(data.positions[i]);
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[size, 4, 4]} />
      <meshBasicMaterial color={color} transparent opacity={baseOpacity} />
    </instancedMesh>
  );
}

export function ArenaParticles({ arenaType }: { arenaType: ArenaType }) {
  if (arenaType === "neon-nexus") {
    return (
      <>
        <ParticleSystem
          count={28}
          spreadX={22}
          spreadZ={18}
          maxHeight={12}
          color="#ff00ff"
          size={0.055}
          speedMult={0.7}
        />
        <ParticleSystem
          count={28}
          spreadX={22}
          spreadZ={18}
          maxHeight={12}
          color="#00ffff"
          size={0.045}
          speedMult={0.6}
        />
        <ParticleSystem
          count={12}
          spreadX={15}
          spreadZ={12}
          maxHeight={8}
          color="#cc44ff"
          size={0.07}
          speedMult={0.4}
          baseOpacity={0.6}
        />
      </>
    );
  }

  return (
    <>
      <ParticleSystem
        count={32}
        spreadX={22}
        spreadZ={18}
        maxHeight={12}
        color="#0077ff"
        size={0.05}
        speedMult={1.1}
      />
      <ParticleSystem
        count={24}
        spreadX={18}
        spreadZ={14}
        maxHeight={10}
        color="#ff0088"
        size={0.065}
        speedMult={0.9}
      />
      <ParticleSystem
        count={12}
        spreadX={12}
        spreadZ={10}
        maxHeight={7}
        color="#ff3300"
        size={0.05}
        speedMult={1.4}
        baseOpacity={0.7}
      />
    </>
  );
}
