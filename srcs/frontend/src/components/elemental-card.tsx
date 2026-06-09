import { motion } from "framer-motion";
import { Elemental } from "@workspace/api-client-react";
import { getElementalAsset } from "@/hooks/use-elemental-asset";

interface ElementalCardProps {
  type: Elemental;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

const ELEMENTAL_CONFIG = {
  [Elemental.TITAN]: {
    name: "TITAN",
    color: "hsl(var(--titan))",
    bgClass: "bg-amber-950/40",
    borderClass: "border-amber-500",
    textClass: "text-amber-500",
    glowClass: "shadow-[0_0_15px_hsl(var(--titan)/0.5)]",
    icon: "🛡️", // Actually, prompt said NO EMOJIS.
    symbol: "T",
    description: "Guerreiro de Armadura Pesada",
    beats: Elemental.RAZOR,
    weakness: Elemental.WRAITH
  },
  [Elemental.RAZOR]: {
    name: "RAZOR",
    color: "hsl(var(--razor))",
    bgClass: "bg-cyan-950/40",
    borderClass: "border-cyan-500",
    textClass: "text-cyan-500",
    glowClass: "shadow-[0_0_15px_hsl(var(--razor)/0.5)]",
    icon: "⚔️",
    symbol: "R",
    description: "Espadachim de Plasma",
    beats: Elemental.WRAITH,
    weakness: Elemental.TITAN
  },
  [Elemental.WRAITH]: {
    name: "WRAITH",
    color: "hsl(var(--wraith))",
    bgClass: "bg-purple-950/40",
    borderClass: "border-purple-500",
    textClass: "text-purple-500",
    glowClass: "shadow-[0_0_15px_hsl(var(--wraith)/0.5)]",
    icon: "🔮",
    symbol: "W",
    description: "Manipulador de Energia",
    beats: Elemental.TITAN,
    weakness: Elemental.RAZOR
  }
};

export function ElementalCard({ type, selected, disabled, onClick, size = "md" }: ElementalCardProps) {
  const config = ELEMENTAL_CONFIG[type];

  const sizeClasses = {
    sm: "w-24 h-32 text-xs",
    md: "w-48 h-64 text-sm",
    lg: "w-64 h-80 text-base"
  };

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05, y: -5 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-between p-4 rounded-xl
        border-2 transition-all duration-300 overflow-hidden
        ${sizeClasses[size]}
        ${config.bgClass}
        ${selected ? `${config.borderClass} ${config.glowClass}` : "border-muted/50"}
        ${disabled && !selected ? "opacity-50 grayscale" : "cursor-pointer"}
        ${!disabled && !selected ? `hover:${config.borderClass}` : ""}
      `}
      style={{
        boxShadow: selected ? `0 0 20px ${config.color}40, inset 0 0 20px ${config.color}20` : 'none'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-0" />
      
      <div className="relative z-10 w-full flex justify-between items-start">
        <span className={`font-bold ${config.textClass} tracking-widest text-lg`}>
          {config.symbol}
        </span>
        {selected && (
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: config.color }} />
        )}
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center w-full">
        <img
          src={getElementalAsset(type, 0)}
          alt={config.name}
          className="w-4/5 h-4/5 object-contain drop-shadow-lg"
          style={{ opacity: 0.95 }}
        />
      </div>

      <div className="relative z-10 w-full text-center">
        <h3 className={`font-bold tracking-widest uppercase mb-1 ${config.textClass}`}>
          {config.name}
        </h3>
        {size !== "sm" && (
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {config.description}
          </p>
        )}
      </div>
    </motion.button>
  );
}
