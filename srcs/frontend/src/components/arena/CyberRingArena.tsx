import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function FlickerLight({
  position,
  color,
  baseIntensity,
  phase,
}: {
  position: [number, number, number];
  color: string;
  baseIntensity: number;
  phase: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const flicker =
      Math.sin(clock.elapsedTime * 3.5 + phase) * 0.2 +
      Math.sin(clock.elapsedTime * 7.1 + phase * 1.3) * 0.1 +
      (Math.random() < 0.01 ? (Math.random() - 0.5) * 0.6 : 0);
    lightRef.current.intensity = Math.max(0, baseIntensity + flicker * baseIntensity);
  });

  return (
    <pointLight
      ref={lightRef}
      position={position}
      intensity={baseIntensity}
      color={color}
      distance={35}
      decay={2}
    />
  );
}

function RingPost({ x, z, height = 6 }: { x: number; z: number; height?: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity =
      0.25 + Math.sin(clock.elapsedTime * 1.1 + x * 0.3) * 0.2;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.15, 0.2, height, 8]} />
        <meshStandardMaterial
          ref={matRef}
          color="#1a1a2e"
          emissive={new THREE.Color("#0044ff")}
          emissiveIntensity={0.3}
          metalness={0.95}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, height + 0.15, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial color="#0088ff" />
      </mesh>
    </group>
  );
}

function Rail({
  from,
  to,
  y,
  color,
}: {
  from: [number, number];
  to: [number, number];
  y: number;
  color: string;
}) {
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <mesh position={[cx, y, cz]} rotation={[0, angle, 0]}>
      <boxGeometry args={[0.07, 0.07, len]} />
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
}

function SpotlightRig({ x, color }: { x: number; color: string }) {
  return (
    <group>
      <spotLight
        position={[x, 18, -5]}
        angle={0.35}
        penumbra={0.6}
        intensity={200}
        color={color}
        target-position={[x * 0.3, 0, 0]}
        distance={35}
        decay={2}
        castShadow={false}
      />
      <mesh position={[x, 17.5, -5]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

export function CyberRingArena() {
  const ringFloorRef = useRef<THREE.MeshStandardMaterial>(null);
  const outerFloorRef = useRef<THREE.MeshStandardMaterial>(null);

  const sparks = useMemo(() => {
    const arr: { pos: [number, number, number]; phase: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const r = 10 + Math.random() * 5;
      arr.push({
        pos: [Math.cos(angle) * r, 0.1 + Math.random() * 4, Math.sin(angle) * r * 0.7] as [number, number, number],
        phase: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  const sparkRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    if (ringFloorRef.current) {
      ringFloorRef.current.emissiveIntensity =
        0.05 + Math.sin(clock.elapsedTime * 0.5) * 0.03;
    }
    if (outerFloorRef.current) {
      outerFloorRef.current.emissiveIntensity =
        0.03 + Math.sin(clock.elapsedTime * 0.3) * 0.02;
    }
    sparks.forEach((s, i) => {
      const mesh = sparkRefs.current[i];
      if (!mesh) return;
      const visible = Math.sin(clock.elapsedTime * 4 + s.phase) > 0.6;
      mesh.visible = visible;
      if (visible) {
        mesh.position.y = s.pos[1] + Math.sin(clock.elapsedTime * 8 + s.phase) * 0.3;
      }
    });
  });

  const postPositions: [number, number][] = [
    [-9, -9], [9, -9], [-9, 9], [9, 9],
    [-9, 0], [9, 0],
  ];

  const railsLow: { from: [number, number]; to: [number, number] }[] = [
    { from: [-9, -9], to: [9, -9] },
    { from: [-9,  9], to: [9,  9] },
    { from: [-9, -9], to: [-9, 9] },
    { from: [ 9, -9], to: [ 9, 9] },
  ];

  const railsMid: { from: [number, number]; to: [number, number] }[] = [
    { from: [-9, -9], to: [9, -9] },
    { from: [-9,  9], to: [9,  9] },
    { from: [-9, -9], to: [-9, 9] },
    { from: [ 9, -9], to: [ 9, 9] },
  ];

  return (
    <group>
      <fogExp2 attach="fog" args={["#050010", 0.028]} />

      <ambientLight intensity={0.15} color="#000833" />

      <FlickerLight position={[-14, 10, 0]}  color="#ff0066"  baseIntensity={70} phase={0} />
      <FlickerLight position={[ 14, 10, 0]}  color="#0066ff"  baseIntensity={70} phase={1.5} />
      <FlickerLight position={[  0, 14, -12]} color="#ffffff" baseIntensity={50} phase={0.8} />
      <FlickerLight position={[  0, 6,  0]}  color="#4400ff"  baseIntensity={25} phase={2.2} />
      <FlickerLight position={[ -9,  3, -9]} color="#ff2200"  baseIntensity={30} phase={3.1} />
      <FlickerLight position={[  9,  3,  9]} color="#0088ff"  baseIntensity={30} phase={0.4} />

      <SpotlightRig x={-10} color="#ff0088" />
      <SpotlightRig x={ 10} color="#0088ff" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial
          ref={outerFloorRef}
          color="#060606"
          emissive={new THREE.Color("#050015")}
          emissiveIntensity={0.04}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial
          ref={ringFloorRef}
          color="#0d0d1a"
          emissive={new THREE.Color("#000833")}
          emissiveIntensity={0.07}
          metalness={0.98}
          roughness={0.08}
        />
      </mesh>

      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[22.4, 0.25, 22.4]} />
        <meshStandardMaterial
          color="#0a0a18"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {postPositions.map(([x, z], i) => (
        <RingPost key={i} x={x} z={z} height={6} />
      ))}

      {railsLow.map((r, i) => (
        <Rail key={`lo-${i}`} from={r.from} to={r.to} y={2.2} color="#0044ff" />
      ))}
      {railsMid.map((r, i) => (
        <Rail key={`mid-${i}`} from={r.from} to={r.to} y={4.4} color="#ff0066" />
      ))}
      {railsLow.map((r, i) => (
        <Rail key={`hi-${i}`} from={r.from} to={r.to} y={6.0} color="#0088ff" />
      ))}

      <mesh position={[0, 16, -5]}>
        <boxGeometry args={[25, 0.3, 0.3]} />
        <meshBasicMaterial color="#334466" />
      </mesh>
      <mesh position={[0, 16, 5]}>
        <boxGeometry args={[25, 0.3, 0.3]} />
        <meshBasicMaterial color="#334466" />
      </mesh>

      {sparks.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => { sparkRefs.current[i] = el; }}
          position={s.pos}
        >
          <sphereGeometry args={[0.06, 4, 4]} />
          <meshBasicMaterial color="#88aaff" transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}
