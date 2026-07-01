// src/components/NeonArena.tsx

import { motion, AnimatePresence } from "framer-motion";
import { Elemental } from "@workspace/api-client-react";
import { ElementalCard } from "@/components/elemental-card";
import { ElementalAvatar } from "@/components/elemental-avatar";
import { RoundOutcome } from "@workspace/api-client-react";

type GameState = "SELECTING" | "COUNTDOWN" | "CLASH" | "ROUND_RESULT" | "MATCH_OVER";

interface NeonArenaProps {
  gameState: GameState;
  playerElemental: Elemental | null;
  aiElemental: Elemental | null;
  roundOutcome: RoundOutcome | null;
  countdown: number;
  onSelectElemental: (elemental: Elemental) => void;
}

// Array com os elementos disponíveis
const ELEMENTS = [Elemental.TITAN, Elemental.RAZOR, Elemental.WRAITH];

export function NeonArena({
  gameState,
  playerElemental,
  aiElemental,
  roundOutcome,
  countdown,
  onSelectElemental,
}: NeonArenaProps) {
  // Determina a cor do resultado
  const getOutcomeColor = () => {
    if (roundOutcome === RoundOutcome.WIN) return "text-primary border-primary";
    if (roundOutcome === RoundOutcome.LOSS) return "text-destructive border-destructive";
    return "text-white/50 border-white/50";
  };

  const getOutcomeText = () => {
    if (roundOutcome === RoundOutcome.WIN) return "VITÓRIA";
    if (roundOutcome === RoundOutcome.LOSS) return "DERROTA";
    return "EMPATE";
  };

  // Elemento padrão para fallback
  const defaultElemental = Elemental.TITAN;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black">
      {/* Fundo do ringue */}
      <div className="neon-ring-bg">
        <div className="ring-stage">
          <div className="ring-floor" />
          <div className="ring-ropes">
            <div className="ring-rope h top-1" />
            <div className="ring-rope h top-2" />
            <div className="ring-rope h top-3" />
            <div className="ring-rope h bot-1" />
            <div className="ring-rope h bot-2" />
            <div className="ring-rope h bot-3" />
            <div className="ring-rope v left-1" />
            <div className="ring-rope v left-2" />
            <div className="ring-rope v left-3" />
            <div className="ring-rope v right-1" />
            <div className="ring-rope v right-2" />
            <div className="ring-rope v right-3" />
          </div>
          <div className="ring-post tl" />
          <div className="ring-post tr" />
          <div className="ring-post bl" />
          <div className="ring-post br" />
        </div>
        <div className="ring-vignette" />
      </div>

      {/* Conteúdo da arena (por cima do ringue) */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full h-full px-4">
        <AnimatePresence mode="wait">
          {/* SELECTING - Mostra as cartas na PARTE INFERIOR */}
          {gameState === "SELECTING" && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-end w-full h-full pb-12 gap-4"
            >
              <p className="font-mono uppercase tracking-widest text-white/50 text-sm mb-2">
                Clique em um combatente para selecionar
              </p>
              <div className="flex gap-4 md:gap-6">
                {ELEMENTS.map((el) => (
                  <ElementalCard
                    key={el}
                    type={el}
                    size="lg"
                    onClick={() => onSelectElemental(el)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* COUNTDOWN - Mostra a contagem com os elementos ao fundo (CENTRO) */}
          {gameState === "COUNTDOWN" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center w-full h-full gap-8"
            >
              {/* Elementos durante a contagem */}
              <div className="flex items-center gap-12">
                {/* Jogador */}
                <div className="flex flex-col items-center gap-2">
                  <ElementalAvatar
                    elemental={playerElemental || defaultElemental}
                    side="left"
                    size={220}  // ✅ Aumentado para 220
                    animate="idle"
                  />
                  <p className="font-mono text-sm text-primary uppercase tracking-widest">
                    VOCÊ
                  </p>
                </div>

                {/* VS */}
                <div className="text-4xl font-bold text-white/20">VS</div>

                {/* IA */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <ElementalAvatar
                      elemental={aiElemental || defaultElemental}
                      side="right"
                      size={220}  // ✅ Aumentado para 220
                      animate="idle"
                    />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-destructive/80 rounded-full flex items-center justify-center text-sm font-black text-white">
                      ?
                    </div>
                  </div>
                  <p className="font-mono text-sm text-destructive uppercase tracking-widest">
                    IA
                  </p>
                </div>
              </div>

              {/* Número da contagem */}
              <motion.div
                key={`count-${countdown}`}
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[8rem] font-black leading-none"
                style={{
                  color: "#00ffff",
                  textShadow: "0 0 40px #00ffff, 0 0 80px #00ffff50",
                }}
              >
                {countdown > 0 ? countdown : "!"}
              </motion.div>
            </motion.div>
          )}

          {/* CLASH - Mostra o confronto dos elementos (CENTRO) */}
          {gameState === "CLASH" && (
            <div className="flex flex-col items-center justify-center w-full h-full gap-6">
              <div className="flex items-center gap-12">
                <motion.div
                  key="player-clash"
                  initial={{ x: -150, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center gap-2"
                >
                  <ElementalAvatar
                    elemental={playerElemental || defaultElemental}
                    side="left"
                    size={280}  // ✅ Aumentado para 280
                    animate="idle"
                  />
                  <p className="font-mono text-sm text-primary uppercase tracking-widest">
                    VOCÊ
                  </p>
                  {playerElemental && (
                    <p className="font-mono text-sm text-white/40 uppercase font-bold">
                      {playerElemental}
                    </p>
                  )}
                </motion.div>

                <motion.div
                  key="vs-clash"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.5, 1] }}
                  transition={{ duration: 0.6 }}
                  className="text-6xl md:text-7xl font-black text-white/30"
                >
                  ⚡
                </motion.div>

                <motion.div
                  key="ai-clash"
                  initial={{ x: 150, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center gap-2"
                >
                  <ElementalAvatar
                    elemental={aiElemental || defaultElemental}
                    side="right"
                    size={280}  // ✅ Aumentado para 280
                    animate="idle"
                  />
                  <p className="font-mono text-sm text-destructive uppercase tracking-widest">
                    IA
                  </p>
                  {aiElemental && (
                    <p className="font-mono text-sm text-white/40 uppercase font-bold">
                      {aiElemental}
                    </p>
                  )}
                </motion.div>
              </div>

              {/* Texto CLASH */}
              <motion.div
                key="clash-text"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.3, 1], opacity: [0, 1, 1] }}
                transition={{ duration: 0.5 }}
                className="text-6xl md:text-8xl font-black uppercase tracking-widest"
                style={{
                  color: "#fff",
                  textShadow: "0 0 40px #fff, 0 0 80px #00ffff",
                }}
              >
                CLASH
              </motion.div>

              {/* Efeito de onda */}
              <motion.div
                key="wave-effect"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 8, opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="w-32 h-32 rounded-full border-2 border-white absolute"
              />
            </div>
          )}

          {/* ROUND_RESULT - Mostra o resultado da ronda (CENTRO) */}
          {gameState === "ROUND_RESULT" && (
            <motion.div
              key="result"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="flex flex-col items-center justify-center w-full h-full gap-6"
            >
              <div className="flex items-center gap-12">
                <div className="flex flex-col items-center gap-2">
                  <ElementalAvatar
                    elemental={playerElemental || defaultElemental}
                    side="left"
                    size={240}  // ✅ Aumentado para 240
                    animate="idle"
                  />
                  <p className="font-mono text-sm text-primary uppercase tracking-widest">
                    VOCÊ
                  </p>
                  {playerElemental && (
                    <p className="font-mono text-sm text-white/40 uppercase font-bold">
                      {playerElemental}
                    </p>
                  )}
                </div>

                <div className="text-4xl font-bold text-white/30">VS</div>

                <div className="flex flex-col items-center gap-2">
                  <ElementalAvatar
                    elemental={aiElemental || defaultElemental}
                    side="right"
                    size={240}  // ✅ Aumentado para 240
                    animate="idle"
                  />
                  <p className="font-mono text-sm text-destructive uppercase tracking-widest">
                    IA
                  </p>
                  {aiElemental && (
                    <p className="font-mono text-sm text-white/40 uppercase font-bold">
                      {aiElemental}
                    </p>
                  )}
                </div>
              </div>

              {roundOutcome && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
                  className={`px-8 py-4 border-4 font-black text-4xl md:text-5xl uppercase tracking-widest text-center ${getOutcomeColor()}`}
                  style={{
                    boxShadow:
                      roundOutcome === RoundOutcome.WIN
                        ? "0 0 40px #00ffff, inset 0 0 40px rgba(0,255,255,0.1)"
                        : roundOutcome === RoundOutcome.LOSS
                        ? "0 0 40px #ff4444, inset 0 0 40px rgba(255,50,50,0.1)"
                        : "none",
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {getOutcomeText()}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}