import { motion } from "framer-motion";
import { Elemental } from "@workspace/api-client-react";

interface ElementalAvatarProps {
  elemental: Elemental;
  side?: "left" | "right";
  size?: number;
  animate?: "idle" | "attack" | "hit" | "victory" | "defeat";
  faded?: boolean;
}

function TitanSvg({ color = "#f59e0b", flip = false }: { color?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 200 300" width="100%" height="100%" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <defs>
        <filter id="titanGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="titanCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8dc" />
          <stop offset="60%" stopColor={color} />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="290" rx="55" ry="8" fill={color} opacity="0.2" />

      {/* Feet */}
      <rect x="65" y="260" width="28" height="22" rx="6" fill="#78350f" />
      <rect x="107" y="260" width="28" height="22" rx="6" fill="#78350f" />
      <rect x="62" y="272" width="34" height="8" rx="3" fill="#92400e" />
      <rect x="104" y="272" width="34" height="8" rx="3" fill="#92400e" />

      {/* Legs */}
      <rect x="68" y="205" width="30" height="62" rx="8" fill="#92400e" />
      <rect x="102" y="205" width="30" height="62" rx="8" fill="#92400e" />
      {/* Knee guards */}
      <rect x="63" y="228" width="38" height="14" rx="5" fill={color} />
      <rect x="99" y="228" width="38" height="14" rx="5" fill={color} />

      {/* Hip/waist */}
      <rect x="58" y="190" width="84" height="22" rx="5" fill="#78350f" />
      <rect x="72" y="192" width="56" height="18" rx="4" fill="#92400e" />

      {/* Torso - main body */}
      <rect x="52" y="110" width="96" height="85" rx="10" fill="#78350f" />
      {/* Chest plate */}
      <polygon points="65,115 135,115 140,185 60,185" fill="#92400e" />
      {/* Chest details */}
      <rect x="72" y="125" width="56" height="4" rx="2" fill={color} opacity="0.6" />
      <rect x="72" y="135" width="56" height="4" rx="2" fill={color} opacity="0.4" />

      {/* Energy core */}
      <circle cx="100" cy="155" r="16" fill="url(#titanCore)" filter="url(#titanGlow)" />
      <circle cx="100" cy="155" r="8" fill="#fff8dc" opacity="0.9" />

      {/* Left pauldron */}
      <ellipse cx="42" cy="118" rx="28" ry="16" fill="#92400e" />
      <rect x="18" y="108" width="40" height="20" rx="6" fill={color} />
      <rect x="18" y="108" width="40" height="6" rx="3" fill="#fef3c7" opacity="0.5" />

      {/* Right pauldron */}
      <ellipse cx="158" cy="118" rx="28" ry="16" fill="#92400e" />
      <rect x="142" y="108" width="40" height="20" rx="6" fill={color} />
      <rect x="142" y="108" width="40" height="6" rx="3" fill="#fef3c7" opacity="0.5" />

      {/* Left arm */}
      <rect x="20" y="128" width="24" height="58" rx="9" fill="#78350f" />
      {/* Left gauntlet / shield */}
      <rect x="12" y="178" width="36" height="28" rx="7" fill={color} />
      <rect x="14" y="180" width="32" height="8" rx="3" fill="#fef3c7" opacity="0.4" />

      {/* Right arm */}
      <rect x="156" y="128" width="24" height="58" rx="9" fill="#78350f" />
      {/* Right gauntlet */}
      <rect x="152" y="178" width="36" height="28" rx="7" fill={color} />

      {/* Neck */}
      <rect x="83" y="98" width="34" height="18" rx="4" fill="#78350f" />

      {/* Helmet */}
      <rect x="60" y="52" width="80" height="52" rx="14" fill="#78350f" />
      {/* Helmet ridge */}
      <rect x="72" y="42" width="56" height="18" rx="8" fill="#92400e" />
      <rect x="82" y="36" width="36" height="12" rx="6" fill={color} opacity="0.7" />
      {/* Helmet corner marks */}
      <rect x="60" y="52" width="10" height="4" rx="2" fill={color} />
      <rect x="130" y="52" width="10" height="4" rx="2" fill={color} />
      <rect x="60" y="98" width="10" height="4" rx="2" fill={color} />
      <rect x="130" y="98" width="10" height="4" rx="2" fill={color} />
      {/* Visor */}
      <rect x="65" y="75" width="70" height="14" rx="4" fill={color} filter="url(#titanGlow)" opacity="0.95" />
      <rect x="65" y="75" width="70" height="5" rx="2" fill="#fffbeb" opacity="0.6" />
      {/* Side vents */}
      <rect x="60" y="66" width="6" height="20" rx="2" fill="#92400e" />
      <rect x="134" y="66" width="6" height="20" rx="2" fill="#92400e" />
    </svg>
  );
}

