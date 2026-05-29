import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArenaGameState } from "./types";

interface CameraConfig {
  position: [number, number, number];
  lookAt: [number, number, number];
  speed: number;
}

const CAMERA_STATES: Record<ArenaGameState, CameraConfig> = {
  SELECTING:    { position: [0, 8, 18],  lookAt: [0, 3, 0], speed: 1.5 },
  COUNTDOWN:    { position: [0, 5, 13],  lookAt: [0, 4, 0], speed: 2.5 },
  CLASH:        { position: [0, 4, 9],   lookAt: [0, 4, 0], speed: 4.0 },
  ROUND_RESULT: { position: [0, 6, 16],  lookAt: [0, 3, 0], speed: 1.8 },
  MATCH_OVER:   { position: [0, 11, 22], lookAt: [0, 2, 0], speed: 1.2 },
};

interface Props {
  gameState: ArenaGameState;
}

export function ArenaCamera({ gameState }: Props) {
  const { camera } = useThree();
  const clockRef = useRef(0);
  const lookAtRef = useRef(new THREE.Vector3(0, 3, 0));
  const targetLookRef = useRef(new THREE.Vector3(0, 3, 0));

  useEffect(() => {
    camera.position.set(0, 12, 22);
    camera.lookAt(0, 3, 0);
  }, [camera]);

  useEffect(() => {
    const cfg = CAMERA_STATES[gameState];
    targetLookRef.current.set(...cfg.lookAt);
  }, [gameState]);

  useFrame((_, delta) => {
    clockRef.current += delta;
    const cfg = CAMERA_STATES[gameState];

    const driftX =
      gameState === "SELECTING"
        ? Math.sin(clockRef.current * 0.12) * 2.5
        : 0;
    const driftY =
      gameState === "SELECTING"
        ? Math.sin(clockRef.current * 0.08) * 0.6
        : 0;

    const desired = new THREE.Vector3(
      cfg.position[0] + driftX,
      cfg.position[1] + driftY,
      cfg.position[2]
    );

    camera.position.lerp(desired, Math.min(delta * cfg.speed, 1));

    lookAtRef.current.lerp(targetLookRef.current, Math.min(delta * cfg.speed, 1));
    camera.lookAt(lookAtRef.current);
  });

  return null;
}
