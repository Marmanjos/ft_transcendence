import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function Game3v3() {
  const [, setLocation] = useLocation();

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

        <div className="rounded-3xl border border-red-600/30 bg-[#130202]/90 p-8 shadow-[0_0_60px_rgba(255,60,60,0.16)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-widest text-white">Configuração 3v3</h2>
              <p className="mt-3 max-w-2xl text-sm text-white/70">
                Ainda não temos a sala 3v3 funcional. Usa esta página para preparar a tua equipa e regressa ao lobby quando quiseres jogar 1v1.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setLocation("/room")} className="w-full sm:w-auto uppercase tracking-widest font-bold">
                1v1 PvP
              </Button>
              <Button variant="outline" onClick={() => setLocation("/lobby")} className="w-full sm:w-auto uppercase tracking-widest font-bold text-red-300 border-red-500/40 hover:border-red-400">
                Voltar ao Lobby
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