function RazorSvg({ color = "#06b6d4", flip = false }: { color?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 200 300" width="100%" height="100%" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <defs>
        <filter id="razorGlow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor="#e0f7fa" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="292" rx="40" ry="6" fill={color} opacity="0.2" />

      {/* Feet - angular */}
      <polygon points="75,268 90,260 90,285 72,285" fill="#164e63" />
      <polygon points="110,260 125,268 128,285 110,285" fill="#164e63" />
      <polygon points="70,278 95,278 95,285 68,285" fill={color} opacity="0.8" />
      <polygon points="105,278 130,278 132,285 105,285" fill={color} opacity="0.8" />

      {/* Legs - slim */}
      <rect x="76" y="210" width="22" height="55" rx="5" fill="#155e75" />
      <rect x="102" y="210" width="22" height="55" rx="5" fill="#155e75" />
      {/* Leg accents */}
      <rect x="74" y="230" width="26" height="3" rx="1" fill={color} opacity="0.7" />
      <rect x="100" y="230" width="26" height="3" rx="1" fill={color} opacity="0.7" />
      <rect x="74" y="248" width="26" height="3" rx="1" fill={color} opacity="0.5" />
      <rect x="100" y="248" width="26" height="3" rx="1" fill={color} opacity="0.5" />

      {/* Waist */}
      <rect x="70" y="197" width="60" height="18" rx="4" fill="#0e7490" />
      <polygon points="85,197 115,197 118,215 82,215" fill="#155e75" />

      {/* Torso - sleek */}
      <rect x="66" y="115" width="68" height="86" rx="8" fill="#0e7490" />
      {/* Chest pattern - circuit-like */}
      <polygon points="78,120 122,120 126,195 74,195" fill="#155e75" />
      <line x1="100" y1="125" x2="100" y2="190" stroke={color} strokeWidth="2" opacity="0.4" />
      <line x1="80" y1="145" x2="120" y2="145" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <line x1="80" y1="165" x2="120" y2="165" stroke={color} strokeWidth="1.5" opacity="0.3" />
      {/* Core energy line */}
      <rect x="92" y="148" width="16" height="4" rx="2" fill={color} filter="url(#razorGlow)" />
      <circle cx="100" cy="155" r="6" fill={color} filter="url(#razorGlow)" opacity="0.9" />

      {/* Left shoulder */}
      <polygon points="45,112 66,112 66,130 40,130" fill="#0e7490" />
      <polygon points="42,112 66,112 66,118 40,118" fill={color} opacity="0.6" />

      {/* Right shoulder */}
      <polygon points="134,112 155,112 160,130 134,130" fill="#0e7490" />
      <polygon points="134,112 158,112 160,118 134,118" fill={color} opacity="0.6" />

      {/* Left arm - extends with blade */}
      <rect x="42" y="128" width="22" height="50" rx="6" fill="#0e7490" />
      {/* Left blade - extending outward */}
      <polygon points="10,148 44,140 44,165 10,170" fill={color} filter="url(#razorGlow)" opacity="0.9" />
      <polygon points="10,148 44,140 44,145 10,152" fill="#e0f7fa" opacity="0.7" />
      {/* Blade energy trail */}
      <line x1="10" y1="155" x2="44" y2="150" stroke="#e0f7fa" strokeWidth="1" opacity="0.5" />

      {/* Right arm */}
      <rect x="136" y="128" width="22" height="50" rx="6" fill="#0e7490" />
      {/* Right blade */}
      <polygon points="190,148 156,140 156,165 190,170" fill={color} filter="url(#razorGlow)" opacity="0.9" />
      <polygon points="190,148 156,140 156,145 190,152" fill="#e0f7fa" opacity="0.7" />

      {/* Neck */}
      <rect x="86" y="104" width="28" height="16" rx="3" fill="#0e7490" />

      {/* Head - pointed/angular helmet */}
      <polygon points="100,30 140,58 140,105 60,105 60,58" fill="#0e7490" />
      <polygon points="100,30 140,58 136,58 100,36 64,58 60,58" fill={color} opacity="0.5" />
      {/* Visor - wide angular */}
      <polygon points="62,68 138,68 140,85 60,85" fill={color} filter="url(#razorGlow)" opacity="0.95" />
      <polygon points="62,68 138,68 138,74 62,74" fill="#e0f7fa" opacity="0.6" />
      {/* Helmet side fins */}
      <polygon points="60,65 45,75 45,90 60,90" fill="#0e7490" />
      <polygon points="140,65 155,75 155,90 140,90" fill="#0e7490" />
      {/* Helmet chin */}
      <rect x="72" y="95" width="56" height="12" rx="3" fill="#155e75" />
      <rect x="78" y="97" width="44" height="3" rx="1" fill={color} opacity="0.4" />
    </svg>
  );
}

