// srcs/frontend/src/pages/home.tsx

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";

// Posições e tamanhos das faíscas — geradas uma vez, fora do render,
// para não recalcular nada a cada frame (é só CSS a animar depois).
const SPARKS = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: 40 + Math.random() * 50,
  size: 2 + Math.random() * 3,
  duration: 6 + Math.random() * 6,
  delay: Math.random() * 8,
  color: i % 2 === 0 ? "rgba(0,255,255,0.9)" : "rgba(168,85,247,0.9)",
}));

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden scanlines">
      {/* ✅ Fundo: ringue de boxe neon em CSS puro (sem imagens/JS) */}
      <div className="neon-ring-bg">
        <div className="ring-stage">
          <div className="ring-floor" />

          <div className="ring-ropes">
            <div className="ring-rope h top-1" />
            <div className="ring-rope h top-2" />
            <div className="ring-rope h top-3" />
            <div className="ring-rope h bot-1" />
            <div className="ring-rope h bot-2" />
            <div className="ring-rope h bot-3" />
            <div className="ring-rope v left-1" />
            <div className="ring-rope v left-2" />
            <div className="ring-rope v left-3" />
            <div className="ring-rope v right-1" />
            <div className="ring-rope v right-2" />
            <div className="ring-rope v right-3" />
          </div>

          <div className="ring-post tl" />
          <div className="ring-post tr" />
          <div className="ring-post bl" />
          <div className="ring-post br" />
        </div>

        {SPARKS.map((s) => (
          <span
            key={s.id}
            className="ring-spark"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              background: s.color,
              boxShadow: `0 0 6px ${s.color}`,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

        <div className="ring-vignette" />
      </div>

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