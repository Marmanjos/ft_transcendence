import { useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Elemental, RoundOutcome } from "@workspace/api-client-react";
import { NeonNexusArena } from "./NeonNexusArena";
import { CyberRingArena } from "./CyberRingArena";
import { ArenaParticles } from "./ArenaParticles";
import { ImpactParticles } from "./ImpactParticles";
import {
  TitanCharacter,
  RazorCharacter,
  WraithCharacter,
  MysteryCharacter,
  CharacterByType,
  CharAnimState,
} from "./CharacterModels";

// ─── Types ──────────────────────────────────────────────────────────────────

type GameState = "SELECTING" | "COUNTDOWN" | "CLASH" | "ROUND_RESULT" | "MATCH_OVER";

export interface CombatSceneProps {
  gameState: GameState;
  playerElemental: Elemental | null;
  aiElemental: Elemental | null;
  roundOutcome: RoundOutcome | null;
  isPlayerWinner: boolean;
  onSelectElemental: (elemental: Elemental) => void;
}

// ─── Camera ─────────────────────────────────────────────────────────────────

const CAM_CONFIGS: Record<GameState, { eye: [number, number, number]; target: [number, number, number] }> = {
  SELECTING:    { eye: [0, 8.5, 22],  target: [0, 2.0,  7] },
  COUNTDOWN:    { eye: [0, 6.5, 17],  target: [0, 2.5,  1] },
  CLASH:        { eye: [0, 4.5, 13],  target: [0, 2.8,  0] },
  ROUND_RESULT: { eye: [0, 5.0, 14],  target: [0, 2.5,  0] },
  MATCH_OVER:   { eye: [0, 7.5, 20],  target: [0, 2.0,  0] },
};

function CombatCamera({ gameState }: { gameState: GameState }) {
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const eyeRef = useRef<THREE.Vector3>(new THREE.Vector3(...CAM_CONFIGS.SELECTING.eye));
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(...CAM_CONFIGS.SELECTING.target));

  useFrame(({ clock }) => {
    const cam = camRef.current;
    if (!cam) return;
    const cfg = CAM_CONFIGS[gameState];
    const drift = Math.sin(clock.elapsedTime * 0.22) * 0.35;

    eyeRef.current.lerp(
      new THREE.Vector3(cfg.eye[0] + drift, cfg.eye[1], cfg.eye[2]),
      0.035
    );
    targetRef.current.lerp(new THREE.Vector3(...cfg.target), 0.035);

    cam.position.copy(eyeRef.current);
    cam.lookAt(targetRef.current);
  });

  return <PerspectiveCamera ref={camRef} makeDefault fov={55} near={0.1} far={200} />;
}

// ─── Selection Pedestals (outside the battle ring) ───────────────────────────

const SEL_Z = 10;
const SEL_POSITIONS: [number, number, number][] = [
  [-4.2, 0, SEL_Z],
  [0,    0, SEL_Z],
  [4.2,  0, SEL_Z],
];
const SEL_COLORS = ["#f59e0b", "#00ffff", "#bb00ff"];
const ELEMENTALS = [Elemental.TITAN, Elemental.RAZOR, Elemental.WRAITH];

