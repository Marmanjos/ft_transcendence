import { useGetMatch } from "@workspace/api-client-react";
import { RoundOutcome, Elemental, MatchStatus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";

const ElementalName = {
  [Elemental.TITAN]: "TITAN",
  [Elemental.RAZOR]: "RAZOR",
  [Elemental.WRAITH]: "WRAITH"
};

const ElementalColor = {
  [Elemental.TITAN]: "text-amber-500",
  [Elemental.RAZOR]: "text-cyan-500",
  [Elemental.WRAITH]: "text-purple-500"
};

export default function MatchDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const { data: match, isLoading } = useGetMatch(id, { query: { queryKey: ["/api/matches", id], enabled: !!id } });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!match) {
    return <div className="text-center py-20 font-mono text-muted-foreground uppercase">Duelo não encontrado.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <p className="text-sm font-mono text-muted-foreground uppercase">
          Registro de Combate #{match.id} • {format(new Date(match.createdAt), "dd/MM/yyyy HH:mm")}
        </p>
        
        <div className="flex items-center justify-center gap-8">
          <div className="text-right flex-1">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-primary neon-text">{match.player1Username}</h2>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-4xl md:text-6xl font-black bg-background px-6 py-2 rounded-lg border-2 border-border mb-2">
              {match.player1Score} <span className="text-muted-foreground text-2xl mx-2">-</span> {match.player2Score}
            </div>
            {(match.status === MatchStatus.COMPLETED || match.status === MatchStatus.ABANDONED) && (
              <div className={`text-lg font-bold uppercase tracking-widest px-4 py-1 rounded
                ${match.winnerId === match.player1Id ? 'bg-primary/20 text-primary' :
                  match.player1Score === match.player2Score && match.status === MatchStatus.COMPLETED ? 'bg-muted text-muted-foreground' :
                  'bg-destructive/20 text-destructive'}`}>
                {match.winnerId === match.player1Id ? 'Vencedor' : match.player1Score === match.player2Score && match.status === MatchStatus.COMPLETED ? 'Empate' : 'Derrotado'}
              </div>
            )}
          </div>
          
          <div className="text-left flex-1">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-destructive neon-text-destructive">{match.player2Username || 'IA'}</h2>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-12">
        <h3 className="text-xl font-bold uppercase tracking-widest border-b border-border pb-2">Rounds Disputados</h3>
        
        {!match.rounds || match.rounds.length === 0 ? (
          <p className="text-muted-foreground font-mono text-center py-8 border border-dashed border-border rounded">Nenhum round registrado.</p>
        ) : (
          match.rounds.map((round) => (
            <Card key={round.id} className="bg-card/50 border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="w-12 h-12 bg-background border border-border rounded flex items-center justify-center font-black text-xl text-muted-foreground">
                  {round.roundNumber}
                </div>
                
                <div className="flex-1 flex justify-center items-center gap-8 md:gap-16">
                  <div className={`text-xl font-bold tracking-widest ${ElementalColor[round.player1Choice]}`}>
                    {ElementalName[round.player1Choice]}
                  </div>
                  
                  <div className={`px-4 py-1 border rounded text-xs font-bold uppercase tracking-widest
                    ${round.outcome === RoundOutcome.WIN ? 'border-primary text-primary' :
                      round.outcome === RoundOutcome.LOSS ? 'border-destructive text-destructive' :
                      'border-muted-foreground text-muted-foreground'}`}>
                    {round.outcome === RoundOutcome.WIN ? 'Vitória' :
                     round.outcome === RoundOutcome.LOSS ? 'Derrota' : 'Empate'}
                  </div>
                  
                  <div className={`text-xl font-bold tracking-widest ${ElementalColor[round.player2Choice]}`}>
                    {ElementalName[round.player2Choice]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
