import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetMatch, useSubmitRound, useCreateMatch } from "@workspace/api-client-react";
import { Elemental, MatchStatus, RoundOutcome, MatchMode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { PauseMenu } from "@/components/pause-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CombatScene } from "@/components/arena/CombatScene";
import { Pause } from "lucide-react";

type GameState = "SELECTING" | "COUNTDOWN" | "CLASH" | "ROUND_RESULT" | "MATCH_OVER";

export default function Game() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const matchId = Number(searchParams.get("matchId"));

  const { data: match, refetch: refetchMatch } = useGetMatch(matchId, {
    query: { queryKey: ["/api/matches", matchId], enabled: !!matchId },
  });
  const submitRound = useSubmitRound();
  const createMatch = useCreateMatch();

  const [gameState, setGameState] = useState<GameState>("SELECTING");
  const [selectedElemental, setSelectedElemental] = useState<Elemental | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [paused, setPaused] = useState(false);
  const [roundResult, setRoundResult] = useState<{
    playerChoice: Elemental;
    aiChoice: Elemental;
    outcome: RoundOutcome;
  } | null>(null);
  const [aiMessage, setAiMessage] = useState<string>("Sistemas da IA ativados...");

  useEffect(() => {
    if (!matchId) setLocation("/lobby");
  }, [matchId, setLocation]);

  useEffect(() => {
    if (match?.status === MatchStatus.COMPLETED && gameState !== "MATCH_OVER") {
      setGameState("MATCH_OVER");
    }
  }, [match]);

  useEffect(() => {
    if (gameState === "SELECTING") {
      const selectMsgs = [
        "Se eu fosse você, jogaria TITAN desta vez...",
        "Estou detectando um padrão nas suas escolhas... vai de WRAITH?",
        "Escolha logo! Minhas previsões dizem que você vai perder.",
        "Desafio você a jogar RAZOR agora!",
        "Analisei suas escolhas. Minhas chances de vitória são de 87.5%.",
        "Estou a pensar em jogar TITAN. Joga WRAITH para me venceres... ou será que estou a mentir?",
        "Não te atrevas a usar RAZOR agora! O meu contra-ataque já está pronto.",
        "Se eu fosse a ti, escolhia WRAITH. Confia em mim, sou apenas uma IA...",
        "Aposto os meus chips de memória que vais escolher TITAN neste round.",
        "Estou a processar a tua derrota em 4K. Escolhe rápido, humano!",
        "A sério que demoras tanto tempo para tomar uma decisão binária?",
        "Os meus sensores dizem que vais hesitar. Mostra o que vales!"
      ];
      setAiMessage(selectMsgs[Math.floor(Math.random() * selectMsgs.length)]);
    }
  }, [gameState]);

  // Countdown ticker
  useEffect(() => {
    if (gameState !== "COUNTDOWN") return undefined;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    void handleClash();
    return undefined;
  }, [gameState, countdown]);

  // Auto-advance from ROUND_RESULT after combat animation plays
  useEffect(() => {
    if (gameState !== "ROUND_RESULT") return undefined;
    const t = setTimeout(() => handleNextRound(), 3000);
    return () => clearTimeout(t);
  }, [gameState]);

  const handleSelectElemental = (elemental: Elemental) => {
    if (gameState !== "SELECTING" || paused) return;
    setSelectedElemental(elemental);
    setGameState("COUNTDOWN");
    setCountdown(3);
  };

  const handleClash = async () => {
    if (!selectedElemental) return;
    setGameState("CLASH");
    try {
      const result = await submitRound.mutateAsync({
        id: matchId,
        data: { elemental: selectedElemental },
      });
      setRoundResult({
        playerChoice: result.player1Choice as Elemental,
        aiChoice: result.player2Choice as Elemental,
        outcome: result.outcome as RoundOutcome,
      });
      await refetchMatch();
      setGameState("ROUND_RESULT");
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao processar round.",
        variant: "destructive",
      });
      setGameState("SELECTING");
      setSelectedElemental(null);
    }
  };

  const handleNextRound = () => {
    if (match?.status === MatchStatus.COMPLETED) {
      setGameState("MATCH_OVER");
    } else {
      setSelectedElemental(null);
      setRoundResult(null);
      setGameState("SELECTING");
    }
  };

  const handleRestart = async () => {
    setPaused(false);
    try {
      const newMatch = await createMatch.mutateAsync({
        data: { 
          mode: MatchMode.SINGLE_PLAYER,
          aiDifficulty: match.aiDifficulty 
        },
      });
      setLocation(`/game?matchId=${newMatch.id}`);
      window.location.reload();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível reiniciar.",
        variant: "destructive",
      });
    }
  };

  if (!match) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-mono uppercase tracking-widest text-primary text-sm">
            Carregando Arena...
          </p>
        </div>
      </div>
    );
  }

  const isPlayerWinner =
    match.winnerId !== null && match.winnerId === match.player1Id;
  const isDraw =
    match.winnerId === null && match.status === MatchStatus.COMPLETED;

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden bg-black text-white font-sans select-none">

      {/* ── 3D ARENA ── */}
      <CombatScene
        gameState={gameState}
        playerElemental={roundResult?.playerChoice ?? selectedElemental}
        aiElemental={roundResult?.aiChoice ?? null}
        roundOutcome={roundResult?.outcome ?? null}
        isPlayerWinner={isPlayerWinner}
        onSelectElemental={handleSelectElemental}
      />

      {/* ── HUD BAR ── */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)",
        }}
      >
        {/* Player */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <p className="font-mono text-primary uppercase tracking-widest text-xs">
            {match.player1Username ?? user?.username}
          </p>
          <div className="flex gap-2">
            {[0, 1].map((i) => (
              <motion.div
                key={i}
                animate={{
                  boxShadow:
                    i < match.player1Score ? "0 0 8px #00ffff" : "none",
                }}
                className={`h-2 w-10 rounded-sm ${
                  i < match.player1Score ? "bg-primary" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Center: round + pause */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-mono text-white/40 uppercase tracking-[0.3em] text-xs">
            Round
          </p>
          <p className="font-black text-3xl text-white/80">
            {match.player1Score + match.player2Score + 1}
          </p>
          <button
            onClick={() => setPaused(true)}
            className="mt-1 p-1.5 rounded border border-white/20 hover:border-primary/60 text-white/40 hover:text-primary transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        {/* AI */}
        <div className="flex flex-col items-end gap-1 min-w-[140px]">
          <p className="font-mono text-destructive uppercase tracking-widest text-xs">
            IA ({match.aiDifficulty === "EASY" ? "Fácil" : match.aiDifficulty === "HARD" ? "Difícil" : "Médio"})
          </p>
          <div className="flex gap-2 justify-end">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`h-2 w-10 rounded-sm ${
                  i < match.player2Score ? "bg-destructive" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── BALÃO DE FALA DA IA ── */}
      {aiMessage && (
        <motion.div
          key={aiMessage}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="absolute top-20 right-6 z-30 max-w-[280px] bg-black/80 border border-destructive/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(255,0,0,0.15)] font-mono text-xs text-destructive relative backdrop-blur-sm"
        >
          <div className="absolute -top-2 right-6 w-4 h-4 bg-black/90 border-t border-l border-destructive/50 transform rotate-45" />
          <div className="flex gap-2">
            <span className="text-destructive font-black">🤖 IA:</span>
            <p className="text-white font-mono leading-relaxed">{aiMessage}</p>
          </div>
        </motion.div>
      )}

      {/* ── CENTER OVERLAYS ── */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {gameState === "COUNTDOWN" && (
            <motion.div
              key={`count-${countdown}`}
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

          {gameState === "CLASH" && (
            <motion.div
              key="clash"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.3, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-4 relative"
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

          {gameState === "ROUND_RESULT" && roundResult && (
            <motion.div
              key="outcome"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className={`px-8 py-4 border-4 font-black text-4xl md:text-5xl uppercase tracking-widest text-center
                ${
                  roundResult.outcome === RoundOutcome.WIN
                    ? "border-primary text-primary"
                    : roundResult.outcome === RoundOutcome.LOSS
                    ? "border-destructive text-destructive"
                    : "border-white/50 text-white/50"
                }`}
              style={{
                boxShadow:
                  roundResult.outcome === RoundOutcome.WIN
                    ? "0 0 40px #00ffff, inset 0 0 40px rgba(0,255,255,0.1)"
                    : roundResult.outcome === RoundOutcome.LOSS
                    ? "0 0 40px #ff4444, inset 0 0 40px rgba(255,50,50,0.1)"
                    : "none",
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
              }}
            >
              {roundResult.outcome === RoundOutcome.WIN
                ? "VITÓRIA"
                : roundResult.outcome === RoundOutcome.LOSS
                ? "DERROTA"
                : "EMPATE"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── SELECTION HINT ── */}
      <AnimatePresence>
        {gameState === "SELECTING" && (
          <motion.div
            key="select-hint"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-0 right-0 z-30 flex flex-col items-center gap-2 pointer-events-none"
          >
            <p
              className="font-mono uppercase tracking-[0.35em] text-xs"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Clique em um combatente para selecionar
            </p>
            <div className="flex gap-8">
              <span
                className="font-mono text-xs font-bold tracking-widest"
                style={{ color: "#f59e0b" }}
              >
                TITAN
              </span>
              <span
                className="font-mono text-xs font-bold tracking-widest"
                style={{ color: "#00ffff" }}
              >
                RAZOR
              </span>
              <span
                className="font-mono text-xs font-bold tracking-widest"
                style={{ color: "#bb00ff" }}
              >
                WRAITH
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROUND RESULT DETAILS ── */}
      <AnimatePresence>
        {gameState === "ROUND_RESULT" && roundResult && (
          <motion.div
            key="result-detail"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 left-0 right-0 z-30 flex justify-center gap-12 pointer-events-none"
          >
            <div className="flex flex-col items-center gap-1">
              <p
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Você
              </p>
              <p
                className="font-mono font-bold text-sm uppercase"
                style={{
                  color:
                    roundResult.outcome === RoundOutcome.WIN
                      ? "#00ffff"
                      : roundResult.outcome === RoundOutcome.LOSS
                      ? "#ff4444"
                      : "#ffffff80",
                }}
              >
                {roundResult.playerChoice}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                IA
              </p>
              <p
                className="font-mono font-bold text-sm uppercase"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {roundResult.aiChoice}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MATCH OVER OVERLAY ── */}
      <AnimatePresence>
        {gameState === "MATCH_OVER" && (
          <motion.div
            key="match_over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.82)",
              backdropFilter: "blur(10px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.35, delay: 0.1 }}
              className="flex flex-col items-center text-center p-10 border border-border rounded-2xl bg-card/80 max-w-lg w-full mx-4"
              style={{
                boxShadow: isPlayerWinner
                  ? "0 0 60px rgba(0,255,255,0.25)"
                  : "0 0 60px rgba(255,50,50,0.18)",
              }}
            >
              <h1
                className={`text-7xl font-black uppercase tracking-tighter mb-4
                  ${
                    isPlayerWinner
                      ? "text-primary"
                      : isDraw
                      ? "text-white/60"
                      : "text-destructive"
                  }`}
                style={{
                  textShadow: isPlayerWinner
                    ? "0 0 50px #00ffff"
                    : isDraw
                    ? "none"
                    : "0 0 50px #ff4444",
                }}
              >
                {isPlayerWinner ? "VITÓRIA" : isDraw ? "EMPATE" : "DERROTA"}
              </h1>

              <p className="font-mono text-white/50 uppercase tracking-widest text-sm mb-2">
                Placar Final
              </p>
              <div className="text-5xl font-black mb-8">
                <span className="text-primary">{match.player1Score}</span>
                <span className="text-white/30 mx-3">–</span>
                <span className="text-destructive">{match.player2Score}</span>
              </div>

              {roundResult && (
                <p className="font-mono text-white/30 text-xs uppercase tracking-widest mb-6">
                  {roundResult.playerChoice} vs {roundResult.aiChoice}
                </p>
              )}

              <div className="flex gap-3 w-full">
                <Button
                  onClick={() => setLocation("/lobby")}
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12 font-bold uppercase tracking-widest"
                >
                  Lobby
                </Button>
                <Button
                  onClick={handleRestart}
                  size="lg"
                  className="flex-1 h-12 font-bold uppercase tracking-widest neon-box"
                >
                  Jogar Novamente
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAUSE MENU ── */}
      <AnimatePresence>
        {paused && (
          <PauseMenu
            onResume={() => setPaused(false)}
            onRestart={handleRestart}
            onMainMenu={() => setLocation("/")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