function SelectionPedestal({
  position,
  color,
  selected,
}: {
  position: [number, number, number];
  color: string;
  selected: boolean;
}) {
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [px, , pz] = position;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (glowRef.current) {
      glowRef.current.opacity = 0.55 + Math.sin(t * 2.0) * 0.3;
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(t * 1.8) * 0.1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        (selected ? 0.9 : 0.5) + Math.sin(t * 2.2) * 0.2;
    }
  });

  return (
    <group>
      {/* Platform disc */}
      <mesh position={[px, 0.06, pz]}>
        <cylinderGeometry args={[0.95, 1.05, 0.12, 16]} />
        <meshStandardMaterial
          color="#0a0a18"
          emissive={new THREE.Color(color)}
          emissiveIntensity={selected ? 0.6 : 0.25}
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Top face glow */}
      <mesh position={[px, 0.125, pz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.88, 24]} />
        <meshBasicMaterial ref={glowRef} color={color} transparent opacity={0.55} />
      </mesh>

      {/* Outer glow ring */}
      <mesh
        ref={ringRef}
        position={[px, 0.03, pz]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.0, 1.25, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* Elemental label strip (thin bar in front of pedestal) */}
      <mesh position={[px, 0.03, pz + 1.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 0.06]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function SelectionZone({
  onSelect,
}: {
  onSelect: (e: Elemental) => void;
}) {
  return (
    <>
      {ELEMENTALS.map((el, i) => (
        <SelectionPedestal
          key={el}
          position={SEL_POSITIONS[i]}
          color={SEL_COLORS[i]}
          selected={false}
        />
      ))}

      <TitanCharacter
        position={[SEL_POSITIONS[0][0], 0.13, SEL_POSITIONS[0][2]]}
        side="left"
        rotationY={0}
        animState="preview"
        onClick={() => onSelect(Elemental.TITAN)}
      />
      <RazorCharacter
        position={[SEL_POSITIONS[1][0], 0.13, SEL_POSITIONS[1][2]]}
        side="left"
        rotationY={0}
        animState="preview"
        onClick={() => onSelect(Elemental.RAZOR)}
      />
      <WraithCharacter
        position={[SEL_POSITIONS[2][0], 0.13, SEL_POSITIONS[2][2]]}
        side="left"
        rotationY={0}
        animState="preview"
        onClick={() => onSelect(Elemental.WRAITH)}
      />
    </>
  );
}

// ─── Battle Arena Floor Platform ─────────────────────────────────────────────

function ArenaCombatFloor() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lineMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.1 + Math.sin(t * 0.6) * 0.06;
    }
    if (lineMatRef.current) {
      lineMatRef.current.opacity = 0.6 + Math.sin(t * 1.4) * 0.25;
    }
  });

  return (
    <group>
      {/* Main battle platform slab */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[13, 0.12, 8]} />
        <meshStandardMaterial
          ref={matRef}
          color="#080820"
          emissive={new THREE.Color("#001833")}
          emissiveIntensity={0.12}
          metalness={0.95}
          roughness={0.08}
        />
      </mesh>

      {/* Center divider line */}
      <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.06, 7.6]} />
        <meshBasicMaterial ref={lineMatRef} color="#ffffff" transparent opacity={0.6} />
      </mesh>

      {/* Left corner markers */}
      {([-6, 6] as number[]).map((x) =>
        ([-3.7, 3.7] as number[]).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.13, z]}>
            <boxGeometry args={[0.45, 0.04, 0.06]} />
            <meshBasicMaterial color={x < 0 ? "#00ffff" : "#ff00aa"} />
          </mesh>
        ))
      )}

      {/* Edge neon strips */}
      {/* Front */}
      <mesh position={[0, 0.125, 4.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13, 0.07]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.7} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.125, -4.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13, 0.07]} />
        <meshBasicMaterial color="#ff00aa" transparent opacity={0.7} />
      </mesh>
      {/* Left */}
      <mesh position={[-6.52, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.7} />
      </mesh>
      {/* Right */}
      <mesh position={[6.52, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 8]} />
        <meshBasicMaterial color="#ff00aa" transparent opacity={0.7} />
      </mesh>

      {/* Player stand circle */}
      <mesh position={[-4.5, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 24]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      {/* AI stand circle */}
      <mesh position={[4.5, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 24]} />
        <meshBasicMaterial color="#ff00aa" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Walkway from selection zone to battle platform (connector strip) */}
      <mesh position={[0, 0.04, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 3.0]} />
        <meshStandardMaterial
          color="#050510"
          emissive={new THREE.Color("#000820")}
          emissiveIntensity={0.08}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Walkway edge lines */}
      <mesh position={[-1.25, 0.05, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.05, 3.0]} />
        <meshBasicMaterial color="#0088ff" transparent opacity={0.5} />
      </mesh>
      <mesh position={[1.25, 0.05, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.05, 3.0]} />
        <meshBasicMaterial color="#0088ff" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ─── Combat Characters ───────────────────────────────────────────────────────

const PLAYER_POS: [number, number, number] = [-4.5, 0.12, 0];
const AI_POS: [number, number, number]     = [4.5,  0.12, 0];

function getPlayerAnim(
  gs: GameState,
  outcome: RoundOutcome | null,
): CharAnimState {
  if (gs === "SELECTING" || gs === "COUNTDOWN" || gs === "CLASH") return "idle";
  if (gs === "ROUND_RESULT") {
    if (!outcome) return "idle";
    if (outcome === RoundOutcome.WIN) return "attack";
    if (outcome === RoundOutcome.LOSS) return "hit";
    return "idle";
  }
  return "idle";
}

