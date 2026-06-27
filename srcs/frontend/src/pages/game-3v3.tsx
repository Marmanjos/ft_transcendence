import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, LogIn, Copy } from "lucide-react";

export default function Game3v3() {
  const [, setLocation] = useLocation();
  const [roomCode, setRoomCode] = useState("");

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-300 font-mono mb-2">Modo 3v3</p>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-widest text-white">3v3 PvP</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Aqui podes preparar a tua próxima partida 3v3 antes de entrar em combate. Cria a sala, partilha o código e aguarda os dois aliados chegar.
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
              Depois de todos estarem prontos, entra na arena para começar o 3v3. Por enquanto, este modo está em pré-visualização.
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
              <Button onClick={() => {}} className="w-full h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700">
                Gerar Código da Sala
              </Button>

              <div className="space-y-3 rounded-xl border border-border p-4 bg-black/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono uppercase text-muted-foreground">Código da Sala</p>
                    <p className="text-3xl font-black tracking-[0.35em] text-red-300">A7K2P9</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {}} className="uppercase tracking-widest font-bold">
                    <Copy className="w-4 h-4 mr-2" /> Copiar
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase font-mono text-muted-foreground">Host</p>
                    <p className="font-bold">Você</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase font-mono text-muted-foreground">Aliado 1</p>
                    <p className="font-bold text-muted-foreground">Aguardando...</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase font-mono text-muted-foreground">Aliado 2</p>
                    <p className="font-bold text-muted-foreground">Aguardando...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                  Aguardando segundo e terceiro jogador
                </div>
              </div>
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
                className="w-full h-12 rounded-md border border-border bg-background px-4 font-mono tracking-[0.3em] uppercase outline-none focus:border-red-500"
              />
              <Button onClick={() => {}} className="w-full h-12 font-bold uppercase tracking-widest neon-box bg-red-600 hover:bg-red-700">
                Entrar na Sala
              </Button>
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground font-mono">
                A sala cria a partida assim que estiverem três jogadores online.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

