import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Copy, LogIn, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWs, type ServerMsg } from "@/hooks/use-ws";
import { loadRoomSession } from "@/lib/room-session";

interface RoomState {
  code: string;
  hostUsername: string;
  guestUsername: string | null;
  canChat: boolean;
  matchId: number | null;
}

export default function Game3v3() {
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { send, onMessage, connected } = useWs(token);

  const [roomCode, setRoomCode] = useState("");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "creating" | "joining">("idle");

  const persistedRoom = loadRoomSession();
  useEffect(() => {
    if (persistedRoom) {
      setLocation(`${persistedRoom.path}?code=${encodeURIComponent(persistedRoom.code)}`);
    }
  }, [persistedRoom, setLocation]);

  useEffect(() => {
    const off = onMessage((msg: ServerMsg) => {
      switch (msg.type) {
        case "ROOM_CREATED":
        case "ROOM_JOINED":
          setLocation(`/room/3v3?code=${encodeURIComponent(msg.code)}`);
          break;
        case "ROOM_UPDATED":
          setRoomState({
            code: msg.code,
            hostUsername: msg.hostUsername,
            guestUsername: msg.guestUsername,
            canChat: msg.canChat,
            matchId: msg.matchId,
          });
          setRoomCode(msg.code);
          setBusy(false);
          setStatus("idle");
          break;
        case "ROOM_CLOSED":
          setRoomState(null);
          setBusy(false);
          setStatus("idle");
          toast({ title: "Sala fechada", description: "A sala foi encerrada pelo host.", variant: "destructive" });
          break;
        case "ROOM_FULL":
          setBusy(false);
          setStatus("idle");
          toast({ title: "Sala cheia", description: `O código ${msg.code} já tem dois jogadores.`, variant: "destructive" });
          break;
        case "ROOM_NOT_FOUND":
          setBusy(false);
          setStatus("idle");
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
  }, [onMessage, toast]);

  const handleCreateRoom = () => {
    if (!connected) {
      toast({ title: "Sem conexão", description: "Conecta ao servidor primeiro.", variant: "destructive" });
      return;
    }
    setBusy(true);
    setStatus("creating");
    send({ type: "CREATE_ROOM", mode: "3v3" });
  };

  const handleJoinRoom = () => {
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      toast({ title: "Código necessário", description: "Introduz o código da sala.", variant: "destructive" });
      return;
    }
    setLocation(`/room/3v3?code=${encodeURIComponent(code)}`);
  };

  const handleCopyCode = async () => {
    if (!roomState?.code) return;
    await navigator.clipboard.writeText(roomState.code);
    toast({ title: "Código copiado", description: roomState.code });
  };

  const handleLeaveRoom = () => {
    send({ type: "LEAVE_ROOM" });
    setRoomState(null);
    setBusy(false);
    setStatus("idle");
  };

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-300 font-mono mb-2">Modo 3v3</p>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-widest text-white">3v3 PvP</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Cria uma sala, partilha o código e espera os teus aliados entrarem.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setLocation("/lobby")} className="uppercase tracking-widest font-bold">
              <ArrowLeft className="w-4 h-4 mr-2" /> Lobby
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-[#170303]/95 border border-red-600/20 shadow-[0_0_40px_rgba(255,60,60,0.16)]">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-widest text-red-300">1. Preparar Equipa</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70">
              Cria a sala 3v3, escolhe os teus aliados e prepara a estratégia antes do duelo começar.
            </CardContent>
          </Card>

          <Card className="bg-[#170303]/95 border border-red-600/20 shadow-[0_0_40px_rgba(255,60,60,0.16)]">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-widest text-red-300">2. Partilhar Código</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70">
              Envia o código da sala aos teus dois companheiros para que possam entrar.
            </CardContent>
          </Card>

          <Card className="bg-[#170303]/95 border border-red-600/20 shadow-[0_0_40px_rgba(255,60,60,0.16)]">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-widest text-red-300">3. Ver Equipa</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70">
              O host vê os nomes aparecerem assim que cada jogador entra na sala.
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/60 border-red-600/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-red-300">
                <Plus className="w-5 h-5" /> Criar Sala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground font-mono">Gera um código e espera os outros dois jogadores entrarem.</p>
              {!roomState ? (
                <Button
                  onClick={handleCreateRoom}
                  disabled={busy && status === "creating"}
                  className="w-full h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {status === "creating" ? "A criar..." : "Gerar Código da Sala"}
                </Button>
              ) : (
                <>
                  <div className="space-y-3 rounded-xl border border-border p-4 bg-black/30">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono uppercase text-muted-foreground">Código da Sala</p>
                        <p className="text-3xl font-black tracking-[0.35em] text-red-300">{roomState.code}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyCode}
                        className="uppercase tracking-widest font-bold"
                      >
                        <Copy className="w-4 h-4 mr-2" /> Copiar
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs uppercase font-mono text-muted-foreground">Host</p>
                        <p className="font-bold">{roomState.hostUsername}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs uppercase font-mono text-muted-foreground">Jogador 2</p>
                        <p className="font-bold">{roomState.guestUsername ?? "Aguardando..."}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-xs uppercase font-mono text-muted-foreground">Jogador 3</p>
                        <p className="font-bold text-muted-foreground">Aguardando...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${roomState.guestUsername ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                      {roomState.guestUsername ? "Sala atualizada" : "Aguardando segundo jogador"}
                    </div>
                    <Button
                      onClick={handleLeaveRoom}
                      variant="outline"
                      className="w-full uppercase tracking-widest font-bold border-red-400/40 text-red-400 hover:bg-red-950/40"
                    >
                      <X className="w-4 h-4 mr-2" /> Fechar Sala
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-red-600/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-red-300">
                <LogIn className="w-5 h-5" /> Entrar por Código
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground font-mono">Introduz o código e entra na sala do host.</p>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="Ex: A7K2P9"
                maxLength={6}
                className="w-full h-12 rounded-md border border-border bg-background px-4 font-mono tracking-[0.3em] uppercase outline-none focus:border-red-500 text-center"
              />
              <Button
                onClick={handleJoinRoom}
                disabled={busy && status === "joining"}
                className="w-full h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {status === "joining" ? "A entrar..." : "Entrar na Sala"}
              </Button>
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground font-mono">
                A sala fica visível para o host assim que entrares.
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