function getAIAnim(
  gs: GameState,
  outcome: RoundOutcome | null,
): CharAnimState {
  if (gs === "SELECTING" || gs === "COUNTDOWN" || gs === "CLASH") return "idle";
  if (gs === "ROUND_RESULT") {
    if (!outcome) return "idle";
    if (outcome === RoundOutcome.LOSS) return "attack";
    if (outcome === RoundOutcome.WIN) return "hit";
    return "idle";
  }
  return "idle";
}

function getMatchAnim(isWinner: boolean): CharAnimState {
  return isWinner ? "victory" : "defeat";
}

// Derive attacker elemental from round outcome
function getAttackerElemental(
  outcome: RoundOutcome | null,
  playerEl: Elemental | null,
  aiEl: Elemental | null,
): string | null {
  if (!outcome) return null;
  if (outcome === RoundOutcome.WIN) return playerEl;
  if (outcome === RoundOutcome.LOSS) return aiEl;
  return playerEl; // DRAW: default to player for particle color
}

// ─── Scene Content ──────────────────────────────────────────────────────────

function SceneContent({
  gameState,
  playerElemental,
  aiElemental,
  roundOutcome,
  isPlayerWinner,
  onSelectElemental,
  arenaType,
}: CombatSceneProps & { arenaType: "neon-nexus" | "cyber-ring" }) {
  const playerAnim = gameState === "MATCH_OVER"
    ? getMatchAnim(isPlayerWinner)
    : getPlayerAnim(gameState, roundOutcome);
  const aiAnim = gameState === "MATCH_OVER"
    ? getMatchAnim(!isPlayerWinner)
    : getAIAnim(gameState, roundOutcome);

  const showCombatChars = gameState !== "SELECTING";
  const showMystery = showCombatChars && !aiElemental;

  const attackerElemental = getAttackerElemental(roundOutcome, playerElemental, aiElemental);

  return (
    <>
      <CombatCamera gameState={gameState} />

      {/* Ambient + battle lighting */}
      <ambientLight intensity={0.35} />
      <pointLight position={[-7, 9, 4]}  intensity={2.2} color="#00ffff" />
      <pointLight position={[7,  9, 4]}  intensity={2.2} color="#ff00aa" />
      <pointLight position={[0, 12, -5]} intensity={1.6} color="#6600ff" />
      {/* Selection zone fill light */}
      <pointLight position={[0, 8, 11]}  intensity={1.4} color="#4488ff" />

      {/* Arena environment */}
      {arenaType === "neon-nexus" ? <NeonNexusArena /> : <CyberRingArena />}
      <ArenaParticles arenaType={arenaType} />

      {/* Visible combat floor platform (always shown so ring has a base) */}
      <ArenaCombatFloor />

      {/* Selection phase — pedestals + clickable characters OUTSIDE the ring */}
      {gameState === "SELECTING" && (
        <SelectionZone onSelect={onSelectElemental} />
      )}

      {/* Combat phase — player */}
      {showCombatChars && playerElemental && (
        <CharacterByType
          type={playerElemental}
          position={PLAYER_POS}
          side="left"
          animState={playerAnim}
        />
      )}

      {/* Combat phase — AI revealed */}
      {showCombatChars && aiElemental && (
        <CharacterByType
          type={aiElemental}
          position={AI_POS}
          side="right"
          animState={aiAnim}
        />
      )}

      {/* AI mystery silhouette during countdown / clash */}
      {showMystery && <MysteryCharacter position={AI_POS} side="right" />}

      {/* Impact particles burst at center on ROUND_RESULT */}
      <ImpactParticles
        gameState={gameState}
        attackerElemental={attackerElemental}
        impactPos={[0, 1.8, 0]}
      />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={1.1} />
        <Vignette eskil={false} offset={0.3} darkness={0.65} />
      </EffectComposer>
    </>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

export function CombatScene(props: CombatSceneProps) {
  const arenaType = useMemo<"neon-nexus" | "cyber-ring">(
    () => (Math.random() < 0.5 ? "neon-nexus" : "cyber-ring"),
    []
  );

  return (
    <div className="fixed inset-0" style={{ zIndex: 0 }}>
      <Canvas
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 1.25]}
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 8.5, 22], fov: 55 }}
      >
        <SceneContent {...props} arenaType={arenaType} />
      </Canvas>
    </div>
  );
}
