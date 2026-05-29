import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function AnimatedHoloScreen({
  position,
  rotation,
  width,
  height,
  color,
  phase,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  color: string;
  phase: number;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity =
      0.4 + Math.sin(clock.elapsedTime * 1.2 + phase) * 0.25 +
      (Math.random() < 0.005 ? Math.random() * 1.5 : 0);
  });

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        ref={matRef}
        color="#000820"
        emissive={new THREE.Color(color)}
        emissiveIntensity={0.5}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function NeonBorderLine({
  start,
  end,
  color,
  phase,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  phase: number;
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.opacity =
      0.55 + Math.sin(clock.elapsedTime * 0.9 + phase) * 0.25;
  });

  const [cx, cy, cz] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <mesh position={[cx, cy, cz]} rotation={[0, angle, 0]}>
      <boxGeometry args={[0.06, 0.06, len]} />
      <meshBasicMaterial ref={matRef} color={color} transparent opacity={0.7} />
    </mesh>
  );
}

function Pillar({
  x,
  z,
  color,
}: {
  x: number;
  z: number;
  color: string;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.emissiveIntensity =
      0.3 + Math.sin(clock.elapsedTime * 0.7 + x) * 0.2;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[0.6, 10, 0.6]} />
        <meshStandardMaterial
          ref={matRef}
          color="#0a0a18"
          emissive={new THREE.Color(color)}
          emissiveIntensity={0.4}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 10.1, 0]}>
        <boxGeometry args={[1.0, 0.2, 1.0]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

export function NeonNexusArena() {
  const floorMatRef = useRef<THREE.MeshStandardMaterial>(null);

  const borderLines = useMemo(
    () => [
      { start: [-20, 0.05, -25] as [number,number,number], end: [20, 0.05, -25] as [number,number,number], color: "#ff00ff", phase: 0 },
      { start: [-20, 0.05,  25] as [number,number,number], end: [20, 0.05,  25] as [number,number,number], color: "#ff00ff", phase: 1 },
      { start: [-20, 0.05, -25] as [number,number,number], end: [-20, 0.05, 25] as [number,number,number], color: "#00ffff", phase: 2 },
      { start: [ 20, 0.05, -25] as [number,number,number], end: [ 20, 0.05, 25] as [number,number,number], color: "#00ffff", phase: 3 },
      { start: [ -8, 0.05, -8]  as [number,number,number], end: [  8, 0.05,  -8] as [number,number,number], color: "#9900ff", phase: 0.5 },
      { start: [ -8, 0.05,  8]  as [number,number,number], end: [  8, 0.05,   8] as [number,number,number], color: "#9900ff", phase: 1.5 },
      { start: [ -8, 0.05, -8]  as [number,number,number], end: [ -8, 0.05,   8] as [number,number,number], color: "#9900ff", phase: 2.5 },
      { start: [  8, 0.05, -8]  as [number,number,number], end: [  8, 0.05,   8] as [number,number,number], color: "#9900ff", phase: 3.5 },
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!floorMatRef.current) return;
    floorMatRef.current.emissiveIntensity =
      0.08 + Math.sin(clock.elapsedTime * 0.4) * 0.04;
  });

  return (
    <group>
      <fogExp2 attach="fog" args={["#14001f", 0.022]} />

      <ambientLight intensity={0.25} color="#220044" />

      <pointLight position={[-12, 8, 0]}  intensity={80}  color="#ff00ff" distance={40} decay={2} />
      <pointLight position={[ 12, 8, 0]}  intensity={80}  color="#00ffff" distance={40} decay={2} />
      <pointLight position={[  0, 12, -15]} intensity={60} color="#6600ff" distance={50} decay={2} />
      <pointLight position={[  0, 6,  0]}  intensity={30}  color="#ffffff" distance={25} decay={2} />
      <pointLight position={[-10, 3, -20]} intensity={40}  color="#ff00aa" distance={30} decay={2} />
      <pointLight position={[ 10, 3, -20]} intensity={40}  color="#00aaff" distance={30} decay={2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          ref={floorMatRef}
          color="#050816"
          emissive={new THREE.Color("#0d0028")}
          emissiveIntensity={0.1}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>

      {borderLines.map((l, i) => (
        <NeonBorderLine key={i} {...l} />
      ))}

      <Pillar x={-19} z={-24} color="#ff00ff" />
      <Pillar x={ 19} z={-24} color="#ff00ff" />
      <Pillar x={-19} z={ 24} color="#00ffff" />
      <Pillar x={ 19} z={ 24} color="#00ffff" />
      <Pillar x={-19} z={  0} color="#8800ff" />
      <Pillar x={ 19} z={  0} color="#8800ff" />

      <AnimatedHoloScreen
        position={[0, 6, -24.5]}
        rotation={[0, 0, 0]}
        width={32}
        height={10}
        color="#0044ff"
        phase={0}
      />
      <AnimatedHoloScreen
        position={[-19.5, 5, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={40}
        height={8}
        color="#ff00aa"
        phase={1.2}
      />
      <AnimatedHoloScreen
        position={[19.5, 5, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={40}
        height={8}
        color="#00ffaa"
        phase={2.4}
      />

      <mesh position={[0, -0.5, -24.8]}>
        <boxGeometry args={[40, 1, 0.4]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.3} />
      </mesh>
      <mesh position={[-19.8, -0.5, 0]}>
        <boxGeometry args={[0.4, 1, 50]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
      </mesh>
      <mesh position={[19.8, -0.5, 0]}>
        <boxGeometry args={[0.4, 1, 50]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
