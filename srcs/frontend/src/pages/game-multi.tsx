import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Elemental } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ElementalCard } from "@/components/elemental-card";
import { ElementalAvatar } from "@/components/elemental-avatar";
import { ArenaBackground } from "@/components/arena-background";
import { PauseMenu } from "@/components/pause-menu";
import { useAuth } from "@/hooks/use-auth";
import { useWs, type ServerMsg } from "@/hooks/use-ws";
import { Pause } from "lucide-react";

type MultiState =
  | "CONNECTING"
  | "QUEUING"
  | "MATCH_FOUND"
  | "SELECTING"
  | "WAITING"
  | "ROUND_RESULT"
  | "REMATCH_OFFER"
  | "REMATCH_WAITING"
  | "MATCH_OVER"
  | "OPPONENT_DISCONNECTED"
  | "ERROR";

interface MatchInfo {
  matchId: number;
  opponentUsername: string;
  yourSide: "player1" | "player2";
}

interface RoundResult {
  roundNumber: number;
  yourChoice: Elemental;
  opponentChoice: Elemental;
  yourOutcome: "WIN" | "LOSS" | "DRAW";
  player1Score: number;
  player2Score: number;
}

const ELEMENTALS = [Elemental.TITAN, Elemental.RAZOR, Elemental.WRAITH];

