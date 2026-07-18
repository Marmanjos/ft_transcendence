import { useAuth } from "@/hooks/use-auth"; //acabei de adicionar issso
import { 
  useGetUser, 
  useGetUserStats, 
  useListMatches, 
  useListFriends, 
  useAddFriend, 
  useAcceptFriend, 
  useRemoveFriend 
} from "@workspace/api-client-react";
import { Elemental } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { User as UserIcon, Activity, Crosshair, Target, UserPlus, UserMinus, Swords } from "lucide-react";
import { useWs } from "@/hooks/use-ws";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { useUpdateUser } from "@/lib/api-client-react/src/generated/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OnlineDot } from "@/components/online-dot";

const ElementalName = {
  [Elemental.TITAN]: "TITAN",
  [Elemental.RAZOR]: "RAZOR",
  [Elemental.WRAITH]: "WRAITH"
};

export default function Profile({ id }: { id: number }) {
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { user: authUser, token } = useAuth(); // ← primeiro
  const { isOnline } = useOnlineStatus([id], token); // ← depois, token já existe

  const { send } = useWs(token);
  const [, setLocation] = useLocation();
  const { data: user, isLoading: loadingUser } = useGetUser(id, { query: { queryKey: ["/api/users", id], enabled: !!id } });
  const { data: stats, isLoading: loadingStats } = useGetUserStats(id, { query: { queryKey: ["/api/users", id, "stats"], enabled: !!id } });
  const isOwnProfile = authUser?.id === user?.id;

  const { data: friendships } = useListFriends({ query: { queryKey: ["/api/friends"], enabled: !isOwnProfile && !!authUser } });
  const addFriendMutation = useAddFriend();
  const acceptFriendMutation = useAcceptFriend();
  const removeFriendMutation = useRemoveFriend();

  const friendship = friendships?.find(f => f.friend.id === id);

  const handleAddFriend = async () => {
    try {
      const response = await addFriendMutation.mutateAsync({ data: { friendId: id } });
      
      if (response && (response as any).success === false) {
        toast({ 
          title: "Erro", 
          description: (response as any).error || "Ocorreu um erro.", 
          variant: "destructive" 
        }); 
        return; 
      }

      toast({ title: "Solicitação enviada", description: "Convite de amizade enviado!" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha na ligação com o servidor.", variant: "destructive" });
    }
  };

  const handleAcceptFriend = async (fid: number) => {
    try {
      const response = await acceptFriendMutation.mutateAsync({ id: fid });
      
      if (response && (response as any).success === false) {
        toast({ 
          title: "Erro", 
          description: (response as any).error || "Ocorreu um erro.", 
          variant: "destructive" 
        }); 
        return; 
      }

      toast({ title: "Amizade aceita", description: "Agora vocês são amigos!" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    } catch (err) {
      toast({ title: "Erro", description: "Falha na ligação com o servidor.", variant: "destructive" });
    }
  };

  const handleRemoveFriend = async (fid: number, isRequest = false) => {
    try {
      const response = await removeFriendMutation.mutateAsync({ id: fid });
      
      if (response && (response as any).success === false) {
        toast({ 
          title: "Erro", 
          description: (response as any).error || "Ocorreu um erro.", 
          variant: "destructive" 
        }); 
        return; 
      }

      toast({ title: isRequest ? "Solicitação removida" : "Amigo removido", description: isRequest ? "A solicitação foi cancelada/rejeitada." : "Usuário removido da lista de amigos." });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    } catch (err) {
      toast({ title: "Erro", description: "Falha na ligação com o servidor.", variant: "destructive" });
    }
  };

  const handleInviteToPlay = () => {
    send({ type: "INVITE_TO_PLAY", targetUserId: id });
    toast({
      title: "Desafio Iniciado",
      description: "Convite de jogo enviado! Redirecionando para a sala...",
    });
    setLocation("/room");
  };
const handleSave = async () => {
  // --- VALIDAÇÃO LOCAL ---
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    toast({
      title: "Erro ao atualizar perfil",
      description: "O username deve ter pelo menos 3 caracteres (espaços não contam).",
      variant: "destructive",
    });
    return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    toast({
      title: "Erro ao atualizar perfil",
      description: "O username pode conter apenas letras, números e sublinhado (_).",
      variant: "destructive",
    });
    return;
  }

  try {
    // 1. Envia o username e captura o retorno da mutação
    const res = await updateUser.mutateAsync({
      id: user.id,
      data: {
        username: trimmed,
      },
    });

    // --- VALIDAÇÃO DE SUCESSO DA API (Status 200 com erro lógico) ---
    // Se o backend respondeu 200 mas mandou success: false, forçamos a ida para o catch
    if (res && res.success === false) {
      throw new Error(res.error || "Este username já está em uso.");
    }

    // --- Upload do avatar (se houver) ---
    if (avatarFile) {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const response = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("elemental_duel_token")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Falha no upload do avatar");
      }
    }

    // Invalidar queries
    queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "stats"] });

    toast({
      title: "Perfil atualizado",
      description: "Perfil atualizado com sucesso.",
    });

    setIsEditOpen(false);
    resetAvatarState();
  } catch (error: any) {
    let description = "Algo correu mal.";

    // Extrai a mensagem de erro da resposta da API (caso use axios ou similar para erros reais)
    if (error.response?.data) {
      const data = error.response.data;
      if (Array.isArray(data)) {
        description = data.map((e: any) => e.message).join(", ");
      } else if (data.error) {
        description = data.error;
      } else if (data.message) {
        description = data.message;
      } else if (typeof data === "string") {
        description = data;
      }
    } 
    // Captura o erro manual lançado pelo 'throw new Error' ali de cima
    else if (error instanceof Error) {
      description = error.message;
    }

    toast({
      title: "Erro ao atualizar perfil",
      description,
      variant: "destructive",
    });
  }
};
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 1000000; 

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Apenas são permitidas imagens JPEG, PNG ou WEBP.",
        variant: "destructive",
      });
      e.target.value = ""; 
      resetAvatarState();
      return; 
    }

    if (file.size > maxSize) {
      toast({
        title: "Ficheiro demasiado grande",
        description: "O tamanho não pode exceder 1MB.",
        variant: "destructive",
      });
      e.target.value = ""; 
      resetAvatarState();
      return; 
    }

    setAvatarFile(file);

    const preview = URL.createObjectURL(file);
    setAvatarPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return preview;
    });
  };

  const resetAvatarState = () => {
    setAvatarFile(null);

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
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
        <div className="relative w-32 h-32">
          <div className="w-32 h-32 rounded-full bg-background border-4 border-primary flex items-center justify-center text-5xl font-black text-primary uppercase neon-box">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              user.username.charAt(0)
            )}
          </div>
          {!isOwnProfile && <OnlineDot online={isOnline(id)} className="w-4 h-4 border-2" />}
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

          {!isOwnProfile && authUser && (
            <div className="mt-4 flex gap-2 justify-center md:justify-start">
              {!friendship && (
                <Button onClick={handleAddFriend} className="h-10 px-6 font-bold uppercase tracking-widest neon-box text-xs">
                  <UserPlus className="w-4 h-4 mr-2" /> Adicionar Amigo
                </Button>
              )}
              {friendship && friendship.status === "PENDING" && (
                <Button onClick={() => handleRemoveFriend(friendship.id, true)} variant="outline" className="h-10 px-6 font-bold uppercase tracking-widest text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  Solicitação Enviada
                </Button>
              )}
              {friendship && friendship.status === "REQUEST_RECEIVED" && (
                <div className="flex gap-2">
                  <Button onClick={() => handleAcceptFriend(friendship.id)} className="h-10 px-6 font-bold uppercase tracking-widest neon-box text-xs">
                    Aceitar Convite
                  </Button>
                  <Button onClick={() => handleRemoveFriend(friendship.id, true)} variant="outline" className="h-10 px-4 font-bold uppercase tracking-widest text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    Recusar
                  </Button>
                </div>
              )}
              {friendship && friendship.status === "ACCEPTED" && (
                <div className="flex gap-2">
                  <Button onClick={handleInviteToPlay} className="h-10 px-6 font-bold uppercase tracking-widest neon-box text-xs">
                    <Swords className="w-4 h-4 mr-2" /> Convidar para Jogar
                  </Button>
                  <Button onClick={() => handleRemoveFriend(friendship.id)} variant="outline" className="h-10 px-6 font-bold uppercase tracking-widest text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <UserMinus className="w-4 h-4 mr-2" /> Remover Amigo
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      <div className="flex items-center justify-center w-full">
        <h2 className="text-2xl font-bold uppercase tracking-widest border-b border-border pb-2 mt-12">Estatísticas de Combate</h2>
      </div>
      
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

              <div className="flex items-center justify-center w-full">
                <h2 className="text-xl font-bold">Editar perfil</h2>
              </div>

              <div className="flex items-center justify-center w-full">
                <div className="w-32 h-32 rounded-full bg-background border-4 border-primary flex items-center justify-center text-5xl font-black text-primary uppercase">
                  <button onClick={() => document.getElementById("avatar-upload")?.click()}>
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-32 h-32 rounded-full object-cover"/>
                    ) : (<Upload className="w-26 h-26" />)}
                  </button>

                  <input type="file" accept="image/*" className="hidden" id="avatar-upload" onChange={onFileChange}/>
                </div>
              </div>

            <input className="w-full p-2 rounded bg-background border" value={username}
              onChange={(e) => setUsername(e.target.value)}/>

            <div className="flex justify-end gap-2">
              <button onClick={() => {
                resetAvatarState(); setIsEditOpen(false); }}>
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