import { Link } from "wouter";
import { Plus, Search, Shield, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const USER_GROUPS = [
  { id: 1, name: "Arena Core", role: "Admin", members: 8 },
  { id: 2, name: "Night Duelists", role: "Member", members: 14 },
  { id: 3, name: "Training Squad", role: "Editor", members: 5 },
];

export default function Groups() {
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

        <Button className="h-11 px-5 font-bold uppercase tracking-widest">
          <Plus className="w-4 h-4" />
          Criar Grupo
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Pesquisar grupos..."
          className="h-11 border-primary/20 bg-muted/30 font-mono"
        />
        <Button variant="outline" className="h-11 px-5 font-mono uppercase tracking-widest">
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

        <div className="grid gap-3">
          {USER_GROUPS.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <button className="w-full rounded-lg border border-border bg-muted/30 p-4 text-left transition-colors hover:border-primary/60 hover:bg-muted/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-white">
                      {group.name}
                    </p>
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      {group.members} membros
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
      </section>
    </div>
  );
}
