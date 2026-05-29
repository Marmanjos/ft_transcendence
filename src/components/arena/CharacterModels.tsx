import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type CharAnimState =
  | "idle"
  | "preview"
  | "attack"
  | "hit"
  | "victory"
  | "defeat";

function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t);
}
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function p(t: number, s: number, e: number) {
  return clamp((t - s) / (e - s), 0, 1);
}

interface CharacterProps {
  position: [number, number, number];
  side: "left" | "right";
  /** Override the default side-based rotation.y (e.g. 0 = face camera for selection) */
  rotationY?: number;
  animState: CharAnimState;
  onClick?: () => void;
  scale?: number;
}

// ─── TITAN ──────────────────────────────────────────────────────────────────

export function TitanCharacter({
  position,
  side,
  rotationY,
  animState,
  onClick,
  scale = 1,
}: CharacterProps) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const rArmRef = useRef<THREE.Group>(null);
  const lArmRef = useRef<THREE.Group>(null);
  const animStateRef = useRef(animState);
  const animStartRef = useRef(0);
  const ringRef = useRef<THREE.Mesh>(null);

  const dir = side === "left" ? 1 : -1;
  const [bx, by, bz] = position;

  const orange = "#cc3300";
  const orangeHot = "#ff6600";
  const amber = "#f59e0b";

  useFrame(({ clock }) => {
    if (animState !== animStateRef.current) {
      animStartRef.current = clock.elapsedTime;
      animStateRef.current = animState;
    }
    const t = clock.elapsedTime - animStartRef.current;
    const ct = clock.elapsedTime;
    const root = rootRef.current;
    const body = bodyRef.current;
    const rArm = rArmRef.current;
    const lArm = lArmRef.current;
    if (!root) return;

    root.position.set(bx, by, bz);
    root.rotation.set(0, 0, 0);
    if (body) body.rotation.set(0, 0, 0);
    if (rArm) rArm.rotation.set(0, 0, 0);
    if (lArm) lArm.rotation.set(0, 0, 0);

    switch (animState) {
      case "idle":
      case "preview": {
        root.position.y = by + Math.sin(ct * 1.5) * 0.05;
        if (rArm) rArm.rotation.x = Math.sin(ct * 1.2) * 0.06;
        if (lArm) lArm.rotation.x = Math.sin(ct * 1.2 + Math.PI) * 0.06;
        if (ringRef.current) {
          const mat = ringRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.25 + Math.sin(ct * 2.5) * 0.15;
          ringRef.current.scale.setScalar(1 + Math.sin(ct * 2.0) * 0.08);
        }
        break;
      }
      case "attack": {
        if (t < 0.13) {
          // Big wind-up: lurch back + cock the arm
          const pp = p(t, 0, 0.13);
          root.position.x = bx - dir * easeOut(pp) * 1.1;
          root.position.y = by - easeOut(pp) * 0.12;
          if (rArm) rArm.rotation.x = -easeOut(pp) * 1.5;
          if (lArm) lArm.rotation.x = -easeOut(pp) * 0.4;
          if (body) body.rotation.z = -dir * easeOut(pp) * 0.25;
        } else if (t < 0.38) {
          // Explosive forward lunge
          const pp = p(t, 0.13, 0.38);
          root.position.x = bx - dir * 1.1 + dir * easeInOut(pp) * 5.1;
          root.position.y = by - 0.12 + Math.sin(pp * Math.PI) * 0.3;
          if (rArm) rArm.rotation.x = -1.5 + easeOut(pp) * 2.8;
          if (lArm) lArm.rotation.x = -0.4 + easeOut(pp) * 0.8;
          if (body) body.rotation.z = dir * easeInOut(pp) * 0.35;
        } else if (t < 0.6) {
          // Hold at impact
          root.position.x = bx + dir * 4.0;
          if (rArm) rArm.rotation.x = 1.3;
          if (body) body.rotation.z = dir * 0.35;
        } else if (t < 1.05) {
          // Return
          const pp = p(t, 0.6, 1.05);
          root.position.x = bx + dir * 4.0 * (1 - easeOut(pp));
          root.position.y = by * easeOut(pp);
          if (rArm) rArm.rotation.x = 1.3 * (1 - pp);
          if (lArm) lArm.rotation.x = 0.4 * (1 - pp);
          if (body) body.rotation.z = dir * 0.35 * (1 - pp);
        }
        break;
      }
      case "hit": {
        if (t < 0.18) {
          const pp = p(t, 0, 0.18);
          root.position.x = bx - dir * easeOut(pp) * 3.5;
          root.rotation.z = -dir * easeOut(pp) * 0.65;
          root.position.y = by + easeOut(pp) * 0.55;
        } else if (t < 0.62) {
          const pp = p(t, 0.18, 0.62);
          root.position.x = bx - dir * 3.5 + Math.sin(pp * Math.PI * 5) * 0.22;
          root.rotation.z = -dir * 0.65 * (1 - pp);
          root.position.y = by + 0.55 * (1 - pp);
        } else if (t < 1.1) {
          const pp = p(t, 0.62, 1.1);
          root.position.x = (bx - dir * 3.5) * (1 - easeOut(pp)) + bx * easeOut(pp);
        }
        break;
      }
      case "victory": {
        root.position.y = by + Math.abs(Math.sin(t * 3.5)) * 0.65;
        if (rArm) rArm.rotation.z = -0.7;
        if (lArm) lArm.rotation.z = 0.7;
        if (body) body.rotation.z = Math.sin(t * 3.5) * 0.1;
        break;
      }
      case "defeat": {
        const pp = clamp(t / 0.9, 0, 1);
        root.rotation.z = dir * easeInOut(pp) * 1.35;
        root.position.y = by - easeInOut(pp) * 0.55;
        root.position.x = bx + dir * easeInOut(pp) * 0.4;
        break;
      }
    }
  });

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={[0, rotationY ?? (side === "left" ? Math.PI / 2 : -Math.PI / 2), 0]}
      scale={[scale, scale, scale]}
      onClick={onClick}
      onPointerOver={() => { document.body.style.cursor = onClick ? "pointer" : "auto"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}
    >
      <group ref={bodyRef}>
        {/* Legs */}
        <mesh position={[-0.27, 0.5, 0]}>
          <boxGeometry args={[0.28, 1.0, 0.3]} />
          <meshStandardMaterial color={orange} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.27, 0.5, 0]}>
          <boxGeometry args={[0.28, 1.0, 0.3]} />
          <meshStandardMaterial color={orange} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Knee pads */}
        <mesh position={[-0.27, 0.62, 0.12]}>
          <boxGeometry args={[0.32, 0.14, 0.1]} />
          <meshStandardMaterial color={amber} emissive="#553300" emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0.27, 0.62, 0.12]}>
          <boxGeometry args={[0.32, 0.14, 0.1]} />
          <meshStandardMaterial color={amber} emissive="#553300" emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Hip */}
        <mesh position={[0, 1.1, 0]}>
          <boxGeometry args={[0.72, 0.28, 0.5]} />
          <meshStandardMaterial color={orange} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 1.76, 0]}>
          <boxGeometry args={[0.9, 1.1, 0.55]} />
          <meshStandardMaterial color={orange} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Chest plate */}
        <mesh position={[0, 1.82, 0.28]}>
          <boxGeometry args={[0.66, 0.72, 0.06]} />
          <meshStandardMaterial color={orangeHot} emissive="#aa2200" emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Energy core */}
        <mesh position={[0, 1.78, 0.31]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color={amber} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 2.66, 0]}>
          <boxGeometry args={[0.62, 0.65, 0.55]} />
          <meshStandardMaterial color={orange} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Visor */}
        <mesh position={[0, 2.68, 0.28]}>
          <boxGeometry args={[0.5, 0.11, 0.05]} />
          <meshBasicMaterial color={amber} />
        </mesh>
        {/* Helmet top */}
        <mesh position={[0, 3.03, 0]}>
          <boxGeometry args={[0.48, 0.18, 0.42]} />
          <meshStandardMaterial color={orangeHot} emissive="#993300" emissiveIntensity={0.45} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Left arm */}
      <group ref={lArmRef} position={[-0.66, 1.76, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.3, 0.68, 0.3]} />
          <meshStandardMaterial color={orange} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.67, 0]}>
          <boxGeometry args={[0.38, 0.3, 0.38]} />
          <meshStandardMaterial color={orangeHot} emissive="#882200" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Right arm */}
      <group ref={rArmRef} position={[0.66, 1.76, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.3, 0.68, 0.3]} />
          <meshStandardMaterial color={orange} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.67, 0]}>
          <boxGeometry args={[0.38, 0.3, 0.38]} />
          <meshStandardMaterial color={orangeHot} emissive="#882200" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Ground glow ring */}
      {onClick && (
        <mesh
          ref={ringRef}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.72, 1.05, 24]} />
          <meshBasicMaterial color={amber} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── RAZOR ──────────────────────────────────────────────────────────────────