function WraithSvg({ color = "#a855f7", flip = false }: { color?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 220 310" width="100%" height="100%" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <defs>
        <filter id="wraithGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="wraithAura" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Aura base */}
      <ellipse cx="110" cy="295" rx="65" ry="12" fill={color} opacity="0.15" />
      <ellipse cx="110" cy="285" rx="50" ry="8" fill="url(#wraithAura)" />

      {/* Robe bottom - flowing tendrils */}
      <ellipse cx="110" cy="278" rx="72" ry="22" fill="#581c87" opacity="0.8" />
      {/* Robe tendrils */}
      <ellipse cx="60" cy="275" rx="14" ry="30" fill="#4c1d95" transform="rotate(-15,60,275)" />
      <ellipse cx="85" cy="280" rx="10" ry="24" fill="#581c87" />
      <ellipse cx="135" cy="280" rx="10" ry="24" fill="#581c87" />
      <ellipse cx="160" cy="275" rx="14" ry="30" fill="#4c1d95" transform="rotate(15,160,275)" />
      <ellipse cx="110" cy="275" rx="12" ry="35" fill="#4c1d95" />
      {/* Tendril tips with glow */}
      <ellipse cx="50" cy="295" rx="8" ry="4" fill={color} opacity="0.5" filter="url(#wraithGlow)" />
      <ellipse cx="170" cy="295" rx="8" ry="4" fill={color} opacity="0.5" filter="url(#wraithGlow)" />
      <ellipse cx="110" cy="300" rx="8" ry="4" fill={color} opacity="0.4" filter="url(#wraithGlow)" />

      {/* Main robe body */}
      <ellipse cx="110" cy="210" rx="68" ry="85" fill="#581c87" />
      <ellipse cx="110" cy="195" rx="55" ry="72" fill="#4c1d95" />

      {/* Robe inner shadow */}
      <ellipse cx="110" cy="215" rx="35" ry="55" fill="#3b0764" opacity="0.6" />

      {/* Floating runes on robe */}
      <text x="86" y="195" fontSize="14" fill={color} opacity="0.5" fontFamily="monospace">⬡</text>
      <text x="118" y="220" fontSize="10" fill={color} opacity="0.4" fontFamily="monospace">⬡</text>
      <text x="96" y="240" fontSize="8" fill={color} opacity="0.3" fontFamily="monospace">⬡</text>

      {/* Arms - flowing/ethereal */}
      {/* Left arm */}
      <path d="M 55,160 Q 20,155 8,130 Q 5,115 18,118 Q 30,118 45,140" fill="none" stroke="#7c3aed" strokeWidth="18" strokeLinecap="round" />
      <path d="M 55,160 Q 20,155 8,130" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.6" filter="url(#wraithGlow)" />
      {/* Left hand glow orb */}
      <circle cx="8" cy="128" r="12" fill={color} filter="url(#wraithGlow)" opacity="0.8" />
      <circle cx="8" cy="128" r="6" fill="#e9d5ff" opacity="0.9" />

      {/* Right arm */}
      <path d="M 165,160 Q 200,155 212,130 Q 215,115 202,118 Q 190,118 175,140" fill="none" stroke="#7c3aed" strokeWidth="18" strokeLinecap="round" />
      <path d="M 165,160 Q 200,155 212,130" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" opacity="0.6" filter="url(#wraithGlow)" />
      {/* Right hand glow orb */}
      <circle cx="212" cy="128" r="12" fill={color} filter="url(#wraithGlow)" opacity="0.8" />
      <circle cx="212" cy="128" r="6" fill="#e9d5ff" opacity="0.9" />

      {/* Neck */}
      <rect x="98" y="108" width="24" height="20" rx="4" fill="#4c1d95" />

      {/* Head - skull/mask */}
      <ellipse cx="110" cy="85" rx="42" ry="48" fill="#4c1d95" />
      <ellipse cx="110" cy="80" rx="38" ry="42" fill="#581c87" />

      {/* Hood */}
      <path d="M 68,95 Q 50,55 75,28 Q 100,5 110,10 Q 120,5 145,28 Q 170,55 152,95" fill="#3b0764" opacity="0.9" />
      <path d="M 78,90 Q 65,55 85,32 Q 100,15 110,18 Q 120,15 135,32 Q 155,55 142,90" fill="#4c1d95" opacity="0.5" />

      {/* Eye sockets */}
      <ellipse cx="95" cy="78" rx="12" ry="10" fill="#1e0035" />
      <ellipse cx="125" cy="78" rx="12" ry="10" fill="#1e0035" />
      {/* Glowing eyes */}
      <ellipse cx="95" cy="78" rx="8" ry="6" fill={color} filter="url(#wraithGlow)" opacity="0.9" />
      <ellipse cx="125" cy="78" rx="8" ry="6" fill={color} filter="url(#wraithGlow)" opacity="0.9" />
      <ellipse cx="95" cy="78" rx="4" ry="3" fill="#e9d5ff" />
      <ellipse cx="125" cy="78" rx="4" ry="3" fill="#e9d5ff" />

      {/* Nose/mouth area - skull details */}
      <ellipse cx="110" cy="96" rx="5" ry="6" fill="#3b0764" opacity="0.8" />
      <path d="M 96,108 Q 110,116 124,108" fill="none" stroke={color} strokeWidth="2" opacity="0.4" strokeLinecap="round" />

      {/* Crown/horns */}
      <polygon points="90,28 84,5 96,20" fill={color} opacity="0.7" filter="url(#wraithGlow)" />
      <polygon points="110,22 110,0 116,18" fill={color} opacity="0.9" filter="url(#wraithGlow)" />
      <polygon points="130,28 136,5 124,20" fill={color} opacity="0.7" filter="url(#wraithGlow)" />
    </svg>
  );
}

const AVATAR_COLORS = {
  [Elemental.TITAN]: "#f59e0b",
  [Elemental.RAZOR]: "#06b6d4",
  [Elemental.WRAITH]: "#a855f7",
};

const idleVariants = {
  TITAN: {
    y: [0, -4, 0] as number[],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const },
  },
  RAZOR: {
    y: [0, -8, 0] as number[],
    transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const },
  },
  WRAITH: {
    y: [0, -14, 0] as number[],
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const attackVariants = {
  left: { x: [0, 80, 0], transition: { duration: 0.6, times: [0, 0.4, 1] } },
  right: { x: [0, -80, 0], transition: { duration: 0.6, times: [0, 0.4, 1] } },
};

export function ElementalAvatar({ elemental, side = "left", size = 220, animate = "idle", faded = false }: ElementalAvatarProps) {
  const flip = side === "right";
  const color = AVATAR_COLORS[elemental];

  const avatarMotion =
    animate === "attack"
      ? attackVariants[side]
      : idleVariants[elemental];

  return (
    <motion.div
      animate={avatarMotion}
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
      {elemental === Elemental.TITAN && <TitanSvg color={color} flip={flip} />}
      {elemental === Elemental.RAZOR && <RazorSvg color={color} flip={flip} />}
      {elemental === Elemental.WRAITH && <WraithSvg color={color} flip={flip} />}
    </motion.div>
  );
}
