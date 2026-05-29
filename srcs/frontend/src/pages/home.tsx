import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { ArenaBackground } from "@/components/arena-background";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden scanlines">
      <ArenaBackground />
      
      <div className="flex-1 flex flex-col items-center justify-center z-10 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
            ELEMENTAL<br />DUEL
          </h1>
          <p className="text-xl md:text-2xl text-cyan-400 font-mono tracking-widest mb-12 uppercase neon-text">
            Sobreviva à Arena. Domine os Elementos.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {user ? (
              <Button 
                size="lg" 
                className="h-16 px-12 text-lg font-bold tracking-widest uppercase neon-box w-full sm:w-auto"
                onClick={() => setLocation("/lobby")}
              >
                Entrar na Arena
              </Button>
            ) : (
              <>
                <Button 
                  size="lg" 
                  className="h-16 px-12 text-lg font-bold tracking-widest uppercase neon-box w-full sm:w-auto"
                  onClick={() => setLocation("/register")}
                >
                  Registrar
                </Button>
                <Button 
                  variant="outline"
                  size="lg" 
                  className="h-16 px-12 text-lg font-bold tracking-widest uppercase border-primary text-primary hover:bg-primary/20 w-full sm:w-auto"
                  onClick={() => setLocation("/login")}
                >
                  Acessar Painel
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-8 w-full text-center z-10">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          SISTEMA OPERACIONAL VERSÃO 1.0.0
        </p>
      </div>
    </div>
  );
}
