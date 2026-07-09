import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, LogIn, MessageSquare, Plus, Send, Users } from "lucide-react";
import { Elemental } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ElementalAvatar } from "@/components/elemental-avatar";
import { ElementalCard } from "@/components/elemental-card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWs, type ServerMsg } from "@/hooks/use-ws";
import { clearRoomSession, loadRoomSession, saveRoomSession } from "@/lib/room-session";

const ROOM_PATH = "/room" as const;

interface RoomState {
  code: string;
  hostUsername: string;
  guestUsername: string | null;
  canChat: boolean;
  matchId: number | null;
}

interface ChatMessage {
  id: string;
  senderId: number;
  senderUsername: string;
  text: string;
  createdAt: string;
}

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

type ArenaState = "MATCH_FOUND" | "SELECTING" | "WAITING" | "ROUND_RESULT" | "MATCH_OVER" | "REMATCH_WAITING" | "REMATCH_OFFER" | "OPPONENT_DISCONNECTED" | "ERROR";

const ELEMENTALS = [Elemental.TITAN, Elemental.RAZOR, Elemental.WRAITH];

export default function RoomPage() {
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { send, onMessage, connected } = useWs(token);

  const searchParams = new URLSearchParams(window.location.search);
  const initialCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const persistedRoom = loadRoomSession();
  const initialRoomCode = initialCode || (persistedRoom?.path === ROOM_PATH ? persistedRoom.code : "");
  const autoJoinSent = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (persistedRoom && persistedRoom.path !== ROOM_PATH) {
      setLocation(`${persistedRoom.path}?code=${encodeURIComponent(persistedRoom.code)}`);
    }
  }, [persistedRoom, setLocation]);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState(initialRoomCode);
  const [roomCode, setRoomCode] = useState(initialCode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "joining" | "arena">("idle");
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [arenaState, setArenaState] = useState<ArenaState>("MATCH_FOUND");
  const [selectedElemental, setSelectedElemental] = useState<Elemental | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [matchOver, setMatchOver] = useState<{ winnerId: number | null; player1Score: number; player2Score: number } | null>(null);
  const [scores, setScores] = useState({ player1Score: 0, player2Score: 0 });
  const [errorMsg, setErrorMsg] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [opponentOffline, setOpponentOffline] = useState(false);
  const [offlineCountdown, setOfflineCountdown] = useState(8);
  const [gameMode, setGameMode] = useState<"CLASSIC" | "HYPER">("CLASSIC");
  const [roomSize, setRoomSize] = useState<"1v1" | "3v3">("1v1");

  const isArena = Boolean(matchInfo);
  const canChat = Boolean(roomState?.canChat);
  const roomViewActive = roomState !== null || activeRoomCode !== "";
  const roomViewCode = roomState?.code ?? activeRoomCode;
  const yourScore = matchInfo?.yourSide === "player1" ? scores.player1Score : scores.player2Score;
  const opponentScore = matchInfo?.yourSide === "player1" ? scores.player2Score : scores.player1Score;
  const isWinner = matchOver ? (matchInfo?.yourSide === "player1" ? matchOver.winnerId === user?.id : matchOver.winnerId === user?.id) : false;
  const isDraw = matchOver?.winnerId === null;


  const openModal = () => dialogRef.current?.showModal();
  const closeModal = () => dialogRef.current?.close();

  useEffect(() => {
    const off = onMessage((msg: ServerMsg) => {
      switch (msg.type) {
        case "ROOM_CREATED":
        case "ROOM_JOINED":
        case "ROOM_UPDATED":
          if (msg.type === "ROOM_CREATED") {
            setMessages([]);
            setMatchInfo(null);
            setChatOpen(false);
          }
          setRoomState({
            code: msg.code,
            hostUsername: msg.hostUsername,
            guestUsername: msg.guestUsername,
            canChat: msg.canChat,
            matchId: msg.matchId,
          });
          setActiveRoomCode(msg.code);
          saveRoomSession({ code: msg.code, path: ROOM_PATH });
          if (window.location.pathname !== ROOM_PATH || window.location.search !== `?code=${encodeURIComponent(msg.code)}`) {
            setLocation(`${ROOM_PATH}?code=${encodeURIComponent(msg.code)}`);
          }
          if (msg.matchId && msg.guestUsername) {
            const yourSide = msg.hostUsername === user?.username ? "player1" : "player2";
            const opponentUsername = yourSide === "player1" ? msg.guestUsername : msg.hostUsername;
            setMatchInfo({ matchId: msg.matchId, opponentUsername, yourSide });
            setArenaState("MATCH_FOUND");
            setSelectedElemental(null);
            setRoundResult(null);
            setMatchOver(null);
            setScores({ player1Score: 0, player2Score: 0 });
            setStatus("arena");
            setChatOpen(false);
            toast({ title: "Partida pronta", description: `${opponentUsername} entrou na arena.` });
            setTimeout(() => setArenaState("SELECTING"), 1200);
          } else {
            setStatus(msg.type === "ROOM_CREATED" ? "creating" : "idle");
          }
          setBusy(false);
          break;
        case "MATCH_FOUND":
          setMatchInfo({ matchId: msg.matchId, opponentUsername: msg.opponentUsername, yourSide: msg.yourSide });
          setArenaState("MATCH_FOUND");
          setSelectedElemental(null);
          setRoundResult(null);
          setMatchOver(null);
          setScores({ player1Score: 0, player2Score: 0 });
          setStatus("arena");
          setChatOpen(false);
          toast({ title: "Partida pronta", description: `${msg.opponentUsername} entrou na arena.` });
          setTimeout(() => setArenaState("SELECTING"), 1600);
          break;
        case "WAITING_FOR_OPPONENT":
          setArenaState("WAITING");
          break;
        case "ROUND_RESULT":
          setRoundResult({
            roundNumber: msg.roundNumber,
            yourChoice: (matchInfo?.yourSide === "player1" ? msg.player1Choice : msg.player2Choice) as Elemental,
            opponentChoice: (matchInfo?.yourSide === "player1" ? msg.player2Choice : msg.player1Choice) as Elemental,
            yourOutcome: msg.yourOutcome,
            player1Score: msg.player1Score,
            player2Score: msg.player2Score,
          });
          setScores({ player1Score: msg.player1Score, player2Score: msg.player2Score });
          setArenaState("ROUND_RESULT");
          break;
        case "MATCH_OVER":
          setMatchOver({ winnerId: msg.winnerId, player1Score: msg.player1Score, player2Score: msg.player2Score });
          setScores({ player1Score: msg.player1Score, player2Score: msg.player2Score });
          setArenaState("MATCH_OVER");
          break;
        case "REMATCH_OFFERED":
          setArenaState("REMATCH_OFFER");
          break;
        case "REMATCH_WAITING":
          setArenaState("REMATCH_WAITING");
          break;
        case "OPPONENT_TEMPORARILY_DISCONNECTED":
          setOpponentOffline(true);
          setOfflineCountdown(8);
          break;
        case "OPPONENT_RECONNECTED":
          setOpponentOffline(false);
          break;
        case "OPPONENT_DISCONNECTED":
          setArenaState("OPPONENT_DISCONNECTED");
          setOpponentOffline(false);
          break;
        case "ROOM_CHAT":
          setMessages((current) => {
            if (current.some((message) => message.id === msg.id)) return current;
            return [...current, {
              id: msg.id,
              senderId: msg.senderId,
              senderUsername: msg.senderUsername,
              text: msg.text,
              createdAt: msg.createdAt,
            }].slice(-50);
          });
          break;
        case "ROOM_PLAYER_LEFT":
          setRoomState((current) => current && current.code === msg.code ? { ...current, guestUsername: null, canChat: false } : current);
          toast({ title: "Jogador saiu", description: `${msg.username} deixou a sala.` });
          break;
        case "ROOM_CLOSED":
          setRoomState(null);
          setActiveRoomCode("");
          clearRoomSession();
          setMessages([]);
          setMatchInfo(null);
          setSelectedElemental(null);
          setRoundResult(null);
          setMatchOver(null);
          setScores({ player1Score: 0, player2Score: 0 });
          setArenaState("MATCH_FOUND");
          setStatus("idle");
          setBusy(false);
          setChatOpen(false);
          setLocation(ROOM_PATH);
          toast({
            title: "Sala fechada",
            description: msg.reason === "host_left" ? "A sala foi encerrada pelo host." : "A sala foi encerrada.",
            variant: "destructive",
          });
          break;
        case "ROOM_FULL":
          setBusy(false);
          setActiveRoomCode("");
          clearRoomSession();
          toast({ title: "Sala cheia", description: `O código ${msg.code} já tem dois jogadores.`, variant: "destructive" });
          break;
        case "ROOM_NOT_FOUND":
          setBusy(false);
          setActiveRoomCode("");
          clearRoomSession();
          if (initialRoomCode === msg.code) {
            setLocation(ROOM_PATH);
          }
          toast({ title: "Sala não encontrada", description: `Nenhuma sala com o código ${msg.code}.`, variant: "destructive" });
          break;
        case "ERROR":
          setBusy(false);
          setErrorMsg(msg.message);
          setArenaState("ERROR");
          toast({ title: "Erro", description: msg.message, variant: "destructive" });
          break;
      }
    });
    return () => {
      off();
    };
  }, [initialRoomCode, matchInfo?.yourSide, onMessage, setLocation, toast, user?.username]);

  useEffect(() => {
    if (autoJoinSent.current) return;
    if (!connected || !initialRoomCode) return;
    autoJoinSent.current = true;
    setRoomCode(initialRoomCode);
    setStatus("joining");
    setBusy(true);
    send({ type: "JOIN_ROOM", code: initialRoomCode });
  }, [connected, initialRoomCode, send]);

  useEffect(() => {
    if (!opponentOffline) return undefined;
    if (offlineCountdown <= 0) return undefined;
    const interval = setInterval(() => {
      setOfflineCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [opponentOffline, offlineCountdown]);

  const sortedMessages = useMemo(() => messages, [messages]);

  const handleCreateRoom = () => {
    if (roomViewActive) return;
    if (!connected) {
      toast({ title: "Sem conexão", description: "Conecta ao servidor primeiro.", variant: "destructive" });
      return;
    }
    setBusy(true);
    setStatus("creating");
    send({ type: "CREATE_ROOM", mode: "1v1" });
  };

  const handleJoinRoom = () => {
    if (roomViewActive) return;
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      toast({ title: "Código necessário", description: "Introduz o código da sala.", variant: "destructive" });
      return;
    }
    if (!connected) {
      toast({ title: "Sem conexão", description: "Conecta ao servidor primeiro.", variant: "destructive" });
      return;
    }
    setBusy(true);
    setStatus("joining");
    send({ type: "JOIN_ROOM", code });
  };

  const handleCopyCode = async () => {
    if (!roomViewCode) return;
    await navigator.clipboard.writeText(roomViewCode);
    toast({ title: "Código copiado", description: roomViewCode });
  };

  const handleSendChat = () => {
    const text = draft.trim();
    if (!text || !roomState?.canChat) return;
    send({ type: "SEND_ROOM_CHAT", text });
    setDraft("");
  };

  const handleLeaveRoom = () => {
    const isActiveMatch = Boolean(matchInfo && arenaState !== "MATCH_OVER");

    if (isActiveMatch && matchInfo) {
      send({ type: "ABANDON_MATCH", matchId: matchInfo.matchId });

      toast({
        title: "Saída registada",
        description: "O oponente tem alguns segundos para voltar antes do timeout.",
        variant: "destructive",
      });

      clearRoomSession();
      setRoomState(null);
      setActiveRoomCode("");
      setMatchInfo(null);
      setMessages([]);
      setDraft("");
      setSelectedElemental(null);
      setRoundResult(null);
      setMatchOver(null);
      setScores({ player1Score: 0, player2Score: 0 });
      setArenaState("MATCH_FOUND");
      setStatus("idle");
      setChatOpen(false);
      setLocation("/lobby");
      return;
    }

    clearRoomSession();
    send({ type: "LEAVE_ROOM" });
    setRoomState(null);
    setActiveRoomCode("");
    setMatchInfo(null);
    setMessages([]);
    setDraft("");
    setSelectedElemental(null);
    setRoundResult(null);
    setMatchOver(null);
    setScores({ player1Score: 0, player2Score: 0 });
    setArenaState("MATCH_FOUND");
    setStatus("idle");
    setChatOpen(false);
    setLocation(ROOM_PATH);
  };

  const handleConfirmLeave = () => {
    handleLeaveRoom(); // Executa a tua função original
    closeModal();      // Fecha o popup
  };

  const handleSelect = (elemental: Elemental) => {
    if (!matchInfo || arenaState !== "SELECTING") return;
    setSelectedElemental(elemental);
    send({ type: "SUBMIT_CHOICE", matchId: matchInfo.matchId, elemental });
    setArenaState("WAITING");
  };

  const handleNextRound = () => {
    setSelectedElemental(null);
    setRoundResult(null);
    setArenaState("SELECTING");
  };

  const handleOfferRematch = () => {
    if (!matchInfo) return;
    send({ type: "OFFER_REMATCH", matchId: matchInfo.matchId });
    setArenaState("REMATCH_WAITING");
  };

  const renderArena = () => {
    if (!matchInfo) return null;

    return (
      <div className="relative min-h-[76vh] overflow-hidden rounded-3xl border border-primary/20 bg-black/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,255,0.12),transparent_36%),radial-gradient(circle_at_bottom,rgba(255,0,170,0.10),transparent_36%)]" />

        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/90 to-transparent">
          <div className="flex flex-col gap-1 min-w-[120px]">
            <p className="font-mono text-primary uppercase tracking-widest text-[11px]">{user?.username}</p>
            <div className="flex gap-2">
              {[0, 1].map((i) => (
                <div key={i} className={`h-2 w-10 rounded-sm ${i < yourScore ? "bg-primary" : "bg-white/20"}`} />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="font-mono text-white/40 uppercase tracking-[0.3em] text-xs">Round</p>
            <p className="font-black text-3xl text-white/80">{scores.player1Score + scores.player2Score + 1}</p>
            <Button variant="ghost" size="icon" onClick={() => setChatOpen((current) => !current)} className="mt-1 text-white/60 hover:text-white">
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col items-end gap-1 min-w-[120px] text-right">
            <p className="font-mono text-destructive uppercase tracking-widest text-[11px]">{matchInfo.opponentUsername}</p>
            <div className="flex gap-2 justify-end">
              {[0, 1].map((i) => (
                <div key={i} className={`h-2 w-10 rounded-sm ${i < opponentScore ? "bg-destructive" : "bg-white/20"}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-28 pb-8 px-4 sm:px-6 lg:px-10 min-h-[76vh] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {arenaState === "MATCH_FOUND" && (
              <motion.div key="found" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
                <p className="text-4xl md:text-6xl font-black uppercase tracking-widest text-primary neon-text">Oponente encontrado</p>
                <div className="flex items-center gap-8 text-xl md:text-2xl font-bold uppercase tracking-widest">
                  <span className="text-primary">{user?.username}</span>
                  <span className="text-white/30">VS</span>
                  <span className="text-destructive">{matchInfo.opponentUsername}</span>
                </div>
                <p className="font-mono text-white/40 uppercase text-sm">A preparar a arena...</p>
              </motion.div>
            )}

            {arenaState !== "MATCH_FOUND" && (
              <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col gap-8 justify-between">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-1 flex flex-col items-center gap-2">
                    {selectedElemental ? (
                      <ElementalCard type={selectedElemental} size="lg" disabled />
                    ) : roundResult?.yourChoice ? (
                      <ElementalCard type={roundResult.yourChoice} size="lg" disabled />
                    ) : (
                      <div style={{ width: 256, height: 320 }} className="flex items-center justify-center">
                        <div className="w-56 h-72 rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center">
                          <p className="font-mono text-primary/30 text-xs uppercase tracking-widest text-center">Escolha</p>
                        </div>
                      </div>
                    )}
                    <p className="font-mono text-primary text-xs uppercase tracking-widest">{user?.username}</p>
                    {roundResult && <p className="text-xs font-bold text-white/50 uppercase">{roundResult.yourChoice}</p>}
                  </div>

                  <div className="lg:col-span-1 flex flex-col items-center justify-center gap-4">
                    <AnimatePresence mode="wait">
                      {arenaState === "WAITING" && (
                        <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="font-mono text-white/40 text-xs uppercase tracking-widest text-center">Aguardando a escolha do adversário...</p>
                        </motion.div>
                      )}

                      {arenaState === "ROUND_RESULT" && roundResult && (
                        <motion.div key="outcome" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.4 }} className={`px-6 py-3 border-4 font-black text-3xl uppercase tracking-widest ${roundResult.yourOutcome === "WIN" ? "border-primary text-primary" : roundResult.yourOutcome === "LOSS" ? "border-destructive text-destructive" : "border-white/40 text-white/40"}`}>
                          {roundResult.yourOutcome === "WIN" ? "VITÓRIA" : roundResult.yourOutcome === "LOSS" ? "DERROTA" : "EMPATE"}
                        </motion.div>
                      )}

                      {arenaState === "SELECTING" && (
                        <motion.p key="selecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-mono text-white/30 uppercase tracking-[0.3em] text-xs">
                          Seleciona o teu elemental
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="lg:col-span-1 flex flex-col items-center gap-2">
                    {arenaState === "WAITING" && selectedElemental ? (
                      <div style={{ width: 256, height: 320 }} className="flex items-center justify-center">
                        <div className="w-56 h-72 rounded-xl border-2 border-dashed border-destructive/20 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-destructive/40 border-t-transparent rounded-full animate-spin" />
                        </div>
                      </div>
                    ) : roundResult?.opponentChoice ? (
                      <ElementalCard type={roundResult.opponentChoice} size="lg" disabled />
                    ) : (
                      <div style={{ width: 256, height: 320 }} className="flex items-center justify-center opacity-40">
                        <div className="w-56 h-72 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                          <p className="font-mono text-white/20 text-xs uppercase tracking-widest text-center">Aguardando</p>
                        </div>
                      </div>
                    )}
                    <p className="font-mono text-destructive text-xs uppercase tracking-widest">{matchInfo.opponentUsername}</p>
                    {roundResult && <p className="text-xs font-bold text-white/50 uppercase">{roundResult.opponentChoice}</p>}
                  </div>
                </div>

                <div className="relative z-20 pb-2 pt-4 px-2 sm:px-4" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 54%, transparent 100%)" }}>
                  <AnimatePresence mode="wait">
                    {arenaState === "SELECTING" && (
                      <motion.div key="cards" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
                        <div className="flex justify-center gap-3 md:gap-6">
                          {ELEMENTALS.map((el) => (
                            <ElementalCard key={el} type={el} size="md" onClick={() => handleSelect(el)} />
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {arenaState === "ROUND_RESULT" && (
                      <motion.div key="next" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-center">
                        <Button onClick={handleNextRound} size="lg" className="h-14 px-16 text-lg font-bold uppercase tracking-widest neon-box">
                          Próximo Round
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {arenaState === "MATCH_OVER" && matchOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.3 }} className="flex flex-col items-center text-center p-10 border border-border rounded-2xl bg-card/80 max-w-lg w-full mx-4" style={{ boxShadow: isWinner ? "0 0 60px rgba(0,255,255,0.2)" : "0 0 60px rgba(255,50,50,0.1)" }}>
                {roundResult && <div className="mb-4"><ElementalCard type={roundResult.yourChoice} size="md" disabled /></div>}
                <h1 className={`text-6xl font-black uppercase tracking-tighter mb-2 ${isWinner ? "text-primary neon-text" : isDraw ? "text-white/60" : "text-destructive"}`}>{isWinner ? "VITÓRIA" : isDraw ? "EMPATE" : "DERROTA"}</h1>
                <p className="font-mono text-white/40 uppercase tracking-widest text-sm mb-2">Placar Final</p>
                <div className="text-4xl font-black mb-8">
                  <span className="text-primary">{yourScore}</span>
                  <span className="text-white/30 mx-3">-</span>
                  <span className="text-destructive">{opponentScore}</span>
                </div>
                <div className="flex gap-3 w-full">
                  <Button onClick={handleOfferRematch} size="lg" className="flex-1 h-12 font-bold uppercase tracking-widest neon-box">
                    Jogar Novamente
                  </Button>
                  <Button onClick={handleLeaveRoom} variant="outline" size="lg" className="flex-1 h-12 font-bold uppercase tracking-widest">
                    Sair da Sala
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {arenaState === "REMATCH_WAITING" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="flex flex-col items-center gap-6 p-10 border border-primary/30 rounded-2xl bg-card/80 text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <h2 className="text-3xl font-black uppercase tracking-widest text-primary">Aguardando revanche</h2>
                <p className="font-mono text-white/40 uppercase text-sm">A aguardar {matchInfo?.opponentUsername} aceitar...</p>
                <Button variant="outline" onClick={() => setArenaState("MATCH_OVER")} className="font-mono uppercase tracking-widest">Cancelar</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {arenaState === "REMATCH_OFFER" && (
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="flex flex-col items-center gap-6 p-10 border border-secondary/30 rounded-2xl bg-card/80 text-center">
                <h2 className="text-3xl font-black uppercase tracking-widest text-secondary">Revanche!</h2>
                <p className="font-mono text-white/60 uppercase text-sm">{matchInfo?.opponentUsername} quer uma nova partida</p>
                <div className="flex gap-4 w-full">
                  <Button onClick={handleOfferRematch} size="lg" className="flex-1 h-12 font-bold uppercase tracking-widest neon-box">Aceitar</Button>
                  <Button onClick={() => setLocation("/lobby")} variant="outline" size="lg" className="flex-1 h-12 font-bold uppercase tracking-widest">Recusar</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {arenaState === "OPPONENT_DISCONNECTED" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="flex flex-col items-center text-center gap-6 p-10 border border-border rounded-2xl bg-card/80 max-w-md mx-4">
                <h2 className="text-4xl font-black uppercase tracking-widest text-primary neon-text">Oponente saiu</h2>
                <p className="font-mono text-white/50 uppercase text-sm">O teu adversário abandonou a sala.</p>
                <Button onClick={() => {handleLeaveRoom(); setLocation("/lobby");}} size="lg" className="h-12 px-10 font-bold uppercase tracking-widest neon-box">Voltar ao Lobby</Button>
              </div>
            </motion.div>
          )}

          {isArena && opponentOffline && arenaState !== "OPPONENT_DISCONNECTED" && (
            <motion.div key="opp_offline_room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
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

          {isArena && !connected && (
            <motion.div key="self_offline_room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}>
              <div className="flex flex-col items-center text-center gap-6 p-10 border border-primary/40 rounded-2xl bg-card/80 max-w-md mx-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <h2 className="text-3xl font-black uppercase tracking-widest text-primary neon-text">Perda de Ligação</h2>
                <p className="font-mono text-white/50 uppercase text-sm leading-relaxed">
                  Perdeste a ligação ao servidor.<br />A tentar restabelecer conexão...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {arenaState === "ERROR" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
              <div className="flex flex-col items-center text-center gap-6 p-10 border border-destructive/40 rounded-2xl bg-card/80 max-w-md mx-4">
                <h2 className="text-4xl font-black uppercase tracking-widest text-destructive">Erro de Conexão</h2>
                <p className="font-mono text-white/50 uppercase text-sm">{errorMsg || "Erro inesperado."}</p>
                <Button onClick={() => setLocation("/lobby")} variant="outline" size="lg" className="h-12 px-10 font-bold uppercase tracking-widest">Voltar ao Lobby</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {connected && roomState?.canChat && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="fixed bottom-6 right-6 z-40">
              <Button onClick={() => setChatOpen((current) => !current)} className="rounded-full h-12 px-4 shadow-xl uppercase tracking-widest font-black neon-box">
                <MessageSquare className="w-4 h-4 mr-2" /> Chat
                {chatOpen ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronUp className="w-4 h-4 ml-2" />}
              </Button>

              <AnimatePresence>
                {chatOpen && (
                  <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }} className="absolute bottom-16 right-0 w-[min(92vw,360px)] rounded-2xl border border-border bg-black/90 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground font-mono">Sala {roomState.code}</p>
                        <p className="font-bold text-sm">Chat da batalha</p>
                      </div>
                      <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground text-sm">Fechar</button>
                    </div>

                    <div className="max-h-72 overflow-y-auto p-3 space-y-2">
                      {sortedMessages.length === 0 ? (
                        <div className="min-h-32 flex items-center justify-center text-center text-muted-foreground font-mono text-sm">
                          Ainda sem mensagens.
                        </div>
                      ) : (
                        sortedMessages.map((message) => {
                          const mine = message.senderUsername === user?.username;
                          return (
                            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[85%] rounded-2xl px-3 py-2 border ${mine ? "border-primary/40 bg-primary/10" : "border-border bg-white/5"}`}>
                                <div className="flex items-center justify-between gap-3 mb-1">
                                  <Link href={`/profile/${message.senderId}`} className={`text-[10px] font-mono uppercase tracking-widest hover:underline cursor-pointer ${mine ? "text-primary" : "text-secondary"}`}>
                                    {mine ? "Você" : message.senderUsername}
                                  </Link>
                                  <p className="text-[10px] font-mono text-muted-foreground">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                </div>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="p-3 border-t border-border/60 flex gap-2">
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleSendChat();
                          }
                        }}
                        disabled={!canChat}
                        placeholder={canChat ? "Escreve e carrega Enter" : "Aguardando o segundo jogador..."}
                        className="flex-1 h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-accent disabled:opacity-50"
                      />
                      <Button onClick={handleSendChat} disabled={!canChat} className="h-11 px-4 font-bold uppercase tracking-widest neon-box">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };
  // Early return for 3v3 mode
  if (roomSize === "3v3") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-4xl font-bold">Coming Soon</h1>
      </div>
    );
  }

// ft_transcendence/srcs/frontend/src/pages/room.tsx

// ... todo o código anterior permanece igual ...

return (
  <div className="max-w-6xl mx-auto space-y-8">
    {/* Cabeçalho - só aparece quando NÃO há dois jogadores na sala */}
    {!canChat && (
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-primary uppercase tracking-[0.35em] text-xs mb-2">Multiplayer Online</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest neon-text">Salas da Arena</h1>
          <p className="text-muted-foreground font-mono mt-2 max-w-2xl">
            Cria uma sala, partilha o código e a arena começa quando o segundo jogador entra. O chat fica disponível na própria batalha.
          </p>
        </div>
        
        {/* Botão "Voltar ao Lobby" - só aparece quando NÃO está numa sala ativa */}
        {!roomViewActive && (
          <Button variant="outline" onClick={() => setLocation("/lobby")} className="w-fit uppercase tracking-widest font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Lobby
          </Button>
        )}
      </div>
    )}

    {!roomViewActive ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/60 border-primary/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-primary">
              <Plus className="w-5 h-5" /> Criar Sala
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground font-mono">Gera um código e espera o outro jogador entrar.</p>
            <Button onClick={handleCreateRoom} disabled={busy && status === "creating"} className="w-full h-12 font-bold uppercase tracking-widest neon-box">
              {status === "creating" ? "A criar..." : "Gerar Código da Sala"}
            </Button>

            {roomState && (
              <div className="space-y-3 rounded-xl border border-border p-4 bg-black/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono uppercase text-muted-foreground">Código da Sala</p>
                    <p className="text-3xl font-black tracking-[0.35em] text-secondary">{roomState.code}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyCode} className="uppercase tracking-widest font-bold">
                    <Copy className="w-4 h-4 mr-2" /> Copiar
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase font-mono text-muted-foreground">Host</p>
                    <p className="font-bold">{roomState.hostUsername}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase font-mono text-muted-foreground">Convidado</p>
                    <p className="font-bold">{roomState.guestUsername ?? "Aguardando..."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${roomState.canChat ? "bg-primary" : "bg-muted-foreground"}`} />
                  {roomState.canChat ? "Sala pronta" : "Aguardando segundo jogador"}
                </div>
                <Button variant="outline" onClick={handleLeaveRoom} className="w-full uppercase tracking-widest font-bold">
                  <Users className="w-4 h-4 mr-2" /> Sair da Sala
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-secondary/20 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-secondary">
              <LogIn className="w-5 h-5" /> Entrar por Código
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground font-mono">Introduz o código e entra na sala do host.</p>
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="Ex: A7K2P9"
              className="w-full h-12 rounded-md border border-border bg-background px-4 font-mono tracking-[0.3em] uppercase outline-none focus:border-secondary"
            />
            <Button onClick={handleJoinRoom} disabled={busy && status === "joining"} className="w-full h-12 font-bold uppercase tracking-widest neon-box">
              {status === "joining" ? "A entrar..." : "Entrar na Sala"}
            </Button>
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground font-mono">
              A sala cria a partida assim que estiverem dois jogadores online.
            </div>
          </CardContent>
        </Card>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-black/30 p-4">
          <div>
            <p className="text-xs font-mono uppercase text-muted-foreground">Sala</p>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-black tracking-[0.35em] text-secondary">{roomState?.code ?? roomViewCode}</p>
              <Button variant="outline" size="sm" onClick={handleCopyCode} className="uppercase tracking-widest font-bold">
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
            </div>
          </div>
          <div className="text-sm font-mono text-muted-foreground text-right">
            <p>{roomState?.hostUsername ?? "A sincronizar..."} vs {roomState?.guestUsername ?? "..."}</p>
            <p>{canChat ? "Chat ativo" : "Aguardando segundo jogador"}</p>
          </div>
        </div>

        {renderArena()}

        {/* Botão "Abandonar Sala" - aparece quando está dentro de uma sala ativa */}
        {roomViewActive && (
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
    )}
  </div>
);}