import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetArenaSummary, useListMatches, useGetLeaderboard, useCreateMatch } from "@workspace/api-client-react";
import { MatchMode, MatchStatus } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Users, Swords, Activity, Trophy, Bot, Globe, History } from "lucide-react";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: summary } = useGetArenaSummary();
  const { data: matches } = useListMatches({ limit: 5 });
  const { data: leaderboard } = useGetLeaderboard({ limit: 5 });
  
  const createMatch = useCreateMatch();

  const handlePlayAI = async () => {
    try {
      const match = await createMatch.mutateAsync({ data: { mode: MatchMode.SINGLE_PLAYER } });
      setLocation(`/game?matchId=${match.id}`);
    } catch (error) {
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível iniciar a partida.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-widest text-primary neon-text">Terminal da Arena</h1>
          <p className="text-muted-foreground font-mono mt-1">Conectado à rede global de duelos.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button
            size="lg"
            onClick={handlePlayAI}
            disabled={createMatch.isPending}
            className="h-14 px-6 text-base font-bold uppercase tracking-widest neon-box w-full sm:w-auto"
          >
            <Bot className="w-5 h-5 mr-2" />
            {createMatch.isPending ? "Inicializando..." : "VS Inteligência Artificial"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setLocation("/room")}
            className="h-14 px-6 text-base font-bold uppercase tracking-widest border-secondary/50 text-secondary hover:bg-secondary/10 hover:border-secondary w-full sm:w-auto"
          >
            <Globe className="w-5 h-5 mr-2" />
            Salas Online
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-primary/20 backdrop-blur">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/30 text-primary">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-mono uppercase">Combatentes Ativos</p>
              <p className="text-3xl font-black text-white">{summary?.totalPlayers || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-secondary/20 backdrop-blur">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/30 text-secondary">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-mono uppercase">Duelos Hoje</p>
              <p className="text-3xl font-black text-white">{summary?.matchesToday || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-accent/20 backdrop-blur">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/30 text-accent">
              <Swords className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-mono uppercase">Em Andamento</p>
              <p className="text-3xl font-black text-white">{summary?.activeMatches || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
            <History className="w-5 h-5 text-primary" /> Histórico Recente
          </h2>
          <div className="space-y-3">
            {!matches || matches.length === 0 ? (
              <p className="text-muted-foreground font-mono text-sm py-4 text-center border border-dashed border-border rounded">Nenhum duelo registrado.</p>
            ) : (
              matches.map((match) => (
                <Link key={match.id} href={`/match/${match.id}`}>
                  <div className="bg-muted/30 hover:bg-muted/50 border border-border hover:border-primary/50 transition-colors rounded-lg p-4 flex justify-between items-center cursor-pointer">
                    <div>
                      <p className="font-bold">{match.player1Username} VS {match.player2Username || 'IA'}</p>
                      <p className="text-xs text-muted-foreground font-mono">{new Date(match.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg tracking-widest">{match.player1Score} - {match.player2Score}</p>
                      <span className={`text-xs uppercase font-mono px-2 py-1 rounded ${match.status === MatchStatus.COMPLETED ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {match.status === MatchStatus.COMPLETED ? 'FINALIZADO' : 'EM ANDAMENTO'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 border-b border-border pb-2">
            <Trophy className="w-5 h-5 text-secondary" /> Placar Global
          </h2>
          <div className="space-y-3">
            {!leaderboard || leaderboard.length === 0 ? (
              <p className="text-muted-foreground font-mono text-sm py-4 text-center border border-dashed border-border rounded">Placar vazio.</p>
            ) : (
              leaderboard.map((entry, idx) => (
                <Link key={entry.userId} href={`/profile/${entry.userId}`}>
                  <div className="bg-muted/30 hover:bg-muted/50 border border-border hover:border-secondary/50 transition-colors rounded-lg p-4 flex items-center gap-4 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-background border border-secondary flex items-center justify-center font-black text-secondary">
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold uppercase tracking-wider">{entry.username}</p>
                      <p className="text-xs text-muted-foreground font-mono">Taxa de Vitória: {(entry.winRate * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{entry.wins} V</p>
                      <p className="text-sm text-destructive">{entry.losses} D</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

