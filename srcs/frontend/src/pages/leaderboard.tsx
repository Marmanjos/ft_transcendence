import { useGetLeaderboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Trophy, Medal, Star } from "lucide-react";

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard({ limit: 50 });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black uppercase tracking-widest text-secondary neon-text-secondary">Placar Global</h1>
        <p className="text-muted-foreground font-mono mt-2">Os combatentes mais letais da rede.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <div className="text-center py-20 font-mono text-muted-foreground uppercase border border-dashed border-border rounded-xl">
          Nenhum dado registrado.
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <Link key={entry.userId} href={`/profile/${entry.userId}`}>
              <div className={`relative flex items-center gap-6 p-4 md:p-6 rounded-xl border transition-all hover:translate-x-2 cursor-pointer
                ${entry.rank === 1 ? 'bg-amber-950/40 border-amber-500/50 hover:border-amber-500 z-30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 
                  entry.rank === 2 ? 'bg-slate-900/40 border-slate-400/50 hover:border-slate-400 z-20' : 
                  entry.rank === 3 ? 'bg-orange-950/30 border-orange-700/50 hover:border-orange-700 z-10' : 
                  'bg-card/40 border-border hover:border-secondary/50'}`}>
                
                <div className={`w-12 h-12 flex items-center justify-center rounded-full border-2 font-black text-xl shadow-inner
                  ${entry.rank === 1 ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 
                    entry.rank === 2 ? 'border-slate-400 text-slate-400 bg-slate-400/10' : 
                    entry.rank === 3 ? 'border-orange-700 text-orange-700 bg-orange-700/10' : 
                    'border-muted text-muted-foreground bg-background'}`}>
                  {entry.rank === 1 ? <Trophy className="w-5 h-5" /> : 
                   entry.rank === 2 ? <Medal className="w-5 h-5" /> : 
                   entry.rank === 3 ? <Star className="w-5 h-5" /> : 
                   entry.rank}
                </div>

                <div className="flex-1">
                  <h3 className={`text-xl font-bold uppercase tracking-widest
                    ${entry.rank === 1 ? 'text-amber-500' : 
                      entry.rank === 2 ? 'text-slate-300' : 
                      entry.rank === 3 ? 'text-orange-600' : 
                      'text-foreground'}`}>
                    {entry.username}
                  </h3>
                  <div className="flex gap-4 mt-1 text-sm font-mono text-muted-foreground uppercase">
                    <span>{entry.totalMatches} Duelos</span>
                    <span>•</span>
                    <span className="text-primary">{entry.wins} V</span>
                    <span>/</span>
                    <span className="text-destructive">{entry.losses} D</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-mono uppercase mb-1">Win Rate</p>
                  <p className="text-2xl font-black font-mono">
                    {(entry.winRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
