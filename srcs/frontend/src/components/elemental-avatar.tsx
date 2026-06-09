import { Elemental } from "@workspace/api-client-react";
import { getElementalAsset } from "@/hooks/use-elemental-asset";

interface ElementalAvatarProps {
  elemental: Elemental;
  side?: "left" | "right";
  size?: number;
  faded?: boolean;
  fase?: number;
  result?: "win" | "lose";
}

const AVATAR_COLORS = {
  [Elemental.TITAN]: "#f59e0b",
  [Elemental.RAZOR]: "#06b6d4",
  [Elemental.WRAITH]: "#a855f7",
};

export function ElementalAvatar({ elemental, side = "left", size = 220, faded = false, fase = 1, result }: ElementalAvatarProps) {
  const flip = side === "right";
  const color = AVATAR_COLORS[elemental];
  const assetPath = getElementalAsset(elemental, fase, result);

  return (
    <div
      style={{
        width: size,
        height: Math.round(size * 1.45),
        opacity: faded ? 0.3 : 1,
        filter: faded ? "grayscale(0.6)" : undefined,
        position: "relative",
      }}
    >
      {/* Glow platform */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "70%",
          height: "20px",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${color}50, transparent 70%)`,
          filter: `blur(6px)`,
        }}
      />
      <img
        src={assetPath}
        alt={`${elemental} elemental`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: flip ? "scaleX(-1)" : "none",
        }}
      />
    </div>
  );
}
