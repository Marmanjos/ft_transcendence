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

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black">
      {/* Fundo do ringue (versão simplificada para a arena) */}
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
          {/* SELECTING - Mostra as cartas para escolher */}
          {gameState === "SELECTING" && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-8"
            >
              <p className="font-mono uppercase tracking-widest text-white/50 text-sm">
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

          {/* COUNTDOWN - Mostra os números da contagem regressiva */}
          {gameState === "COUNTDOWN" && (
            <motion.div
              key="countdown"
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[9rem] font-black leading-none"
              style={{
                color: "#00ffff",
                textShadow: "0 0 40px #00ffff, 0 0 80px #00ffff50",
              }}
            >
              {countdown > 0 ? countdown : "!"}
            </motion.div>
          )}

          {/* CLASH - Animação do confronto */}
          {gameState === "CLASH" && (
            <motion.div
              key="clash"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.3, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-4"
            >
              <div
                className="text-6xl md:text-8xl font-black uppercase tracking-widest"
                style={{
                  color: "#fff",
                  textShadow: "0 0 40px #fff, 0 0 80px #00ffff",
                }}
              >
                CLASH
              </div>
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="w-20 h-20 rounded-full border-2 border-white absolute"
              />
            </motion.div>
          )}

          {/* ROUND_RESULT - Mostra o resultado da ronda */}
          {gameState === "ROUND_RESULT" && roundOutcome && (
            <motion.div
              key="result"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="flex flex-col items-center gap-6"
            >
              {/* Resultado em destaque */}
              <div
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
              </div>

              {/* Mostra os elementos escolhidos */}
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <ElementalAvatar
                    elemental={playerElemental || Elemental.TITAN}
                    side="left"
                    size={80}
                    animate="idle"
                  />
                  <p className="font-mono text-xs text-primary uppercase tracking-widest">
                    Você
                  </p>
                  <p className="font-mono text-xs text-white/40 uppercase">
                    {playerElemental}
                  </p>
                </div>

                <div className="text-2xl font-bold text-white/30">VS</div>

                <div className="flex flex-col items-center gap-2">
                  <ElementalAvatar
                    elemental={aiElemental || Elemental.TITAN}
                    side="right"
                    size={80}
                    animate="idle"
                  />
                  <p className="font-mono text-xs text-destructive uppercase tracking-widest">
                    IA
                  </p>
                  <p className="font-mono text-xs text-white/40 uppercase">
                    {aiElemental}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* MATCH_OVER - Não usado aqui porque é tratado no game.tsx */}
        </AnimatePresence>
      </div>
    </div>
  );
}