export function RazorCharacter({
  position,
  side,
  rotationY,
  animState,
  onClick,
  scale = 1,
}: CharacterProps) {
  const rootRef = useRef<THREE.Group>(null);
  const lArmRef = useRef<THREE.Group>(null);
  const rArmRef = useRef<THREE.Group>(null);
  const animStateRef = useRef(animState);
  const animStartRef = useRef(0);
  const ringRef = useRef<THREE.Mesh>(null);

  const dir = side === "left" ? 1 : -1;
  const [bx, by, bz] = position;
  const cyan = "#0e7490";
  const cyanHot = "#00ffff";

  useFrame(({ clock }) => {
    if (animState !== animStateRef.current) {
      animStartRef.current = clock.elapsedTime;
      animStateRef.current = animState;
    }
    const t = clock.elapsedTime - animStartRef.current;
    const ct = clock.elapsedTime;
    const root = rootRef.current;
    const lArm = lArmRef.current;
    const rArm = rArmRef.current;
    if (!root) return;

    root.position.set(bx, by, bz);
    root.rotation.set(0, 0, 0);
    if (lArm) lArm.rotation.set(0, 0, 0);
    if (rArm) rArm.rotation.set(0, 0, 0);

    switch (animState) {
      case "idle":
      case "preview": {
        root.position.y = by + Math.sin(ct * 2.0) * 0.07;
        if (lArm) lArm.rotation.x = Math.sin(ct * 1.8) * 0.08;
        if (rArm) rArm.rotation.x = Math.sin(ct * 1.8 + Math.PI) * 0.08;
        if (ringRef.current) {
          const mat = ringRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.25 + Math.sin(ct * 3.0) * 0.15;
          ringRef.current.scale.setScalar(1 + Math.sin(ct * 2.2) * 0.1);
        }
        break;
      }
      case "attack": {
        if (t < 0.09) {
          // Wind-up: drop low and lean back
          const pp = p(t, 0, 0.09);
          root.position.y = by - easeOut(pp) * 0.22;
          root.position.x = bx - dir * easeOut(pp) * 0.55;
          if (lArm) lArm.rotation.x = easeOut(pp) * 0.6;
          if (rArm) rArm.rotation.x = easeOut(pp) * 0.6;
        } else if (t < 0.29) {
          // Explosive dash
          const pp = p(t, 0.09, 0.29);
          root.position.x = bx - dir * 0.55 + dir * easeInOut(pp) * 4.8;
          root.position.y = by - 0.22 + Math.sin(pp * Math.PI) * 0.45;
          if (lArm) lArm.rotation.y = easeOut(pp) * 1.1;
          if (rArm) rArm.rotation.y = -easeOut(pp) * 1.1;
          if (lArm) lArm.rotation.x = 0.6 - easeOut(pp) * 0.6;
          if (rArm) rArm.rotation.x = 0.6 - easeOut(pp) * 0.6;
        } else if (t < 0.5) {
          // Hold at impact: blades crossed forward
          root.position.x = bx + dir * 4.25;
          if (lArm) lArm.rotation.y = 1.1;
          if (rArm) rArm.rotation.y = -1.1;
        } else if (t < 0.88) {
          const pp = p(t, 0.5, 0.88);
          root.position.x = bx + dir * 4.25 * (1 - easeOut(pp));
          if (lArm) lArm.rotation.y = 1.1 * (1 - pp);
          if (rArm) rArm.rotation.y = -1.1 * (1 - pp);
        }
        break;
      }
      case "hit": {
        if (t < 0.17) {
          const pp = p(t, 0, 0.17);
          root.position.x = bx - dir * easeOut(pp) * 3.4;
          root.rotation.z = dir * easeOut(pp) * 0.6;
          root.position.y = by + easeOut(pp) * 0.3;
        } else if (t < 0.58) {
          const pp = p(t, 0.17, 0.58);
          root.position.x = bx - dir * 3.4 + Math.sin(pp * Math.PI * 5) * 0.22;
          root.rotation.z = dir * 0.6 * (1 - pp);
          root.position.y = by + 0.3 * (1 - pp);
        } else if (t < 1.05) {
          const pp = p(t, 0.58, 1.05);
          root.position.x = (bx - dir * 3.4) * (1 - easeOut(pp)) + bx * easeOut(pp);
        }
        break;
      }
      case "victory": {
        root.position.y = by + Math.abs(Math.sin(t * 4.0)) * 0.6;
        if (lArm) lArm.rotation.z = 0.6;
        if (rArm) rArm.rotation.z = -0.6;
        break;
      }
      case "defeat": {
        const pp = clamp(t / 0.9, 0, 1);
        root.rotation.z = -dir * easeInOut(pp) * 1.3;
        root.position.y = by - easeInOut(pp) * 0.5;
        break;
      }
    }
  });

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={[0, rotationY ?? (side === "left" ? Math.PI / 2 : -Math.PI / 2), 0]}
      scale={[scale, scale, scale]}
      onClick={onClick}
      onPointerOver={() => { document.body.style.cursor = onClick ? "pointer" : "auto"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}
    >
      {/* Legs */}
      <mesh position={[-0.2, 0.5, 0]}>
        <boxGeometry args={[0.2, 1.0, 0.25]} />
        <meshStandardMaterial color={cyan} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.2, 0.5, 0]}>
        <boxGeometry args={[0.2, 1.0, 0.25]} />
        <meshStandardMaterial color={cyan} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Leg accents */}
      <mesh position={[-0.2, 0.58, 0.13]}>
        <boxGeometry args={[0.22, 0.06, 0.04]} />
        <meshBasicMaterial color={cyanHot} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0.2, 0.58, 0.13]}>
        <boxGeometry args={[0.22, 0.06, 0.04]} />
        <meshBasicMaterial color={cyanHot} transparent opacity={0.9} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.55, 1.2, 0.42]} />
        <meshStandardMaterial color={cyan} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Core line */}
      <mesh position={[0, 1.65, 0.21]}>
        <boxGeometry args={[0.06, 0.62, 0.04]} />
        <meshBasicMaterial color={cyanHot} />
      </mesh>

      {/* Left blade arm */}
      <group ref={lArmRef} position={[-0.4, 1.78, 0]}>
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.2, 0.62, 0.2]} />
          <meshStandardMaterial color={cyan} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Outer blade */}
        <mesh position={[-0.48, -0.12, 0.04]} rotation={[0, 0, 0.18]}>
          <boxGeometry args={[0.06, 1.15, 0.04]} />
          <meshBasicMaterial color={cyanHot} transparent opacity={0.9} />
        </mesh>
        {/* Inner blade */}
        <mesh position={[-0.28, -0.12, 0.04]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.04, 0.85, 0.04]} />
          <meshBasicMaterial color={cyanHot} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Right blade arm */}
      <group ref={rArmRef} position={[0.4, 1.78, 0]}>
        <mesh position={[0, -0.12, 0]}>
          <boxGeometry args={[0.2, 0.62, 0.2]} />
          <meshStandardMaterial color={cyan} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.48, -0.12, 0.04]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.06, 1.15, 0.04]} />
          <meshBasicMaterial color={cyanHot} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0.28, -0.12, 0.04]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.04, 0.85, 0.04]} />
          <meshBasicMaterial color={cyanHot} transparent opacity={0.7} />
        </mesh>
      </group>

      {/* Head */}
      <mesh position={[0, 2.67, 0]}>
        <boxGeometry args={[0.46, 0.55, 0.42]} />
        <meshStandardMaterial color={cyan} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Fin */}
      <mesh position={[0, 2.97, 0]}>
        <boxGeometry args={[0.08, 0.5, 0.32]} />
        <meshStandardMaterial color="#0e4a5e" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 2.69, 0.21]}>
        <boxGeometry args={[0.4, 0.1, 0.05]} />
        <meshBasicMaterial color={cyanHot} />
      </mesh>

      {onClick && (
        <mesh
          ref={ringRef}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.72, 1.05, 24]} />
          <meshBasicMaterial color={cyanHot} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── WRAITH ─────────────────────────────────────────────────────────────────

