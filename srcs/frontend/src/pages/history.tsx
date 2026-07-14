import { useListMatches } from "@workspace/api-client-react";
import { MatchStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function History() {
  const { user } = useAuth();
  const { data: matches, isLoading } = useListMatches();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-widest text-primary neon-text">Histórico de Batalhas</h1>
        <p className="text-muted-foreground font-mono mt-2">Seus registros de combate na arena.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !matches || matches.length === 0 ? (
        <Card className="bg-card/50 border-border border-dashed">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground font-mono uppercase">Nenhuma batalha registrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <Link key={match.id} href={`/match/${match.id}`}>
              <Card className="bg-card/50 border-border hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="font-mono text-sm text-muted-foreground mb-1 uppercase">
                      {format(new Date(match.createdAt), "dd 'de' MMMM, yyyy • HH:mm", { locale: ptBR })}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-4 text-xl font-bold uppercase tracking-widest">
                      <span className="text-primary">{match.player1Username}</span>
                      <span className="text-muted-foreground text-sm font-black opacity-50">VS</span>
                      <span className="text-destructive">{match.player2Username || 'IA'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-mono mb-1">Placar</p>
                      <div className="text-2xl font-black bg-background px-4 py-1 rounded border border-border group-hover:border-primary/50 transition-colors">
                        {match.player1Score} - {match.player2Score}
                      </div>
                    </div>
                    <div className="w-32 text-right">
                      {match.status === MatchStatus.COMPLETED || match.status === MatchStatus.ABANDONED ? (
                        user && match.winnerId === user.id ? (
                          <span className="text-primary font-black uppercase tracking-widest text-sm neon-text">Vitória</span>
                        ) : match.player1Score === match.player2Score && match.status === MatchStatus.COMPLETED ? (
                          <span className="text-muted-foreground font-black uppercase tracking-widest text-sm">Empate</span>
                        ) : (
                          <span className="text-destructive font-black uppercase tracking-widest text-sm neon-text-destructive">Derrota</span>
                        )
                      ) : (
                        <span className="text-accent font-bold uppercase tracking-widest text-sm">Em Andamento</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
