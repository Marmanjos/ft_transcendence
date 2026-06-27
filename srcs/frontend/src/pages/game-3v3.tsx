import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, LogIn, Copy, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MatchManager, type Match } from "@/lib/match-manager";

export default function Game3v3() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const username = user?.username ?? `guest_${Math.random().toString(36).slice(2,6)}`;

  const [roomCode, setRoomCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  useEffect(() => {
    // Recover host's created match if still active
    const activeMatches = MatchManager.getActiveMatches();
    for (const [code, matchId] of Object.entries(activeMatches)) {
      const match = MatchManager.getMatch(matchId as string);
      if (match && match.hostId === username) {
        setGeneratedCode(code);
        setCurrentMatch(match);
        break; // Only one active host match at a time
      }
    }
  }, [username]);

  // Poll for real-time match updates while on setup page
  useEffect(() => {
    if (!generatedCode || !currentMatch) return;
    
    const interval = setInterval(() => {
      const updated = MatchManager.getMatch(currentMatch.id);
      if (updated) {
        setCurrentMatch(updated);
      } else {
        // Match expired/deleted
        setGeneratedCode(null);
        setCurrentMatch(null);
      }
    }, 1000); // Update every 1 second

    return () => clearInterval(interval);
  }, [generatedCode, currentMatch?.id]);

  useEffect(() => {
    // Cleanup expired matches on mount
    MatchManager.cleanupExpiredMatches();
  }, []);

  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const match = MatchManager.createMatch(code, username, username);
    setGeneratedCode(code);
    setCurrentMatch(match);
  };

  const joinRoom = () => {
    if (!roomCode.trim()) return;
    const match = MatchManager.getOrCreateMatch(roomCode, username, username);
    if (!match) {
      alert("Sala não encontrada ou expirou.");
      return;
    }
    setCurrentMatch(match);
    setLocation(`/game/3v3/arena?matchId=${match.id}`);
  };

  const startGame = () => {
    if (!currentMatch) return;
    MatchManager.saveMatch(currentMatch);
    MatchManager.broadcastMatchUpdate(currentMatch, "MATCH_START");
    setLocation(`/game/3v3/arena?matchId=${currentMatch.id}`);
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
    }
  };

  const closeRoom = () => {
    if (!currentMatch) return;
    MatchManager.deleteMatch(currentMatch.id);
    setGeneratedCode(null);
    setCurrentMatch(null);
    setRoomCode("");
  };

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-300 font-mono mb-2">Modo 3v3</p>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-widest text-white">3v3 PvP</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Cria uma sala, partilha o código com dois aliados e começam o duelo. Três contra três!
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
              Envia o código da sala aos teus dois companheiros para que possam entrar antes de iniciar o combate.
            </CardContent>
          </Card>

          <Card className="bg-[#170303]/95 border border-red-600/20 shadow-[0_0_40px_rgba(255,60,60,0.16)]">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-widest text-red-300">3. Iniciar Confronto</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70">
              Depois de preparada, entra na arena com os teus dois aliados para começar o 3v3 épico.
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
              <p className="text-sm text-muted-foreground font-mono">Gera um código e espera os outros dois jogadores entrar.</p>
              {!currentMatch ? (
                <Button
                  onClick={generateRoomCode}
                  className="w-full h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700"
                >
                  Gerar Código da Sala
                </Button>
              ) : (
                <>
                  <div className="space-y-3 rounded-xl border border-border p-4 bg-black/30">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono uppercase text-muted-foreground">Código da Sala</p>
                        <p className="text-3xl font-black tracking-[0.35em] text-red-300">{generatedCode}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyCode}
                        className="uppercase tracking-widest font-bold"
                      >
                        <Copy className="w-4 h-4 mr-2" /> Copiar
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      {currentMatch.players.map((p, idx) => (
                        <div key={idx} className="rounded-lg border border-border p-3">
                          <p className="text-xs uppercase font-mono text-muted-foreground">
                            {idx === 0 ? "Host" : `Jogador ${idx}`}
                          </p>
                          <p className="font-bold">{p.username}</p>
                        </div>
                      ))}
                      {currentMatch.players.length < 3 && (
                        <>
                          {[...Array(3 - currentMatch.players.length)].map((_, i) => (
                            <div key={`await_${i}`} className="rounded-lg border border-border p-3">
                              <p className="text-xs uppercase font-mono text-muted-foreground">Jogador {currentMatch.players.length + i + 1}</p>
                              <p className="font-bold text-muted-foreground">Aguardando...</p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                      Sala criada - {currentMatch.players.length}/3 jogadores
                    </div>
                    <Button
                      onClick={startGame}
                      disabled={currentMatch.players.length < 3}
                      className="w-full uppercase tracking-widest font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      Iniciar Partida
                    </Button>
                    <Button
                      onClick={closeRoom}
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
                onClick={joinRoom}
                disabled={!roomCode.trim() || roomCode.length !== 6}
                className="w-full h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Entrar na Sala
              </Button>
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground font-mono">
                A sala inicia quando o host carregar em "Iniciar Partida" com todos os jogadores presentes.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


