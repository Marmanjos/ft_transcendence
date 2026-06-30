import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Shield, UsersRound, Check, X, Compass, MailOpen, Lock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWs } from "@/hooks/use-ws";

interface OrganizationSummary {
  id: number;
  name: string;
  description: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
  isPrivate: boolean;
  inviteOnly: boolean;
}

interface OrganizationInvite {
  id: number;
  role: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: string;
  organization: {
    id: number;
    name: string;
    description: string | null;
  };
}

interface PublicOrganization {
  id: number;
  name: string;
  description: string | null;
  memberCount: number;
  isPrivate: boolean;
  inviteOnly: boolean;
}

function apiUrl(path: string) {
  const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  return `${base}/api${path}`;
}

export default function Groups() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { onMessage } = useWs(token);
  const [groups, setGroups] = useState<OrganizationSummary[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [publicGroups, setPublicGroups] = useState<PublicOrganization[]>([]);
  
  const [search, setSearch] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [loadingPublic, setLoadingPublic] = useState(true);

  const loadGroups = async (searchText = search) => {
    if (!token) return;
    setLoadingGroups(true);
    try {
      const query = searchText.trim() ? `?search=${encodeURIComponent(searchText.trim())}` : "";
      const response = await fetch(apiUrl(`/organizations${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar grupos");
      setGroups(await response.json());
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os seus grupos.",
        variant: "destructive",
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadInvites = async () => {
    if (!token) return;
    setLoadingInvites(true);
    try {
      const response = await fetch(apiUrl("/organizations/invites"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar convites");
      setInvites(await response.json());
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os convites.",
        variant: "destructive",
      });
    } finally {
      setLoadingInvites(false);
    }
  };

  const loadPublicGroups = async (searchText = search) => {
    if (!token) return;
    setLoadingPublic(true);
    try {
      const query = searchText.trim() ? `?search=${encodeURIComponent(searchText.trim())}` : "";
      const response = await fetch(apiUrl(`/organizations/public${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar grupos públicos");
      setPublicGroups(await response.json());
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os grupos públicos.",
        variant: "destructive",
      });
    } finally {
      setLoadingPublic(false);
    }
  };

  const handleSearchAll = (searchText = search) => {
    void loadGroups(searchText);
    void loadPublicGroups(searchText);
  };

  useEffect(() => {
    void loadGroups("");
    void loadInvites();
    void loadPublicGroups("");
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const off = onMessage((msg) => {
      if (msg.type === "ORG_INVITE_RECEIVED") {
        void loadInvites();
        toast({
          title: "Novo Convite",
          description: "Você recebeu um convite para entrar em um grupo.",
        });
      }
    });
    return off;
  }, [token, onMessage]);

  const handleCreateGroup = async () => {
    if (!token) return;
    const name = window.prompt("Nome do grupo (apenas letras, números, espaços, hífen ou sublinhado)");
    if (!name?.trim()) return;
    
    const description = window.prompt("Descrição do grupo (opcional, máximo 200 caracteres)") ?? "";
    if (description.length > 200) {
      toast({
        title: "Erro",
        description: "Descrição excede o limite de 200 caracteres.",
        variant: "destructive",
      });
      return;
    }

    const isPrivate = window.confirm("Deseja que este grupo seja PRIVADO? (Grupos privados não aparecem na busca pública)");
    
    let inviteOnly = false;
    if (!isPrivate) {
      inviteOnly = window.confirm("Deseja que este grupo seja APENAS POR CONVITE? (Se disser sim, o grupo aparecerá na busca pública, mas as pessoas não poderão entrar diretamente, dependendo de convites)");
    } else {
      inviteOnly = true; // Private groups are always invite-only implicitly
    }

    try {
      const response = await fetch(apiUrl("/organizations"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPrivate,
          inviteOnly
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao criar grupo");
      }
      
      toast({ title: "Grupo criado", description: data.name });
      setSearch("");
      handleSearchAll("");
      void loadInvites();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o grupo.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptInvite = async (orgId: number) => {
    if (!token) return;
    try {
      const response = await fetch(apiUrl(`/organizations/${orgId}/accept`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao aceitar convite");
      }
      toast({ title: "Convite aceito", description: "Agora você é membro do grupo." });
      handleSearchAll();
      void loadInvites();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aceitar o convite.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineInvite = async (orgId: number) => {
    if (!token) return;
    try {
      const response = await fetch(apiUrl(`/organizations/${orgId}/decline`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao recusar convite");
      }
      toast({ title: "Convite recusado", description: "O convite foi removido." });
      handleSearchAll();
      void loadInvites();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível recusar o convite.",
        variant: "destructive",
      });
    }
  };

  const handleJoinGroup = async (orgId: number) => {
    if (!token) return;
    try {
      const response = await fetch(apiUrl(`/organizations/${orgId}/join`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao entrar no grupo");
      }
      toast({ title: "Sucesso", description: "Você entrou no grupo!" });
      handleSearchAll();
      void loadInvites();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível entrar no grupo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-widest text-primary neon-text">
            Grupos
          </h1>
          <p className="text-muted-foreground font-mono mt-1">
            Organize combatentes, dispute batalhas e gerencie times.
          </p>
        </div>

        <Button onClick={handleCreateGroup} className="h-11 px-5 font-bold uppercase tracking-widest">
          <Plus className="w-4 h-4 mr-2" />
          Criar Grupo
        </Button>
      </div>

      {/* Single Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar em todos os grupos (meus e públicos)..."
          className="h-11 border-primary/20 bg-muted/30 font-mono text-white placeholder-muted-foreground"
          onKeyDown={(e) => e.key === "Enter" && handleSearchAll(search)}
        />
        <Button
          variant="outline"
          onClick={() => handleSearchAll(search)}
          className="h-11 px-6 font-mono uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10"
        >
          <Search className="w-4 h-4 mr-2" />
          Buscar
        </Button>
      </div>

      {/* Convites Pendentes */}
      {invites.length > 0 && (
        <section className="space-y-4 rounded-lg border border-secondary/30 bg-secondary/10 p-6">
          <div className="flex items-center gap-2 border-b border-secondary/20 pb-2">
            <MailOpen className="w-5 h-5 text-secondary neon-text-secondary" />
            <h2 className="text-xl font-bold uppercase tracking-widest text-secondary neon-text-secondary">
              Convites Pendentes ({invites.length})
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-4 justify-between rounded-lg border border-secondary/20 bg-background/50 p-4"
              >
                <div>
                  <p className="font-bold uppercase tracking-wider text-white text-base">
                    {invite.organization.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-1 line-clamp-2">
                    {invite.organization.description || "Sem descrição"}
                  </p>
                  <span className="inline-block mt-2 rounded bg-secondary/20 border border-secondary/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-secondary">
                    Cargo: {invite.role}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => void handleAcceptInvite(invite.organization.id)}
                    size="sm"
                    className="flex-1 bg-secondary hover:bg-secondary/85 text-black font-bold uppercase tracking-widest text-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Aceitar
                  </Button>
                  <Button
                    onClick={() => void handleDeclineInvite(invite.organization.id)}
                    size="sm"
                    variant="outline"
                    className="flex-1 border-secondary/30 hover:bg-secondary/10 text-secondary font-bold uppercase tracking-widest text-xs"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Recusar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Meus Grupos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <UsersRound className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold uppercase tracking-widest">
            Meus Grupos ({groups.length})
          </h2>
        </div>

        {loadingGroups ? (
          <p className="text-center text-muted-foreground font-mono py-8">
            Carregando seus grupos...
          </p>
        ) : groups.length === 0 ? (
          <p className="text-center text-muted-foreground font-mono py-8 border border-dashed border-border rounded-lg bg-muted/10">
            Nenhum grupo encontrado nos seus grupos.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} className="block">
                <button className="w-full h-full rounded-lg border border-border bg-muted/30 p-4 text-left transition-all hover:border-primary/60 hover:bg-muted/50 hover:scale-[1.01]">
                  <div className="flex flex-col h-full justify-between gap-3">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold uppercase tracking-wider text-white text-lg">
                          {group.name}
                        </p>
                        
                        {/* Access tags */}
                        {group.isPrivate ? (
                          <span className="inline-flex items-center gap-1 rounded bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[9px] font-mono uppercase text-destructive">
                            <Lock className="w-2.5 h-2.5" />
                            Privado
                          </span>
                        ) : group.inviteOnly ? (
                          <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[9px] font-mono uppercase text-accent">
                            Apenas Convite
                          </span>
                        ) : (
                          <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-mono uppercase text-primary">
                            Aberto
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {group.description || "Sem descrição."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        {group.memberCount} / 50 membros
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-mono uppercase tracking-widest text-primary">
                        <Shield className="w-3 h-3" />
                        {group.role}
                      </span>
                    </div>
                  </div>
                </button>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Explorar Grupos Públicos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Compass className="w-5 h-5 text-secondary" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-secondary">
            Explorar Grupos Públicos ({publicGroups.length})
          </h2>
        </div>

        {loadingPublic ? (
          <p className="text-center text-muted-foreground font-mono py-8">
            Buscando grupos públicos...
          </p>
        ) : publicGroups.length === 0 ? (
          <p className="text-center text-muted-foreground font-mono py-8 border border-dashed border-border rounded-lg bg-muted/10">
            Nenhum outro grupo público disponível para entrar.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {publicGroups.map((group) => (
              <div
                key={group.id}
                className="flex flex-col justify-between rounded-lg border border-border bg-muted/10 p-4"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold uppercase tracking-wider text-white text-lg">
                      {group.name}
                    </p>
                    {group.inviteOnly ? (
                      <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[9px] font-mono uppercase text-accent">
                        Apenas Convite
                      </span>
                    ) : (
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-mono uppercase text-primary">
                        Aberto
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {group.description || "Sem descrição."}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-2">
                    {group.memberCount} / 50 membros
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  {group.inviteOnly ? (
                    <Button
                      disabled
                      className="w-full border border-accent/20 bg-accent/5 text-accent/60 font-bold uppercase tracking-widest text-xs cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1" />
                      Apenas Convite
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void handleJoinGroup(group.id)}
                      className="w-full bg-secondary hover:bg-secondary/85 text-black font-bold uppercase tracking-widest text-xs"
                    >
                      Participar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