export function WraithCharacter({
  position,
  side,
  rotationY,
  animState,
  onClick,
  scale = 1,
}: CharacterProps) {
  const rootRef = useRef<THREE.Group>(null);
  const lArmRef = useRef<THREE.Group>(null);
  const rArmRef = useRef<THREE.Group>(null);
  const animStateRef = useRef(animState);
  const animStartRef = useRef(0);
  const ringRef = useRef<THREE.Mesh>(null);
  const lOrbRef = useRef<THREE.Mesh>(null);
  const rOrbRef = useRef<THREE.Mesh>(null);

  const dir = side === "left" ? 1 : -1;
  const [bx, by, bz] = position;
  const purple = "#581c87";
  const purpleHot = "#bb00ff";

  useFrame(({ clock }) => {
    if (animState !== animStateRef.current) {
      animStartRef.current = clock.elapsedTime;
      animStateRef.current = animState;
    }
    const t = clock.elapsedTime - animStartRef.current;
    const ct = clock.elapsedTime;
    const root = rootRef.current;
    const lArm = lArmRef.current;
    const rArm = rArmRef.current;
    if (!root) return;

    root.position.set(bx, by, bz);
    root.rotation.set(0, 0, 0);
    if (lArm) lArm.rotation.set(0, 0, 0);
    if (rArm) rArm.rotation.set(0, 0, 0);

    if (lOrbRef.current) {
      const mat = lOrbRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setStyle(animState === "attack" ? "#ffffff" : purpleHot);
    }
    if (rOrbRef.current) {
      const mat = rOrbRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setStyle(animState === "attack" ? "#ffffff" : purpleHot);
    }

    switch (animState) {
      case "idle":
      case "preview": {
        root.position.y = by + Math.sin(ct * 1.2) * 0.1;
        if (lArm) lArm.rotation.z = Math.sin(ct * 0.9) * 0.12;
        if (rArm) rArm.rotation.z = Math.sin(ct * 0.9 + Math.PI) * 0.12;
        if (ringRef.current) {
          const mat = ringRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.2 + Math.sin(ct * 1.8) * 0.12;
          ringRef.current.scale.setScalar(1 + Math.sin(ct * 1.5) * 0.12);
        }
        break;
      }
      case "attack": {
        if (t < 0.18) {
          // Rise up and charge orbs
          const pp = p(t, 0, 0.18);
          root.position.y = by + easeOut(pp) * 1.1;
          if (lArm) lArm.rotation.x = -easeOut(pp) * 0.9;
          if (rArm) rArm.rotation.x = -easeOut(pp) * 0.9;
          if (lArm) lArm.rotation.z = -easeOut(pp) * 0.4;
          if (rArm) rArm.rotation.z = easeOut(pp) * 0.4;
        } else if (t < 0.42) {
          // Surge forward — spectral glide
          const pp = p(t, 0.18, 0.42);
          root.position.y = by + 1.1;
          root.position.x = bx + dir * easeInOut(pp) * 3.2;
          if (lArm) lArm.rotation.z = -0.4 - easeOut(pp) * 0.9;
          if (rArm) rArm.rotation.z = 0.4 + easeOut(pp) * 0.9;
        } else if (t < 0.68) {
          // Impact hold
          root.position.y = by + 1.1;
          root.position.x = bx + dir * 3.2;
          if (lArm) lArm.rotation.z = -1.3;
          if (rArm) rArm.rotation.z = 1.3;
        } else if (t < 1.15) {
          const pp = p(t, 0.68, 1.15);
          root.position.x = (bx + dir * 3.2) * (1 - easeOut(pp)) + bx * easeOut(pp);
          root.position.y = by + 1.1 * (1 - pp);
          if (lArm) lArm.rotation.z = -1.3 * (1 - pp);
          if (rArm) rArm.rotation.z = 1.3 * (1 - pp);
          if (lArm) lArm.rotation.x = -0.9 * (1 - pp);
          if (rArm) rArm.rotation.x = -0.9 * (1 - pp);
        }
        break;
      }
      case "hit": {
        if (t < 0.17) {
          const pp = p(t, 0, 0.17);
          root.position.x = bx - dir * easeOut(pp) * 3.0;
          root.position.y = by - easeOut(pp) * 0.5;
          root.rotation.z = dir * easeOut(pp) * 0.55;
        } else if (t < 0.56) {
          const pp = p(t, 0.17, 0.56);
          root.position.x = bx - dir * 3.0 + Math.sin(pp * Math.PI * 5) * 0.2;
          root.rotation.z = dir * 0.55 * (1 - pp);
          root.position.y = by - 0.5 * (1 - pp);
        } else if (t < 1.05) {
          const pp = p(t, 0.56, 1.05);
          root.position.x = (bx - dir * 3.0) * (1 - easeOut(pp)) + bx * easeOut(pp);
        }
        break;
      }
      case "victory": {
        root.position.y = by + 0.5 + Math.sin(t * 2.5) * 0.25;
        if (lArm) lArm.rotation.z = -Math.PI * 0.35;
        if (rArm) rArm.rotation.z = Math.PI * 0.35;
        break;
      }
      case "defeat": {
        const pp = clamp(t / 0.85, 0, 1);
        root.position.y = by - easeInOut(pp) * 0.65;
        root.rotation.x = easeInOut(pp) * 0.8;
        break;
      }
    }
  });

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={[0, rotationY ?? (side === "left" ? Math.PI / 2 : -Math.PI / 2), 0]}
      scale={[scale, scale, scale]}
      onClick={onClick}
      onPointerOver={() => { document.body.style.cursor = onClick ? "pointer" : "auto"; }}
      onPointerOut={() => { document.body.style.cursor = "auto"; }}
    >
      {/* Robe bottom */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.15, 0.78, 1.8, 8]} />
        <meshStandardMaterial color={purple} emissive="#1a0033" emissiveIntensity={0.3} metalness={0.1} roughness={0.8} />
      </mesh>
      {/* Upper body */}
      <mesh position={[0, 2.0, 0]}>
        <cylinderGeometry args={[0.12, 0.35, 1.0, 8]} />
        <meshStandardMaterial color={purple} emissive="#1a0033" emissiveIntensity={0.3} metalness={0.1} roughness={0.8} />
      </mesh>

      {/* Left arm */}
      <group ref={lArmRef} position={[-0.48, 2.05, 0]}>
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0.25]}>
          <boxGeometry args={[0.14, 0.82, 0.14]} />
          <meshStandardMaterial color={purple} emissive="#1a0033" emissiveIntensity={0.3} />
        </mesh>
        <mesh ref={lOrbRef} position={[-0.42, -0.26, 0]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshBasicMaterial color={purpleHot} transparent opacity={0.9} />
        </mesh>
      </group>

      {/* Right arm */}
      <group ref={rArmRef} position={[0.48, 2.05, 0]}>
        <mesh position={[0, 0, 0]} rotation={[0, 0, -0.25]}>
          <boxGeometry args={[0.14, 0.82, 0.14]} />
          <meshStandardMaterial color={purple} emissive="#1a0033" emissiveIntensity={0.3} />
        </mesh>
        <mesh ref={rOrbRef} position={[0.42, -0.26, 0]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshBasicMaterial color={purpleHot} transparent opacity={0.9} />
        </mesh>
      </group>

      {/* Head */}
      <mesh position={[0, 2.88, 0]}>
        <sphereGeometry args={[0.38, 12, 12]} />
        <meshStandardMaterial color={purple} emissive="#1a0033" emissiveIntensity={0.3} />
      </mesh>
      {/* Hood */}
      <mesh position={[0, 3.1, 0.1]}>
        <boxGeometry args={[0.42, 0.5, 0.14]} />
        <meshStandardMaterial color="#3b0764" emissive="#0d0020" emissiveIntensity={0.2} />
      </mesh>
      {/* Crown */}
      <mesh position={[0, 3.38, 0]}>
        <coneGeometry args={[0.08, 0.42, 5]} />
        <meshBasicMaterial color={purpleHot} transparent opacity={0.85} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.14, 2.9, 0.36]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color={purpleHot} />
      </mesh>
      <mesh position={[0.14, 2.9, 0.36]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color={purpleHot} />
      </mesh>

      {onClick && (
        <mesh
          ref={ringRef}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.72, 1.05, 24]} />
          <meshBasicMaterial color={purpleHot} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ─── MYSTERY (AI unknown during countdown) ───────────────────────────────────

export function MysteryCharacter({
  position,
  side,
}: {
  position: [number, number, number];
  side: "left" | "right";
}) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    rootRef.current.position.y =
      position[1] + Math.sin(clock.elapsedTime * 1.3) * 0.08;
  });

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={[0, side === "left" ? Math.PI / 2 : -Math.PI / 2, 0]}
    >
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.28, 1.0, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 1.76, 0]}>
        <boxGeometry args={[0.9, 1.4, 0.55]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 2.66, 0]}>
        <boxGeometry args={[0.62, 0.65, 0.55]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
      </mesh>
      <mesh position={[-0.66, 1.76, 0]}>
        <boxGeometry args={[0.3, 0.9, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.66, 1.76, 0]}>
        <boxGeometry args={[0.3, 0.9, 0.3]} />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.7} />
      </mesh>
      {/* Question mark glow */}
      <mesh position={[0, 1.5, 0.3]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ─── FACTORY ─────────────────────────────────────────────────────────────────

export function CharacterByType({
  type,
  position,
  side,
  rotationY,
  animState,
  onClick,
  scale,
}: {
  type: string;
  position: [number, number, number];
  side: "left" | "right";
  rotationY?: number;
  animState: CharAnimState;
  onClick?: () => void;
  scale?: number;
}) {
  switch (type) {
    case "TITAN":
      return (
        <TitanCharacter
          position={position}
          side={side}
          rotationY={rotationY}
          animState={animState}
          onClick={onClick}
          scale={scale}
        />
      );
    case "RAZOR":
      return (
        <RazorCharacter
          position={position}
          side={side}
          rotationY={rotationY}
          animState={animState}
          onClick={onClick}
          scale={scale}
        />
      );
    case "WRAITH":
      return (
        <WraithCharacter
          position={position}
          side={side}
          rotationY={rotationY}
          animState={animState}
          onClick={onClick}
          scale={scale}
        />
      );
    default:
      return null;
  }
}
