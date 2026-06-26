import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Shield, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface OrganizationSummary {
  id: number;
  name: string;
  description: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  memberCount: number;
}

function apiUrl(path: string) {
  const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  return `${base}/api${path}`;
}

export default function Groups() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<OrganizationSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadGroups = async (searchText = search) => {
    if (!token) return;
    setLoading(true);
    try {
      const query = searchText.trim() ? `?search=${encodeURIComponent(searchText.trim())}` : "";
      const response = await fetch(apiUrl(`/organizations${query}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar grupos");
      setGroups(await response.json());
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os grupos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups("");
  }, [token]);

  const handleCreateGroup = async () => {
    if (!token) return;
    const name = window.prompt("Nome do grupo");
    if (!name?.trim()) return;
    const description = window.prompt("Descrição do grupo (opcional)") ?? "";

    try {
      const response = await fetch(apiUrl("/organizations"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      if (!response.ok) throw new Error("Falha ao criar grupo");
      const created = await response.json() as OrganizationSummary;
      setGroups((current) => [created, ...current]);
      toast({ title: "Grupo criado", description: created.name });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível criar o grupo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-widest text-primary neon-text">
            Grupos
          </h1>
          <p className="text-muted-foreground font-mono mt-1">
            Organize combatentes, permissões e ações por grupo.
          </p>
        </div>

        <Button onClick={handleCreateGroup} className="h-11 px-5 font-bold uppercase tracking-widest">
          <Plus className="w-4 h-4" />
          Criar Grupo
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar grupos..."
          className="h-11 border-primary/20 bg-muted/30 font-mono"
        />
        <Button
          variant="outline"
          onClick={() => void loadGroups(search)}
          className="h-11 px-5 font-mono uppercase tracking-widest"
        >
          <Search className="w-4 h-4" />
          Pesquisar
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <UsersRound className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold uppercase tracking-widest">
            Meus Grupos
          </h2>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground font-mono py-8">
            Carregando grupos...
          </p>
        ) : groups.length === 0 ? (
          <p className="text-center text-muted-foreground font-mono py-8 border border-dashed border-border rounded-lg">
            Nenhum grupo encontrado.
          </p>
        ) : (
          <div className="grid gap-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <button className="w-full rounded-lg border border-border bg-muted/30 p-4 text-left transition-colors hover:border-primary/60 hover:bg-muted/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-white">
                      {group.name}
                    </p>
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      {group.memberCount} membros
                    </p>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-widest text-primary">
                    <Shield className="w-3 h-3" />
                    {group.role}
                  </span>
                </div>
              </button>
            </Link>
          ))}
          </div>
        )}
      </section>
    </div>
  );
}
