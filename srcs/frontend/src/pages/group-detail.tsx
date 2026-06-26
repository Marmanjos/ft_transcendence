import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, MessageSquare, Plus, Shield, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface GroupDetailProps {
  id: number;
}

interface OrganizationMember {
  id: number;
  userId: number;
  username: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "PENDING" | "ACCEPTED";
}

interface OrganizationMessage {
  id: number;
  senderId: number;
  senderUsername: string;
  text: string;
  createdAt: string;
}

interface OrganizationDetail {
  id: number;
  name: string;
  description: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
  isPrivate: boolean;
  permissions: {
    update: boolean;
    delete: boolean;
    manageMembers: boolean;
  };
  members: OrganizationMember[];
  messages: OrganizationMessage[];
}

function apiUrl(path: string) {
  const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  return `${base}/api${path}`;
}

export default function GroupDetail({ id }: GroupDetailProps) {
  const [, setLocation] = useLocation();
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [group, setGroup] = useState<OrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadGroup = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/organizations/${id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar grupo");
      setGroup(await response.json());
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar o grupo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroup();
  }, [id, token]);

  const handleUpdateGroup = async () => {
    if (!token || !group) return;
    const name = window.prompt("Novo nome do grupo", group.name);
    if (!name?.trim()) return;
    const description = window.prompt("Nova descrição", group.description ?? "") ?? "";
    const isPrivate = window.confirm(`Deseja tornar este grupo PRIVADO? (Grupos privados não aparecem nas buscas públicas)\n\nAtualmente: ${group.isPrivate ? "PRIVADO" : "PÚBLICO"}`);

    try {
      const response = await fetch(apiUrl(`/organizations/${id}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPrivate
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao atualizar grupo");
      }
      await loadGroup();
      toast({ title: "Grupo atualizado" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o grupo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!token || !group || !window.confirm(`Apagar o grupo "${group.name}"?`)) return;

    try {
      const response = await fetch(apiUrl(`/organizations/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao apagar grupo");
      setLocation("/groups");
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível apagar o grupo.",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async () => {
    if (!token) return;
    const username = window.prompt("Username do novo membro");
    if (!username?.trim()) return;

    try {
      const response = await fetch(apiUrl(`/organizations/${id}/members`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), role: "MEMBER" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao adicionar membro");
      }
      await loadGroup();
      toast({ title: "Convite enviado", description: `Convite enviado para ${username.trim()}` });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível convidar o membro.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    const isSelf = member.userId === user?.id;
    const confirmMessage = isSelf
      ? "Tem certeza de que deseja sair deste grupo?"
      : `Remover ${member.username} do grupo?`;

    if (!token || !window.confirm(confirmMessage)) return;

    try {
      const response = await fetch(apiUrl(`/organizations/${id}/members/${member.userId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao remover membro");
      
      if (isSelf) {
        setLocation("/groups");
        toast({ title: "Sucesso", description: "Você saiu do grupo." });
      } else {
        await loadGroup();
        toast({ title: "Membro removido", description: member.username });
      }
    } catch {
      toast({
        title: "Erro",
        description: isSelf ? "Não foi possível sair do grupo." : "Não foi possível remover o membro.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!token || !message.trim()) return;

    try {
      const response = await fetch(apiUrl(`/organizations/${id}/messages`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message.trim() }),
      });
      if (!response.ok) throw new Error("Falha ao enviar mensagem");
      setMessage("");
      await loadGroup();
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-mono text-muted-foreground">
        Carregando grupo...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/groups">
          <Button variant="ghost" className="font-mono uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <p className="text-center text-muted-foreground font-mono py-8">
          Grupo não encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Link href="/groups">
        <Button variant="ghost" className="font-mono uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </Link>

      <div className="rounded-lg border border-primary/20 bg-muted/30 p-6 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center text-primary">
              <UsersRound className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black uppercase tracking-widest text-primary neon-text">
                  {group.name}
                </h1>
                {group.isPrivate && (
                  <span className="rounded bg-destructive/10 border border-destructive/20 px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider text-destructive">
                    Privado
                  </span>
                )}
              </div>
              <p className="text-muted-foreground font-mono">
                {group.description || "Sem descrição"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {group.permissions.update && (
              <Button variant="outline" onClick={handleUpdateGroup}>
                Atualizar
              </Button>
            )}
            {group.permissions.delete && (
              <Button variant="destructive" onClick={handleDeleteGroup}>
                <Trash2 className="w-4 h-4 mr-2" />
                Apagar
              </Button>
            )}
            {!group.permissions.delete && (
              <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => {
                const selfMember = group.members.find(m => m.userId === user?.id);
                if (selfMember) void handleRemoveMember(selfMember);
              }}>
                Sair do Grupo
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background/40 p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Função
            </p>
            <p className="mt-1 flex items-center gap-2 font-bold text-primary">
              <Shield className="w-4 h-4" />
              {group.role}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/40 p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Membros
            </p>
            <p className="mt-1 font-bold text-white">{group.memberCount} / 50</p>
          </div>
          <div className="rounded-md border border-border bg-background/40 p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Visibilidade
            </p>
            <p className="mt-1 font-bold text-white">
              {group.isPrivate ? "Privado" : "Público"}
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold uppercase tracking-widest">Membros</h2>
          {group.permissions.manageMembers && (
            <Button onClick={handleAddMember} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Convidar
            </Button>
          )}
        </div>

        <div className="grid gap-2">
          {group.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white">{member.username}</p>
                  {member.status === "PENDING" && (
                    <span className="rounded bg-warning/10 border border-warning/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-warning animate-pulse">
                      Pendente
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {member.role}
                </p>
              </div>
              {group.permissions.manageMembers && member.role !== "OWNER" && member.userId !== user?.id && (
                <Button variant="ghost" size="icon" onClick={() => void handleRemoveMember(member)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold uppercase tracking-widest">Mensagens</h2>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {group.messages.length === 0 ? (
            <p className="text-center text-muted-foreground font-mono py-6">
              Nenhuma mensagem ainda.
            </p>
          ) : (
            group.messages.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-background/40 p-3">
                <p className="text-xs font-mono uppercase tracking-widest text-primary">
                  {item.senderUsername}
                </p>
                <p className="text-white mt-1">{item.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escrever mensagem..."
            className="h-11 border-primary/20 bg-background/40"
            onKeyDown={(e) => e.key === "Enter" && void handleSendMessage()}
          />
          <Button onClick={handleSendMessage} className="h-11 px-6 font-bold uppercase tracking-wider">
            Enviar
          </Button>
        </div>
      </section>
    </div>
  );
}
