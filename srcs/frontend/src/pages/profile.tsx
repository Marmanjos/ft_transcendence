import { useAuth } from "@/hooks/use-auth"; //acabei de adicionar issso
import { useGetUser, useGetUserStats, useListMatches } from "@workspace/api-client-react";
import { Elemental } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { User as UserIcon, Activity, Crosshair, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { useUpdateUser } from "@/lib/api-client-react/src/generated/api";
import { useToast } from "@/hooks/use-toast";

const ElementalName = {
  [Elemental.TITAN]: "TITAN",
  [Elemental.RAZOR]: "RAZOR",
  [Elemental.WRAITH]: "WRAITH"
};

export default function Profile({ id }: { id: number }) {
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const [username, setUsername] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { user: authUser } = useAuth(); //acabei de adicionar
  const { data: user, isLoading: loadingUser } = useGetUser(id, { query: { queryKey: ["/api/users", id], enabled: !!id } });
  const { data: stats, isLoading: loadingStats } = useGetUserStats(id, { query: { queryKey: ["/api/users", id, "stats"], enabled: !!id } });
  const isOwnProfile = authUser?.id === user?.id;
  // Note: we fetch global matches and filter client side for now, or just show recent since ListMatches doesn't take a userId param in the provided schema.
  // Actually ListMatches says "Get match history for current user", so if this profile is not the current user, we can't see their matches via listMatches.
  // We'll skip matches if it's not the current user, but the schema doesn't provide a way to check. Let's just show the stats.

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          username: username.trim(),
        },
      });

      setIsEditOpen(false);

      toast({
        title: "Perfil atualizado",
        description: "Username alterado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: "Algo correu mal.",
        variant: "destructive",
      });
    }
  };

  if (loadingUser || loadingStats) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-20 font-mono text-muted-foreground uppercase">Perfil não encontrado.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row items-center gap-8 bg-card/50 border border-primary/20 p-8 rounded-xl backdrop-blur relative overflow-hidden">

        <div className="w-32 h-32 rounded-full bg-background border-4 border-primary flex items-center justify-center text-5xl font-black text-primary uppercase neon-box">
          {user.username.charAt(0)}
        </div>
        
        <div className="text-center md:text-left z-10">
          <h1 className="text-4xl font-black uppercase tracking-widest neon-text text-white">
            {user.username}
            {isOwnProfile && (
              <button onClick={() => {setUsername(user.username);
                setIsEditOpen(true)
                }}>
                <Edit className="w-4 h-4" />
              </button>
            )}
          </h1>

          <p className="text-muted-foreground font-mono mt-2 uppercase text-sm">
            Recrutado em: {format(new Date(user.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </p>

        </div>
      </div>

      <h2 className="text-2xl font-bold uppercase tracking-widest border-b border-border pb-2 mt-12">Estatísticas de Combate</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-primary/30 text-center py-6">
          <p className="text-sm font-mono text-muted-foreground uppercase mb-2">Partidas</p>
          <p className="text-4xl font-black text-white">{stats?.totalMatches || 0}</p>
        </Card>
        
        <Card className="bg-card/50 border-primary/30 text-center py-6">
          <p className="text-sm font-mono text-primary uppercase mb-2">Vitórias</p>
          <p className="text-4xl font-black text-primary">{stats?.wins || 0}</p>
        </Card>
        
        <Card className="bg-card/50 border-destructive/30 text-center py-6">
          <p className="text-sm font-mono text-destructive uppercase mb-2">Derrotas</p>
          <p className="text-4xl font-black text-destructive">{stats?.losses || 0}</p>
        </Card>

        <Card className="bg-card/50 border-accent/30 text-center py-6">
          <p className="text-sm font-mono text-accent uppercase mb-2">Empates</p>
          <p className="text-4xl font-black text-accent">{stats?.draws || 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-mono text-muted-foreground uppercase mb-1">Taxa de Sucesso</p>
              <h3 className="text-3xl font-black text-white">
                {stats ? (stats.winRate * 100).toFixed(1) : 0}%
              </h3>
            </div>
            <Activity className="w-12 h-12 text-primary opacity-50" />
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-mono text-muted-foreground uppercase mb-1">Elemental Favorito</p>
              <h3 className="text-3xl font-black text-white uppercase tracking-widest">
                {stats?.favoriteElemental ? ElementalName[stats.favoriteElemental as Elemental] : 'NENHUM'}
              </h3>
            </div>
            <Target className="w-12 h-12 text-secondary opacity-50" />
          </CardContent>
        </Card>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-card p-6 rounded-xl w-[400px] space-y-4">
            
            <h2 className="text-xl font-bold">Editar perfil</h2>

            <input
              className="w-full p-2 rounded bg-background border"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditOpen(false)}>
                Cancelar
              </button>

              <button onClick={handleSave}>
                Guardar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