export default function GameMulti() {
  const [, setLocation] = useLocation();
  const { token, user } = useAuth();

  const [state, setState] = useState<MultiState>("CONNECTING");
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [matchOver, setMatchOver] = useState<{ winnerId: number | null; player1Score: number; player2Score: number } | null>(null);
  const [selectedElemental, setSelectedElemental] = useState<Elemental | null>(null);
  const [scores, setScores] = useState({ player1Score: 0, player2Score: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [paused, setPaused] = useState(false);
  const [clashAnimating, setClashAnimating] = useState(false);
  const [opponentOffline, setOpponentOffline] = useState(false);
  const [offlineCountdown, setOfflineCountdown] = useState(8);

  const { send, onMessage, connected } = useWs(token);

  useEffect(() => {
    if (connected) {
      setState("QUEUING");
      send({ type: "JOIN_QUEUE" });
    }
  }, [connected, send]);

  useEffect((): (() => void) => {
    const off = onMessage((msg: ServerMsg) => {
      switch (msg.type) {
        case "QUEUE_JOINED":
          setState("QUEUING");
          break;

        case "MATCH_FOUND":
          setMatchInfo({ matchId: msg.matchId, opponentUsername: msg.opponentUsername, yourSide: msg.yourSide });
          setScores({ player1Score: 0, player2Score: 0 });
          setRoundResult(null);
          setSelectedElemental(null);
          setMatchOver(null);
          setOpponentOffline(false);
          setState("MATCH_FOUND");
          setTimeout(() => setState("SELECTING"), 2500);
          break;

        case "WAITING_FOR_OPPONENT":
          setState("WAITING");
          break;

        case "ROUND_RESULT": {
          const yourChoice = (msg.yourOutcome !== "DRAW"
            ? (msg.yourOutcome === "WIN" ? msg.player1Choice : msg.player2Choice)
            : msg.player1Choice) as Elemental;
          const yourSide = matchInfo?.yourSide ?? "player1";
          const yourC = (yourSide === "player1" ? msg.player1Choice : msg.player2Choice) as Elemental;
          const opponentC = (yourSide === "player1" ? msg.player2Choice : msg.player1Choice) as Elemental;

          setRoundResult({
            roundNumber: msg.roundNumber,
            yourChoice: yourC,
            opponentChoice: opponentC,
            yourOutcome: msg.yourOutcome,
            player1Score: msg.player1Score,
            player2Score: msg.player2Score,
          });
          setScores({ player1Score: msg.player1Score, player2Score: msg.player2Score });
          setClashAnimating(true);
          setTimeout(() => setClashAnimating(false), 700);
          setState("ROUND_RESULT");
          break;
        }

        case "MATCH_OVER":
          setMatchOver({ winnerId: msg.winnerId, player1Score: msg.player1Score, player2Score: msg.player2Score });
          setTimeout(() => setState("MATCH_OVER"), 1500);
          break;

        case "REMATCH_OFFERED":
          setState("REMATCH_OFFER");
          break;

        case "REMATCH_WAITING":
          setState("REMATCH_WAITING");
          break;

        case "OPPONENT_TEMPORARILY_DISCONNECTED":
          setOpponentOffline(true);
          setOfflineCountdown(8);
          break;

        case "OPPONENT_RECONNECTED":
          setOpponentOffline(false);
          break;

        case "OPPONENT_DISCONNECTED":
          setState("OPPONENT_DISCONNECTED");
          setOpponentOffline(false);
          break;

        case "ERROR":
          setErrorMsg((msg as { type: "ERROR"; message: string }).message);
          setState("ERROR");
          break;
      }
    });
    return off;
  }, [onMessage, matchInfo]);

  useEffect(() => {
    if (!opponentOffline) return undefined;
    if (offlineCountdown <= 0) return undefined;
    const interval = setInterval(() => {
      setOfflineCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [opponentOffline, offlineCountdown]);

  const handleSelect = (elemental: Elemental) => {
    if (state !== "SELECTING" || !matchInfo || paused) return;
    setSelectedElemental(elemental);
    send({ type: "SUBMIT_CHOICE", matchId: matchInfo.matchId, elemental });
    setState("WAITING");
  };

  const handleNextRound = () => {
    setSelectedElemental(null);
    setRoundResult(null);
    setState("SELECTING");
  };

  const handleOfferRematch = () => {
    if (!matchInfo) return;
    send({ type: "OFFER_REMATCH", matchId: matchInfo.matchId });
    setState("REMATCH_WAITING");
  };

  const yourScore = matchInfo?.yourSide === "player1" ? scores.player1Score : scores.player2Score;
  const opponentScore = matchInfo?.yourSide === "player1" ? scores.player2Score : scores.player1Score;
  const isWinner = matchOver ? (matchInfo?.yourSide === "player1" ? matchOver.winnerId === user?.id : matchOver.winnerId === user?.id) : false;
  const isDraw = matchOver?.winnerId === null;

  const inArena = matchInfo && !["CONNECTING", "QUEUING", "MATCH_FOUND", "ERROR"].includes(state);

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden bg-black text-white font-sans select-none">
      <ArenaBackground
        gameState={
          state === "SELECTING" || state === "WAITING"
            ? "SELECTING"
            : state === "ROUND_RESULT"
            ? "ROUND_RESULT"
            : state === "MATCH_OVER"
            ? "MATCH_OVER"
            : "SELECTING"
        }
        playerElemental={roundResult?.yourChoice ?? selectedElemental}
        aiElemental={roundResult?.opponentChoice ?? null}
        roundOutcome={roundResult?.yourOutcome ?? null}
        isPlayerWinner={
          matchOver?.winnerId !== null &&
          matchInfo
            ? (matchInfo.yourSide === "player1"
                ? matchOver?.winnerId === matchInfo.matchId
                : matchOver?.winnerId !== matchInfo.matchId)
            : false
        }
      />

      {/* ── HUD ── */}
      {inArena && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)" }}>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <p className="font-mono text-primary uppercase tracking-widest text-xs">{user?.username}</p>
            <div className="flex gap-2">
              {[0, 1].map((i) => (
                <div key={i} className={`h-2 w-10 rounded-sm ${i < yourScore ? "bg-primary" : "bg-white/20"}`} />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="font-mono text-white/40 uppercase tracking-[0.3em] text-xs">Round</p>
            <p className="font-black text-3xl text-white/80">{(scores.player1Score + scores.player2Score) + 1}</p>
            <button
              onClick={() => setPaused(true)}
              className="mt-1 p-1.5 rounded border border-white/20 hover:border-primary/60 text-white/40 hover:text-primary transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-end gap-1 min-w-[140px]">
            <p className="font-mono text-destructive uppercase tracking-widest text-xs">{matchInfo?.opponentUsername}</p>
            <div className="flex gap-2 justify-end">
              {[0, 1].map((i) => (
                <div key={i} className={`h-2 w-10 rounded-sm ${i < opponentScore ? "bg-destructive" : "bg-white/20"}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="absolute inset-0 flex flex-col">
        <AnimatePresence mode="wait">

          {/* CONNECTING */}
          {state === "CONNECTING" && (
            <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-mono uppercase tracking-widest text-primary">Conectando...</p>
            </motion.div>
          )}

          {/* QUEUING */}
          {state === "QUEUING" && (
            <motion.div key="queuing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 text-center px-4">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-widest neon-text mb-2">Procurando Oponente</h2>
                <p className="font-mono text-white/40 uppercase text-sm">Aguardando combatente na arena...</p>
              </div>
              <Button variant="outline" onClick={() => { send({ type: "LEAVE_QUEUE" }); setLocation("/lobby"); }}
                className="font-mono uppercase tracking-widest">
                Cancelar
              </Button>
            </motion.div>
          )}

          {/* MATCH FOUND */}
          {state === "MATCH_FOUND" && matchInfo && (
            <motion.div key="match_found" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
              <motion.p animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 0.6, repeat: Infinity }}
                className="text-4xl md:text-6xl font-black uppercase tracking-widest text-primary neon-text">
                OPONENTE ENCONTRADO
              </motion.p>
              <div className="flex items-center gap-8 text-2xl font-bold uppercase tracking-widest">
                <span className="text-primary">{user?.username}</span>
                <span className="text-white/30">VS</span>
                <span className="text-destructive">{matchInfo.opponentUsername}</span>
              </div>
              <p className="font-mono text-white/40 uppercase text-sm">Preparando arena...</p>
            </motion.div>
          )}

          {/* IN-ARENA states */}
          {inArena && !["MATCH_OVER", "OPPONENT_DISCONNECTED", "ERROR", "REMATCH_OFFER", "REMATCH_WAITING"].includes(state) && (
            <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">

              {/* Avatar zone */}
              <div className="flex-1 flex items-end justify-between px-8 md:px-20 pb-4 pt-24 relative">

                {/* Player */}
                <div className="flex flex-col items-center gap-2">
                  <AnimatePresence mode="wait">
                    {selectedElemental ? (
                      <motion.div key={`you-${selectedElemental}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <ElementalCard type={selectedElemental} size="lg" disabled />
                      </motion.div>
                    ) : roundResult ? (
                      <motion.div key={`you-result-${roundResult.yourChoice}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <ElementalCard type={roundResult.yourChoice} size="lg" disabled />
                      </motion.div>
                    ) : (
                      <motion.div key="you-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ width: 256, height: 320 }} className="flex items-center justify-center">
                          <div className="w-56 h-72 rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center">
                            <p className="font-mono text-primary/30 text-xs uppercase tracking-widest text-center">Escolha</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="font-mono text-primary text-xs uppercase tracking-widest">{user?.username}</p>
                  {roundResult && <p className="text-xs font-bold text-white/50 uppercase">{roundResult.yourChoice}</p>}
                </div>

                {/* Center */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                  <AnimatePresence mode="wait">
                    {state === "SELECTING" && (
                      <motion.p key="vs" initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0 }}
                        className="text-5xl font-black text-white tracking-widest">VS</motion.p>
                    )}
                    {state === "WAITING" && (
                      <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="font-mono text-white/40 text-xs uppercase tracking-widest">Aguardando...</p>
                      </motion.div>
                    )}
                    {state === "ROUND_RESULT" && roundResult && (
                      <motion.div key="outcome" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.4 }}
                        className={`px-6 py-3 border-4 font-black text-3xl uppercase tracking-widest
                          ${roundResult.yourOutcome === "WIN" ? "border-primary text-primary" : roundResult.yourOutcome === "LOSS" ? "border-destructive text-destructive" : "border-white/40 text-white/40"}`}
                        style={{ boxShadow: roundResult.yourOutcome === "WIN" ? "0 0 30px #00ffff" : roundResult.yourOutcome === "LOSS" ? "0 0 30px #ff4444" : "none" }}>
                        {roundResult.yourOutcome === "WIN" ? "VITÓRIA" : roundResult.yourOutcome === "LOSS" ? "DERROTA" : "EMPATE"}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Opponent */}
                <div className="flex flex-col items-center gap-2">
                  <AnimatePresence mode="wait">
                    {state === "WAITING" && selectedElemental ? (
                      <motion.div key="opp-waiting" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}>
                        <div style={{ width: 256, height: 320 }} className="flex items-center justify-center">
                          <div className="w-56 h-72 rounded-xl border-2 border-dashed border-destructive/20 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-destructive/40 border-t-transparent rounded-full animate-spin" />
                          </div>
                        </div>
                      </motion.div>
                    ) : roundResult ? (
                      <motion.div key={`opp-${roundResult.opponentChoice}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <ElementalCard type={roundResult.opponentChoice} size="lg" disabled />
                      </motion.div>
                    ) : (
                      <motion.div key="opp-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}>
                        <div style={{ width: 256, height: 320 }} className="flex items-center justify-center opacity-40">
                          <div className="w-56 h-72 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                            <p className="font-mono text-white/20 text-xs uppercase tracking-widest text-center">Aguardando</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="font-mono text-destructive text-xs uppercase tracking-widest">{matchInfo?.opponentUsername}</p>
                  {roundResult && <p className="text-xs font-bold text-white/50 uppercase">{roundResult.opponentChoice}</p>}
                </div>
              </div>

              {/* Selection bar */}
              <div className="relative z-20 pb-6 px-4"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 60%, transparent 100%)" }}>
                <AnimatePresence mode="wait">
                  {state === "SELECTING" && (
                    <motion.div key="cards" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}>
                      <p className="text-center font-mono text-white/30 uppercase tracking-[0.3em] text-xs mb-4">Selecione seu elemental</p>
                      <div className="flex justify-center gap-3 md:gap-6">
                        {ELEMENTALS.map((el) => (
                          <ElementalCard key={el} type={el} size="md" onClick={() => handleSelect(el)} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {state === "ROUND_RESULT" && (
                    <motion.div key="next" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-center">
                      <Button onClick={handleNextRound} size="lg"
                        className="h-14 px-16 text-lg font-bold uppercase tracking-widest neon-box">
                        Próximo Round
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* MATCH OVER */}
          {state === "MATCH_OVER" && matchOver && (
            <motion.div key="match_over" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.3 }}
                className="flex flex-col items-center text-center p-10 border border-border rounded-2xl bg-card/80 max-w-lg w-full mx-4"
                style={{ boxShadow: isWinner ? "0 0 60px rgba(0,255,255,0.2)" : "0 0 60px rgba(255,50,50,0.1)" }}>

                {roundResult && (
                  <div className="mb-4">
                    <ElementalCard type={roundResult.yourChoice} size="md" disabled />
                  </div>
                )}

                <h1 className={`text-6xl font-black uppercase tracking-tighter mb-2
                  ${isWinner ? "text-primary neon-text" : isDraw ? "text-white/60" : "text-destructive"}`}
                  style={{ textShadow: isWinner ? "0 0 40px #00ffff" : "none" }}>
                  {isWinner ? "VITÓRIA" : isDraw ? "EMPATE" : "DERROTA"}
                </h1>

                <p className="font-mono text-white/40 uppercase tracking-widest text-sm mb-2">Placar Final</p>
                <div className="text-4xl font-black mb-8">
                  <span className="text-primary">{yourScore}</span>
                  <span className="text-white/30 mx-3">-</span>
                  <span className="text-destructive">{opponentScore}</span>
                </div>

                <div className="flex gap-3 w-full">
                  <Button onClick={handleOfferRematch} size="lg"
                    className="flex-1 h-12 font-bold uppercase tracking-widest neon-box">
                    Jogar Novamente
                  </Button>
                  <Button onClick={() => setLocation("/lobby")} variant="outline" size="lg"
                    className="flex-1 h-12 font-bold uppercase tracking-widest">
                    Sair da Sala
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* REMATCH WAITING */}
          {state === "REMATCH_WAITING" && (
            <motion.div key="rematch_wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="fixed inset-0 z-40 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="flex flex-col items-center gap-6 p-10 border border-primary/30 rounded-2xl bg-card/80">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <h2 className="text-3xl font-black uppercase tracking-widest text-primary">Aguardando Revanche</h2>
                <p className="font-mono text-white/40 uppercase text-sm">Aguardando {matchInfo?.opponentUsername} aceitar...</p>
                <Button variant="outline" onClick={() => setState("MATCH_OVER")} className="font-mono uppercase tracking-widest">
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}

          {/* REMATCH OFFERED (opponent offered) */}
          {state === "REMATCH_OFFER" && (
            <motion.div key="rematch_offer" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="flex flex-col items-center gap-6 p-10 border border-secondary/30 rounded-2xl bg-card/80 text-center">
                <h2 className="text-3xl font-black uppercase tracking-widest text-secondary">Revanche!</h2>
                <p className="font-mono text-white/60 uppercase text-sm">{matchInfo?.opponentUsername} quer a revanche</p>
                <div className="flex gap-4 w-full">
                  <Button onClick={handleOfferRematch} size="lg"
                    className="flex-1 h-12 font-bold uppercase tracking-widest neon-box">
                    Aceitar
                  </Button>
                  <Button onClick={() => setLocation("/lobby")} variant="outline" size="lg"
                    className="flex-1 h-12 font-bold uppercase tracking-widest">
                    Recusar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* OPPONENT DISCONNECTED */}
          {state === "OPPONENT_DISCONNECTED" && (
            <motion.div key="disconnected" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center text-center gap-6 p-10 border border-border rounded-2xl bg-card/80 max-w-md mx-4">
                <h2 className="text-4xl font-black uppercase tracking-widest text-primary neon-text">Oponente Saiu</h2>
                <p className="font-mono text-white/50 uppercase text-sm">Seu adversário abandonou a arena.</p>
                <Button onClick={() => setLocation("/lobby")} size="lg" className="h-12 px-10 font-bold uppercase tracking-widest neon-box">
                  Retornar ao Lobby
                </Button>
              </div>
            </motion.div>
          )}

          {/* OPPONENT TEMPORARILY OFFLINE */}
          {inArena && opponentOffline && state !== "OPPONENT_DISCONNECTED" && (
            <motion.div key="opp_offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="flex flex-col items-center text-center gap-6 p-10 border border-destructive/30 rounded-2xl bg-card/80 max-w-md mx-4 animate-pulse">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-destructive/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-destructive border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-widest text-destructive neon-text">Oponente Offline</h2>
                <p className="font-mono text-white/50 uppercase text-sm leading-relaxed">
                  O adversário perdeu a ligação.<br />Aguardando retorno em <span className="text-destructive font-black text-xl">{offlineCountdown}s</span>...
                </p>
              </div>
            </motion.div>
          )}

          {/* SELF DISCONNECTED */}
          {inArena && !connected && (
            <motion.div key="self_offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}>
              <div className="flex flex-col items-center text-center gap-6 p-10 border border-primary/40 rounded-2xl bg-card/80 max-w-md mx-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <h2 className="text-3xl font-black uppercase tracking-widest text-primary neon-text">Perda de Ligação</h2>
                <p className="font-mono text-white/50 uppercase text-sm leading-relaxed">
                  Perdeste a ligação ao servidor.<br />A tentar restabelecer conexão...
                </p>
              </div>
            </motion.div>
          )}

          {/* ERROR */}
          {state === "ERROR" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center text-center gap-6 p-10 border border-destructive/40 rounded-2xl bg-card/80 max-w-md mx-4">
                <h2 className="text-4xl font-black uppercase tracking-widest text-destructive">Erro de Conexão</h2>
                <p className="font-mono text-white/50 uppercase text-sm">{errorMsg || "Erro inesperado."}</p>
                <Button onClick={() => setLocation("/lobby")} variant="outline" size="lg"
                  className="h-12 px-10 font-bold uppercase tracking-widest">
                  Retornar ao Lobby
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── PAUSE MENU ── */}
      <AnimatePresence>
        {paused && (
          <PauseMenu
            onResume={() => setPaused(false)}
            onRestart={() => { send({ type: "LEAVE_QUEUE" }); window.location.reload(); }}
            onMainMenu={() => setLocation("/")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
