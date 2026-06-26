import { Link } from "wouter";
import { ArrowLeft, Shield, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GroupDetailProps {
  id: number;
}

export default function GroupDetail({ id }: GroupDetailProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/groups">
        <Button variant="ghost" className="font-mono uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </Link>

      <div className="rounded-lg border border-primary/20 bg-muted/30 p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center text-primary">
            <UsersRound className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-primary neon-text">
              Grupo #{id}
            </h1>
            <p className="text-muted-foreground font-mono">
              Visualizacao do grupo
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background/40 p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Funcao
            </p>
            <p className="mt-1 flex items-center gap-2 font-bold text-primary">
              <Shield className="w-4 h-4" />
              Membro
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/40 p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Membros
            </p>
            <p className="mt-1 font-bold text-white">Coming soon</p>
          </div>
          <div className="rounded-md border border-border bg-background/40 p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Permissoes
            </p>
            <p className="mt-1 font-bold text-white">Create, Read, Update</p>
          </div>
        </div>
      </div>
    </div>
  );
}
