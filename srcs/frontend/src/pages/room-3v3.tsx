import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Copy, LogIn, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { type ServerMsg } from "@/hooks/use-ws";
import { useWsContext } from "@/contexts/ws-context";
import { clearRoomSession, loadRoomSession, saveRoomSession } from "@/lib/room-session";

interface RoomState {
  code: string;
  hostUsername: string;
  guestUsername: string | null;
  guestUsernames: string[];
  canChat: boolean;
  matchId: number | null;
}

const ROOM_PATH = "/room/3v3" as const;

export default function Room3v3Page() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { send, onMessage, connected } = useWsContext();

  const searchParams = new URLSearchParams(window.location.search);
  const initialCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const persistedRoom = loadRoomSession();
  const initialRoomCode = initialCode || (persistedRoom?.path === ROOM_PATH ? persistedRoom.code : "");

  const autoJoinSent = useRef(false);

  const [roomCode, setRoomCode] = useState(initialCode);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState(initialRoomCode);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "joining">("idle");
  const [readyUsernames, setReadyUsernames] = useState<string[]>([]);

  useEffect(() => {
    if (persistedRoom && persistedRoom.path !== ROOM_PATH) {
      setLocation(`${persistedRoom.path}?code=${encodeURIComponent(persistedRoom.code)}`);
    }
  }, [persistedRoom, setLocation]);

  const actionLocked = roomState !== null || activeRoomCode !== "" || status !== "idle";
  const roomViewCode = roomState?.code ?? activeRoomCode;
  const roomViewActive = roomState !== null || activeRoomCode !== "";

  useEffect(() => {
    const off = onMessage((msg: ServerMsg) => {
      switch (msg.type) {
        case "ROOM_CREATED":
        case "ROOM_JOINED":
        case "ROOM_UPDATED":
          setRoomState({
            code: msg.code,
            hostUsername: msg.hostUsername,
            guestUsername: msg.guestUsername,
            guestUsernames: msg.guestUsernames ?? (msg.guestUsername ? [msg.guestUsername] : []),
            canChat: msg.canChat,
            matchId: msg.matchId,
          });
          setActiveRoomCode(msg.code);
          setRoomCode(msg.code);
          setReadyUsernames([]);
          saveRoomSession({ code: msg.code, path: ROOM_PATH });
          if (window.location.pathname !== ROOM_PATH || window.location.search !== `?code=${encodeURIComponent(msg.code)}`) {
            setLocation(`${ROOM_PATH}?code=${encodeURIComponent(msg.code)}`);
          }
          if (msg.matchId) {
            setLocation(`/game/3v3/arena?matchId=${msg.matchId}`);
          }
          setBusy(false);
          setStatus("idle");
          break;
        case "ROOM_PLAYER_READY":
          setReadyUsernames(msg.readyUsernames);
          break;
        case "ROOM_CLOSED":
          setRoomState(null);
          setActiveRoomCode("");
          clearRoomSession();
          setBusy(false);
          setStatus("idle");
          setLocation(ROOM_PATH);
          toast({ title: "Sala fechada", description: "A sala foi encerrada pelo host.", variant: "destructive" });
          break;
        case "ROOM_FULL":
          setBusy(false);
          setStatus("idle");
          setActiveRoomCode("");
          toast({ title: "Sala cheia", description: `O código ${msg.code} já tem dois jogadores.`, variant: "destructive" });
          break;
        case "ROOM_NOT_FOUND":
          setBusy(false);
          setStatus("idle");
          setActiveRoomCode("");
          clearRoomSession();
          if (initialRoomCode === msg.code) {
            setLocation(ROOM_PATH);
          }
          toast({ title: "Sala não encontrada", description: `Nenhuma sala com o código ${msg.code}.`, variant: "destructive" });
          break;
        case "ERROR":
          setBusy(false);
          setStatus("idle");
          toast({ title: "Erro", description: msg.message, variant: "destructive" });
          break;
      }
    });

    return off;
  }, [initialRoomCode, onMessage, setLocation, toast]);

  useEffect(() => {
    if (autoJoinSent.current) return;
    if (!connected || !initialRoomCode) return;
    autoJoinSent.current = true;
    setRoomCode(initialRoomCode);
    setStatus("joining");
    setBusy(true);
    send({ type: "JOIN_ROOM", code: initialRoomCode });
  }, [connected, initialRoomCode, send]);

  const handleCreateRoom = () => {
    if (roomViewActive) return;
    if (!connected) {
      toast({ title: "Sem conexão", description: "Conecta ao servidor primeiro.", variant: "destructive" });
      return;
    }
    setBusy(true);
    setStatus("creating");
    send({ type: "CREATE_ROOM", mode: "3v3" });
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
    const code = roomViewCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast({ title: "Código copiado", description: code });
  };

  const handleLeaveRoom = () => {
    send({ type: "LEAVE_ROOM" });
    setRoomState(null);
    setActiveRoomCode("");
    clearRoomSession();
    setBusy(false);
    setStatus("idle");
    setRoomCode("");
    setReadyUsernames([]);
    setLocation(ROOM_PATH);
  };

  const handleReady = () => {
    send({ type: "PLAYER_READY" });
  };

  const allPlayers = roomState
    ? [roomState.hostUsername, ...roomState.guestUsernames]
    : [];
  const isFull = allPlayers.length === 3;
  const myUsername = user?.username ?? "";
  const iAmReady = readyUsernames.includes(myUsername);

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-300 font-mono mb-2">3v3 Room</p>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-widest text-white">Battle Room</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Cria uma sala, entra com um código e depois ficas apenas na sala ativa até saires ou a apagares.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/lobby")}
            disabled={roomViewActive}
            variant="outline"
            className="uppercase tracking-widest font-bold border-red-400/40 text-red-400 hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>

        {!roomViewActive ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/60 border-red-600/20 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-red-300">
                  <Plus className="w-5 h-5" /> Criar Sala
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground font-mono">Gera um código e espera os outros dois jogadores entrarem.</p>
                <Button
                  onClick={handleCreateRoom}
                  disabled={actionLocked || busy}
                  className="w-full h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {status === "creating" ? "A criar..." : "Gerar Código da Sala"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-red-600/20 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-red-300">
                  <LogIn className="w-5 h-5" /> Entrar por Código
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground font-mono">Introduz um código e entra diretamente na sala.</p>
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder="Ex: A7K2P9"
                  maxLength={6}
                  disabled={actionLocked || busy}
                  className="w-full h-12 rounded-md border border-border bg-background px-4 font-mono tracking-[0.3em] uppercase outline-none focus:border-red-500 text-center disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={actionLocked || busy}
                  className="w-full h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {status === "joining" ? "A entrar..." : "Entrar na Sala"}
                </Button>
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground font-mono">
                  O host verá o teu nome assim que entrares.
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <Card className="bg-card/60 border-red-600/20 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-red-300">
                  <Users className="w-5 h-5" /> Sala Ativa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 rounded-xl border border-border p-4 bg-black/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono uppercase text-muted-foreground">Código da Sala</p>
                      <p className="text-3xl font-black tracking-[0.35em] text-red-300">{roomViewCode || "..."}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCopyCode} className="uppercase tracking-widest font-bold">
                      <Copy className="w-4 h-4 mr-2" /> Copiar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs uppercase font-mono text-muted-foreground">Host</p>
                      <p className="font-bold">{roomState?.hostUsername ?? "A sincronizar..."}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs uppercase font-mono text-muted-foreground">Jogador 2</p>
                      <p className="font-bold">{roomState?.guestUsernames[0] ?? "Aguardando..."}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs uppercase font-mono text-muted-foreground">Jogador 3</p>
                      <p className="font-bold">{roomState?.guestUsernames[1] ?? "Aguardando..."}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${roomState?.guestUsernames.length ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                    {roomState?.guestUsernames.length ? `${roomState.guestUsernames.length}/2 jogadores` : "Aguardando segundo jogador"}
                  </div>

                  {isFull && (
                    <div className="rounded-xl border border-border p-4 space-y-3">
                      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Estado dos jogadores</p>
                      <div className="grid grid-cols-3 gap-2">
                        {allPlayers.map((name) => (
                          <div
                            key={name}
                            className={`rounded-lg border p-2 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                              readyUsernames.includes(name)
                                ? "border-green-500/50 bg-green-950/40 text-green-400"
                                : "border-border bg-black/30 text-muted-foreground"
                            }`}
                          >
                            <span className={`mr-1 ${readyUsernames.includes(name) ? "text-green-400" : "text-muted-foreground"}`}>
                              {readyUsernames.includes(name) ? "✓" : "○"}
                            </span>
                            {name}
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={handleReady}
                        disabled={iAmReady}
                        className={`w-full h-12 font-bold uppercase tracking-widest transition-all ${
                          iAmReady
                            ? "bg-green-700 hover:bg-green-700 cursor-not-allowed opacity-80"
                            : "neon-box bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {iAmReady ? "✓ Pronto!" : "Pronto"}
                      </Button>
                      {readyUsernames.length > 0 && readyUsernames.length < 3 && (
                        <p className="text-xs text-center font-mono text-muted-foreground animate-pulse">
                          A aguardar {3 - readyUsernames.length} jogador{3 - readyUsernames.length !== 1 ? "es" : ""}...
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleLeaveRoom}
                    variant="outline"
                    className="w-full uppercase tracking-widest font-bold border-red-400/40 text-red-400 hover:bg-red-950/40"
                  >
                    <Users className="w-4 h-4 mr-2" /> Sair da Sala
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
