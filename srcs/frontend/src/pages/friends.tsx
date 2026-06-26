import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { UserPlus, UserMinus, UserCheck, Search, Users, Check, X, Clock, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { 
  useListFriends, 
  useAddFriend, 
  useAcceptFriend, 
  useRemoveFriend 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useWs, type ServerMsg } from "@/hooks/use-ws";
import { useEffect } from "react";

export default function Friends() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { onMessage } = useWs(token);

  const [activeTab, setActiveTab] = useState<"active" | "received" | "sent">("active");
  const [usernameInput, setUsernameInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const off = onMessage((msg: ServerMsg) => {
      if (msg.type === "FRIEND_UPDATE") {
        queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      }
    });
    return off;
  }, [onMessage, queryClient]);

  // Queries & Mutations
  const { data: friendships, isLoading } = useListFriends({
    query: { queryKey: ["/api/friends"] }
  });
  const addFriendMutation = useAddFriend();
  const acceptFriendMutation = useAcceptFriend();
  const removeFriendMutation = useRemoveFriend();

  const activeFriends = friendships?.filter(f => f.status === "ACCEPTED") || [];
  const receivedRequests = friendships?.filter(f => f.status === "REQUEST_RECEIVED") || [];
  const sentRequests = friendships?.filter(f => f.status === "PENDING") || [];

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = usernameInput.trim();
    if (!target) return;

    setBusy(true);
    try {
      await addFriendMutation.mutateAsync({
        data: { username: target }
      });
      toast({
        title: "Solicitação enviada",
        description: `Convite enviado para ${target} com sucesso!`,
      });
      setUsernameInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    } catch (err: any) {
      toast({
        title: "Erro ao adicionar amigo",
        description: err.response?.data?.error || "Usuário não encontrado ou já adicionado.",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptRequest = async (id: number, username: string) => {
    try {
      await acceptFriendMutation.mutateAsync({ id });
      toast({
        title: "Solicitação aceita",
        description: `Agora você e ${username} são amigos!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    } catch (err) {
      toast({
        title: "Erro ao aceitar solicitação",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFriend = async (id: number, username: string, isRequest = false) => {
    const messageTitle = isRequest ? "Solicitação cancelada/recusada" : "Amigo removido";
    const messageDesc = isRequest 
      ? `A solicitação com ${username} foi removida.`
      : `Você removeu ${username} da sua lista de amigos.`;

    try {
      await removeFriendMutation.mutateAsync({ id });
      toast({
        title: messageTitle,
        description: messageDesc,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    } catch (err) {
      toast({
        title: "Erro ao realizar ação",
        description: "Algo deu errado. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="font-mono text-primary uppercase tracking-[0.35em] text-xs mb-2">Rede de Combatentes</p>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest neon-text">Gerenciar Amigos</h1>
        <p className="text-muted-foreground font-mono mt-2 max-w-2xl">
          Conecte-se com outros jogadores da arena para acompanhar seus status de combate ou duelarem diretamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form & Navigation Tabs */}
        <div className="lg:col-span-1 space-y-6">
          {/* Add Friend Form */}
          <Card className="bg-card/50 border-primary/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-primary text-md">
                <UserPlus className="w-5 h-5" /> Adicionar Amigo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddFriend} className="space-y-4">
                <p className="text-xs text-muted-foreground font-mono">
                  Insira o nome exato do usuário para enviar o convite de amizade.
                </p>
                <div className="relative">
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Nome do Jogador"
                    className="w-full h-11 rounded-md border border-border bg-background pl-4 pr-10 font-mono text-sm outline-none focus:border-primary uppercase"
                  />
                  <Search className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                </div>
                <Button 
                  type="submit" 
                  disabled={busy || !usernameInput.trim()} 
                  className="w-full h-11 font-bold uppercase tracking-widest neon-box"
                >
                  {busy ? "Enviando..." : "Enviar Convite"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Navigation Tabs */}
          <Card className="bg-card/50 border-border/40 backdrop-blur">
            <CardContent className="p-4 flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("active")}
                className={`flex items-center justify-between px-4 py-3 rounded-lg font-bold uppercase text-xs tracking-widest transition-all ${
                  activeTab === "active"
                    ? "bg-primary/20 border border-primary text-primary neon-text"
                    : "hover:bg-white/5 text-muted-foreground border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Amigos Ativos
                </span>
                <span className="bg-background/80 border px-2 py-0.5 rounded text-[10px] font-mono text-foreground">
                  {activeFriends.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("received")}
                className={`flex items-center justify-between px-4 py-3 rounded-lg font-bold uppercase text-xs tracking-widest transition-all ${
                  activeTab === "received"
                    ? "bg-secondary/20 border border-secondary text-secondary neon-text-secondary"
                    : "hover:bg-white/5 text-muted-foreground border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4" /> Recebidas
                </span>
                <span className="bg-background/80 border px-2 py-0.5 rounded text-[10px] font-mono text-foreground">
                  {receivedRequests.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("sent")}
                className={`flex items-center justify-between px-4 py-3 rounded-lg font-bold uppercase text-xs tracking-widest transition-all ${
                  activeTab === "sent"
                    ? "bg-accent/20 border border-accent text-accent"
                    : "hover:bg-white/5 text-muted-foreground border border-transparent"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> Enviadas
                </span>
                <span className="bg-background/80 border px-2 py-0.5 rounded text-[10px] font-mono text-foreground">
                  {sentRequests.length}
                </span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Friends/Requests List */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 border-border backdrop-blur min-h-[400px] flex flex-col">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="uppercase tracking-widest text-sm font-mono text-white/80">
                {activeTab === "active" && "Amigos Ativos"}
                {activeTab === "received" && "Solicitações Recebidas"}
                {activeTab === "sent" && "Solicitações Enviadas"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              {isLoading ? (
                <div className="h-full flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* ACTIVE FRIENDS TAB */}
                  {activeTab === "active" && (
                    <div className="space-y-4">
                      {activeFriends.length === 0 ? (
                        <div className="text-center py-20 font-mono text-muted-foreground uppercase border border-dashed border-border/40 rounded-xl">
                          Sua lista de amigos está vazia.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeFriends.map((f) => (
                            <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-black/20 hover:border-primary/40 transition-all">
                              <Link href={`/profile/${f.friend.id}`} className="flex items-center gap-3 cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-background border border-primary/45 flex items-center justify-center font-bold text-primary group-hover:neon-box transition-all overflow-hidden">
                                  {f.friend.avatarUrl ? (
                                    <img src={f.friend.avatarUrl} className="w-full h-full object-cover" />
                                  ) : (
                                    f.friend.username.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold text-white group-hover:text-primary transition-colors">{f.friend.username}</h3>
                                  <p className="text-[10px] text-muted-foreground font-mono">Ver Perfil</p>
                                </div>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemoveFriend(f.id, f.friend.username)} 
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Remover Amigo"
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* RECEIVED REQUESTS TAB */}
                  {activeTab === "received" && (
                    <div className="space-y-4">
                      {receivedRequests.length === 0 ? (
                        <div className="text-center py-20 font-mono text-muted-foreground uppercase border border-dashed border-border/40 rounded-xl">
                          Nenhuma solicitação de amizade pendente.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {receivedRequests.map((f) => (
                            <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-black/20">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-background border border-secondary/45 flex items-center justify-center font-bold text-secondary overflow-hidden">
                                  {f.friend.avatarUrl ? (
                                    <img src={f.friend.avatarUrl} className="w-full h-full object-cover" />
                                  ) : (
                                    f.friend.username.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold text-white">{f.friend.username}</h3>
                                  <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Quer ser seu amigo
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAcceptRequest(f.id, f.friend.username)} 
                                  className="h-9 px-3 bg-secondary/20 hover:bg-secondary border border-secondary text-secondary hover:text-black font-bold uppercase tracking-widest text-[10px]"
                                >
                                  <Check className="w-3.5 h-3.5 mr-1" /> Aceitar
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleRemoveFriend(f.id, f.friend.username, true)} 
                                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SENT REQUESTS TAB */}
                  {activeTab === "sent" && (
                    <div className="space-y-4">
                      {sentRequests.length === 0 ? (
                        <div className="text-center py-20 font-mono text-muted-foreground uppercase border border-dashed border-border/40 rounded-xl">
                          Nenhum convite enviado pendente.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sentRequests.map((f) => (
                            <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-black/20">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center font-bold text-white/60 overflow-hidden">
                                  {f.friend.avatarUrl ? (
                                    <img src={f.friend.avatarUrl} className="w-full h-full object-cover" />
                                  ) : (
                                    f.friend.username.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-bold text-white">{f.friend.username}</h3>
                                  <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Aguardando aprovação
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleRemoveFriend(f.id, f.friend.username, true)}
                                className="h-9 px-4 font-mono uppercase tracking-widest text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                Cancelar
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
