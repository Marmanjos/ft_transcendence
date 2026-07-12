import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Elemental } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ElementalCard } from "@/components/elemental-card";
import { ElementalAvatar } from "@/components/elemental-avatar";
import { ArenaBackground } from "@/components/arena-background";
import { Pause } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MatchManager, type Match, type RoundResult } from "@/lib/match-manager";
import { useWsContext } from "@/contexts/ws-context";
import { useToast } from "@/hooks/use-toast";
import { PauseMenu } from "@/components/pause-menu";
import { Users, Pause } from "lucide-react";
import { clearRoomSession } from "@/lib/room-session";

declare global {
  interface Window {
    isMatchActive?: boolean;
  }
}

type ArenaState = "SELECTING" | "WAITING" | "ROUND_RESULT" | "MATCH_OVER";

const ELEMENTALS = [Elemental.TITAN, Elemental.RAZOR, Elemental.WRAITH];

export default function Game3v3Arena() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const matchId = searchParams.get("matchId");

  const { user } = useAuth();
  const username = user?.username ?? `guest_${Math.random().toString(36).slice(2,6)}`;

  const { toast } = useToast();
  const { send, onMessage, connected } = useWsContext();

  const [arenaState, setArenaState] = useState<ArenaState>("SELECTING");
  const [match, setMatch] = useState<Match | null>(null);
  const [yourChoice, setYourChoice] = useState<Elemental | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [paused, setPaused] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [opponentOffline, setOpponentOffline] = useState(false);
  const [offlineCountdown, setOfflineCountdown] = useState(8);
  const [finalScores, setFinalScores] = useState<Record<string, number> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openModal = () => dialogRef.current?.showModal();
  const closeModal = () => dialogRef.current?.close();

  useEffect(() => {
    if (!opponentOffline) return undefined;
    if (offlineCountdown <= 0) return undefined;
    const interval = setInterval(() => {
      setOfflineCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [opponentOffline, offlineCountdown]);

  useEffect(() => {
    const isPlaying = match && arenaState !== "MATCH_OVER";
    if (isPlaying) {
      window.isMatchActive = true;
    } else {
      window.isMatchActive = false;
    }
    return () => {
      window.isMatchActive = false;
    };
  }, [match, arenaState]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const isPlaying = match && arenaState !== "MATCH_OVER";
      if (isPlaying && window.isMatchActive) {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
        setShowAbandonConfirm(true);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [match, arenaState]);

  const handleConfirmAbandon = () => {
    window.isMatchActive = false;
    setShowAbandonConfirm(false);
    if (matchId) {
      send({ type: "ABANDON_MATCH", matchId: Number(matchId) });
    }
    clearRoomSession();
    setLocation("/lobby");
  };

  // Connect & Sync State
  useEffect(() => {
    if (!matchId || !connected) return;
    // Send SYNC_MATCH message to fetch current state once connected
    send({ type: "SYNC_MATCH", matchId: Number(matchId) });
  }, [matchId, connected]);

  useEffect(() => {
    if (!matchId || !connected) return;

    const off = onMessage((msg) => {
      switch (msg.type) {
        case "MATCH_3V3_UPDATE": {
          setMatch({
            id: matchId,
            code: "",
            hostId: "",
            hostUsername: "",
            players: msg.players.map((p) => ({
              id: p.username,
              username: p.username,
              choice: p.choice,
              score: p.score,
            })),
            state: "playing",
            round: msg.roundNumber,
            createdAt: 0,
            updatedAt: 0,
            expiresAt: 0,
          });

          // Check if self has already chosen in the current round
          const me = msg.players.find((p) => p.username === username);
          if (me && me.choice) {
            setYourChoice(me.choice as Elemental);
            setArenaState("WAITING");
          } else {
            setYourChoice(null);
            setArenaState("SELECTING");
          }
          break;
        }
        case "MATCH_3V3_ROUND_RESULT": {
          setMatch((prev) => {
            if (!prev) return null;
            const updatedPlayers = prev.players.map((p) => ({
              ...p,
              choice: null,
              score: msg.scores[p.username] ?? p.score,
            }));
            
            // Build choices, outcomes, and scores matching the current players order
            const choices = updatedPlayers.map((p) => msg.choices[p.username] ?? null) as [string, string, string];
            const outcomes = updatedPlayers.map((p) => msg.outcomes[p.username] ?? "DRAW") as ["WIN" | "LOSS" | "DRAW", "WIN" | "LOSS" | "DRAW", "WIN" | "LOSS" | "DRAW"];
            const scores = updatedPlayers.map((p) => msg.scores[p.username] ?? 0) as [number, number, number];

            setRoundResult({
              round: msg.roundNumber,
              choices,
              outcomes,
              scores,
            });
            return {
              ...prev,
              players: updatedPlayers,
            };
          });
          setArenaState("ROUND_RESULT");
          setYourChoice(null);
          break;
        }
        case "MATCH_3V3_OVER":
          setFinalScores((msg as { scores: Record<string, number> }).scores);
          setArenaState("MATCH_OVER");
          break;
        case "OPPONENT_TEMORARILY_DISCONNECTED":
        case "OPPONENT_TEMPORARILY_DISCONNECTED":
          setOpponentOffline(true);
          setOfflineCountdown(8);
          break;
        case "OPPONENT_RECONNECTED":
          setOpponentOffline(false);
          break;
        case "OPPONENT_DISCONNECTED":
          clearRoomSession();
          toast({ title: "Oponente desconectou", description: "A partida foi cancelada.", variant: "destructive" });
          handleLeaveRoom();
          setLocation("/game/3v3");
          break;
        case "ROOM_CLOSED":
          clearRoomSession();
          toast({ title: "Sala fechada", description: "O host fechou a sala.", variant: "destructive" });
          handleLeaveRoom();
          setLocation("/game/3v3");
          break;
      }
    });

    return () => {
      off();
    };
  }, [matchId, connected, onMessage, username, setLocation, toast]);

  const handleSelectElemental = (elemental: Elemental) => {
    if (arenaState !== "SELECTING" || !match) return;

    setYourChoice(elemental);
    setArenaState("WAITING");

    // Submit choice to server
    send({ type: "SUBMIT_CHOICE", matchId: Number(matchId), elemental });
  };

  const handleNextRound = () => {
    if (!match) return;

    const nextRound = (roundResult?.round ?? match.round) + 1;
    if (nextRound > 3) {
      setArenaState("MATCH_OVER");
      return;
    }

    setMatch((prev) => prev ? { ...prev, round: nextRound } : null);
    setRoundResult(null);
    setArenaState("SELECTING");
    setYourChoice(null);
  };

  const handleRestart = () => {
    handleLeaveRoom();
    setLocation("/game/3v3");
  };

  const handleMainMenu = () => {
    setArenaState("MATCH_OVER");
    handleLeaveRoom();
    setLocation("/game/3v3");
  };

  // Adicione esta função dentro do componente Game3v3Arena
  const handleLeaveRoom = () => {
    // 1. Marca que a partida não está mais ativa (IMEDIATAMENTE)
    window.isMatchActive = false;
    
    // 2. Limpa o estado local (IMEDIATAMENTE)
    clearRoomSession();
    setMatch(null);
    setArenaState("SELECTING");
    setYourChoice(null);
    setRoundResult(null);
    setFinalScores(null);
    setOpponentOffline(false);
    
    // 3. Tenta enviar ABANDON_MATCH (se possível)
    if (match && matchId) {
      try {
        send({ 
          type: "ABANDON_MATCH", 
          matchId: Number(matchId) 
        });
      } catch (error) {
        console.warn("Não foi possível enviar ABANDON_MATCH:", error);
      }
    }
    
    // 4. Mostra toast
    toast({ 
      title: "Partida abandonada", 
      description: "Você abandonou a partida.",
      variant: "destructive" 
    });
    
    // 5. Navega para o lobby com um pequeno delay
    setTimeout(() => {
      clearRoomSession();
      setLocation("/game/3v3");
    }, 150);
  };

  const handleConfirmLeave = () => {
    handleLeaveRoom(); // Executa a tua função original
    closeModal();      // Fecha o popup
  };

  if (!match) {
    return (
      <div className="min-h-[100dvh] w-full bg-black text-white flex items-center justify-center">
        <p className="text-white/60">Carregando partida...</p>
      </div>
    );
  }

  // Get player positions: current user in center, others on sides
  const currentPlayerIdx = match.players.findIndex((p) => p.id === username);
  const normalizedPlayerIdx = currentPlayerIdx >= 0 ? currentPlayerIdx : 0;
  const centerPlayer = match.players[normalizedPlayerIdx] ?? match.players[0];
  const leftPlayer = match.players[normalizedPlayerIdx === 0 ? 1 : 0];
  const rightPlayer = match.players[normalizedPlayerIdx === 2 ? 1 : 2];
  const leftChoice =
    arenaState === "ROUND_RESULT" && roundResult ? roundResult.choices[normalizedPlayerIdx === 0 ? 1 : 0] : leftPlayer?.choice;
  const rightChoice =
    arenaState === "ROUND_RESULT" && roundResult ? roundResult.choices[normalizedPlayerIdx === 2 ? 1 : 2] : rightPlayer?.choice;
  const centerChoice =
    arenaState === "ROUND_RESULT" && roundResult ? roundResult.choices[normalizedPlayerIdx] : yourChoice;
  const centerOutcome = arenaState === "ROUND_RESULT" && roundResult ? roundResult.outcomes[normalizedPlayerIdx] : null;

  const centerScore = centerPlayer?.score ?? 0;
  const leftScore = leftPlayer?.score ?? 0;
  const rightScore = rightPlayer?.score ?? 0;

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden bg-black text-white font-sans select-none">
      <ArenaBackground />

      {/* HUD */}
      {arenaState !== "MATCH_OVER" && (
        <div
          className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)" }}
        >
          {/* Left */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <p className="font-mono text-primary uppercase tracking-widest text-xs truncate">{leftPlayer?.username}</p>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    boxShadow: i < leftScore ? "0 0 8px #00ffff" : "none",
                  }}
                  className={`h-2 w-8 rounded-sm ${i < leftScore ? "bg-primary" : "bg-white/20"}`}
                />
              ))}
            </div>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center gap-1">
            <p className="font-mono text-white/40 uppercase tracking-[0.3em] text-xs">Round</p>
            <p className="font-black text-3xl text-white/80">{match.round}</p>
            <button
              onClick={() => setPaused(true)}
              className="mt-1 p-1.5 rounded border border-white/20 hover:border-primary/60 text-white/40 hover:text-primary transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-1 min-w-[140px]">
            <p className="font-mono text-destructive uppercase tracking-widest text-xs truncate">{rightPlayer?.username}</p>
            <div className="flex gap-2 justify-end">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={`h-2 w-8 rounded-sm ${i < rightScore ? "bg-destructive" : "bg-white/20"}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN ARENA */}
      {arenaState !== "MATCH_OVER" && (
        <div className="absolute inset-0 flex flex-col">
          {/* Avatar zone - 3 players */}
          <div className="flex-1 flex items-end justify-between px-8 md:px-12 pb-4 pt-24 relative">
            {/* Left Player */}
            <div className="flex flex-col items-center gap-2">
              {leftChoice && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  {arenaState === "ROUND_RESULT" ? (
                    <ElementalCard type={leftChoice as Elemental} size="md" disabled />
                  ) : (
                    <div className="w-48 h-64 rounded-xl border-2 border-dashed border-red-500/40 bg-red-950/20 flex items-center justify-center">
                      <span className="text-xs font-mono text-red-400 font-bold uppercase tracking-widest">Pronto</span>
                    </div>
                  )}
                </motion.div>
              )}
              <p className="font-mono text-red-300 text-xs uppercase tracking-widest truncate max-w-[120px]">
                {leftPlayer?.username}
              </p>
            </div>
 
            {/* Center - YOU */}
            <div className="flex flex-col items-center gap-2">
              {centerChoice ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ElementalCard type={centerChoice as Elemental} size="md" disabled />
                </motion.div>
              ) : (
                <div style={{ width: 192, height: 256 }} className="flex items-center justify-center">
                  <div className="w-44 h-56 rounded-xl border-2 border-dashed border-red-400/20 flex items-center justify-center">
                    <p className="font-mono text-red-300/30 text-xs uppercase tracking-widest text-center">
                      {arenaState === "WAITING" ? "..." : "Escolha"}
                    </p>
                  </div>
                </div>
              )}
              <p className="font-mono text-red-300 text-xs uppercase tracking-widest">
                {centerPlayer?.username}
              </p>
            </div>
 
            {/* Right Player */}
            <div className="flex flex-col items-center gap-2">
              {rightChoice && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  {arenaState === "ROUND_RESULT" ? (
                    <ElementalCard type={rightChoice as Elemental} size="md" disabled />
                  ) : (
                    <div className="w-48 h-64 rounded-xl border-2 border-dashed border-red-500/40 bg-red-950/20 flex items-center justify-center">
                      <span className="text-xs font-mono text-red-400 font-bold uppercase tracking-widest">Pronto</span>
                    </div>
                  )}
                </motion.div>
              )}
              <p className="font-mono text-red-300 text-xs uppercase tracking-widest truncate max-w-[120px]">
                {rightPlayer?.username}
              </p>
            </div>

            {/* Center result */}
            <AnimatePresence mode="wait">
              {arenaState === "ROUND_RESULT" && roundResult && (
                <motion.div
                  key="outcome"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.4 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="text-center">
                    <p
                      className={`px-6 py-3 border-4 font-black text-2xl uppercase tracking-widest ${
                        centerOutcome === "WIN"
                          ? "border-red-400 text-red-300"
                          : centerOutcome === "LOSS"
                          ? "border-white/30 text-white/30"
                          : "border-white/50 text-white/50"
                      }`}
                      style={{
                        boxShadow: centerOutcome === "WIN" ? "0 0 30px rgba(255,100,100,0.4)" : "none",
                      }}
                    >
                      {centerOutcome === "WIN"
                        ? "VITÓRIA"
                        : centerOutcome === "LOSS"
                        ? "DERROTA"
                        : "EMPATE"}
                    </p>
                  </div>
                </motion.div>
                
              )}
            </AnimatePresence>
          </div>

          {/* Selection bar */}
          <div className="relative z-20 pb-6 px-4"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 60%, transparent 100%)" }}>
            <AnimatePresence mode="wait">
              {arenaState === "SELECTING" && (
                <motion.div key="cards" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
                  <p className="text-center font-mono text-white/30 uppercase tracking-[0.3em] text-xs mb-4">Selecione seu elemental</p>
                  <div className="flex justify-center gap-3 md:gap-6">
                    {ELEMENTALS.map((el) => (
                      <ElementalCard key={el} type={el} size="md" onClick={() => handleSelectElemental(el)} />
                    ))}
                  </div>
                </motion.div>
              )}
              {arenaState === "WAITING" && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    <p className="font-mono text-white/40 text-xs uppercase tracking-widest">
                      Aguardando outros jogadores... ({match.players.filter((p) => p.choice).length}/
                      {match.players.length})
                    </p>
                  </div>
                </motion.div>
                
              )}
              {arenaState === "ROUND_RESULT" && (
                <motion.div
                  key="next"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex justify-center"
                >
                  <Button
                    onClick={handleNextRound}
                    size="lg"
                    className="h-14 px-16 text-lg font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700"
                  >
                    {match.round >= 3 ? "Finalizar" : "Próximo Round"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
              {arenaState !== "MATCH_OVER" && (
        <div className="flex justify-center mt-4">
            {/* Botão principal que agora abre o popup */}
            <Button
              onClick={openModal}
              variant="outline"
              className="w-full uppercase tracking-widest font-bold border-red-400/40 text-red-400 hover:bg-red-950/40"
            >
              <Users className="w-4 h-4 mr-2" /> Sair da Sala
            </Button>

            {/* Estutura do Popup (Modal) */}
            <dialog
              ref={dialogRef}
              className="fixed inset-0 m-auto p-6 rounded-lg bg-zinc-900 text-white border border-zinc-800 backdrop:bg-black/60 backdrop:backdrop-blur-sm max-w-md w-full"
            >
              <h3 className="text-lg font-bold mb-2">Tens a certeza?</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Esta ação vai retirar-te da sala atual.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium rounded hover:bg-zinc-800 text-zinc-300"
                >
                  Permanecer
                </button>
                <button
                  onClick={handleConfirmLeave}
                  className="px-4 py-2 text-sm font-medium rounded bg-red-600 hover:bg-red-700 text-white"
                >
                  Sair da Sala
                </button>
              </div>
            </dialog>
          </div>
            )}
          </div>
        </div>
      )}

      {/* MATCH OVER */}
      {(() => {
        if (arenaState !== "MATCH_OVER") return null;

        const scoresSource = finalScores ?? match.players.reduce((acc, p) => ({ ...acc, [p.username]: p.score }), {} as Record<string, number>);
        const maxScore = Math.max(...Object.values(scoresSource));
        const winners = Object.keys(scoresSource).filter((name) => scoresSource[name] === maxScore);
        const isSelfWinner = winners.includes(username);
        const isDrawMatch = winners.length === Object.keys(scoresSource).length || Object.values(scoresSource).every((s) => s === maxScore);

        let winnerText = "";
        if (isDrawMatch) {
          winnerText = "EMPATE GERAL!";
        } else if (winners.length === 1) {
          winnerText = winners[0] === username ? "VITÓRIA!" : `VENCEDOR: ${winners[0].toUpperCase()}`;
        } else {
          winnerText = `VENCEDORES: ${winners.join(" & ").toUpperCase()}`;
        }

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-45 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.35, delay: 0.1 }}
              className="flex flex-col items-center text-center p-10 border border-red-600/40 rounded-2xl bg-black/80 max-w-lg w-full mx-4"
              style={{ boxShadow: isSelfWinner && !isDrawMatch ? "0 0 60px rgba(6,182,212,0.2)" : "0 0 60px rgba(255,100,100,0.15)" }}
            >
              <h1 className={`text-5xl font-black uppercase tracking-tighter mb-2 ${isSelfWinner && !isDrawMatch ? "text-cyan-400 neon-text" : isDrawMatch ? "text-white/60" : "text-red-400"}`}>
                {winnerText}
              </h1>
              <p className="font-mono text-white/40 uppercase tracking-widest text-xs mb-6">Partida Finalizada</p>

              <div className="w-full mb-8">
                <div className="grid grid-cols-3 gap-4 text-center">
                  {match.players.map((p, idx) => {
                    const scoreVal = scoresSource[p.username] ?? p.score;
                    const isWinner = winners.includes(p.username) && !isDrawMatch;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white/5 bg-white/5">
                        <p className={`text-2xl font-black ${isWinner ? "text-cyan-400" : "text-red-300"}`}>{scoreVal}</p>
                        <p className="text-xs uppercase font-mono text-white/60 truncate max-w-[100px]">{p.username}</p>
                        {isWinner && <span className="text-[10px] uppercase font-mono font-bold bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800 animate-pulse">Vencedor</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            <div className="flex gap-3 w-full">
              <Button
                onClick={handleRestart}
                size="lg"
                className="flex-1 h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700"
              >
                Reiniciar
              </Button>
              <Button
                onClick={handleMainMenu}
                variant="outline" size="lg" className="flex-1 h-12 font-bold uppercase tracking-widest">
                Setup
              </Button>
            </div>
            </motion.div>
          </motion.div>
        );
      })()}

      {/* OPPONENT TEMPORARILY OFFLINE OVERLAY */}
      <AnimatePresence>
        {opponentOffline && arenaState !== "MATCH_OVER" && (
          <motion.div
            key="opp_offline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          >
            <div className="flex flex-col items-center text-center gap-6 p-10 border border-red-500/30 rounded-2xl bg-black/85 max-w-md mx-4 animate-pulse">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-red-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-3xl font-black uppercase tracking-widest text-red-400 neon-text">Oponente Offline</h2>
              <p className="font-mono text-white/50 uppercase text-sm leading-relaxed">
                Um combatente perdeu a ligação.<br />Aguardando retorno em <span className="text-red-400 font-black text-xl">{offlineCountdown}s</span>...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SELF DISCONNECTED OVERLAY */}
      <AnimatePresence>
        {!connected && arenaState !== "MATCH_OVER" && (
          <motion.div
            key="self_offline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex flex-col items-center text-center gap-6 p-10 border border-red-500/40 rounded-2xl bg-black/90 max-w-md mx-4">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-3xl font-black uppercase tracking-widest text-red-400 neon-text">Perda de Ligação</h2>
              <p className="font-mono text-white/50 uppercase text-sm leading-relaxed">
                Perdeste a ligação ao servidor.<br />A tentar restabelecer conexão...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
