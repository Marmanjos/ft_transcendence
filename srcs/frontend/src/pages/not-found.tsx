import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArenaBackground } from "@/components/arena-background";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative scanlines text-center">
      <ArenaBackground />
      
      <div className="z-10 bg-card/80 backdrop-blur-xl border border-primary/30 p-12 rounded-xl neon-box">
        <h1 className="text-8xl font-black tracking-widest text-primary neon-text mb-4">404</h1>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-6">Setor Não Encontrado</h2>
        <p className="text-muted-foreground font-mono uppercase tracking-wider mb-8 max-w-md">
          A coordenada da arena que você está tentando acessar não existe ou foi destruída.
        </p>
        
        <Link href="/">
          <Button size="lg" className="h-12 px-8 text-lg font-bold tracking-widest uppercase neon-box">
            Retornar à Base
          </Button>
        </Link>
      </div>
    </div>
  );
}
