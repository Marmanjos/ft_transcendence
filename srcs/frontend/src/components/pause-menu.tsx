import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onAbandon: () => void;
}

export function PauseMenu({ onResume, onRestart, onAbandon }: PauseMenuProps) {
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        transition={{ type: "spring", bounce: 0.3 }}
        className="flex flex-col items-center gap-4 p-10 border border-primary/30 rounded-2xl bg-card/95 w-[360px] relative"
        style={{ boxShadow: "0 0 60px rgba(0,255,255,0.15)" }}
      >
        <AnimatePresence mode="wait">
          {!confirmingAbandon ? (
            <motion.div
              key="main-menu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full flex flex-col items-center gap-4"
            >
              <div className="text-[10px] font-mono text-primary uppercase tracking-[0.4em] mb-2 opacity-60">
                Sistema Pausado
              </div>
              <h2
                className="text-4xl font-black uppercase tracking-widest text-white mb-6"
                style={{ textShadow: "0 0 20px rgba(0,255,255,0.5)" }}
              >
                PAUSA
              </h2>

              <Button
                size="lg"
                onClick={onResume}
                className="w-full h-12 text-sm font-bold uppercase tracking-widest neon-box text-black bg-primary hover:bg-primary/90"
              >
                Continuar
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={onRestart}
                className="w-full h-12 text-sm font-bold uppercase tracking-widest border-muted-foreground/30 hover:border-primary text-white bg-transparent"
              >
                Reiniciar Duelo
              </Button>

              <Button
                size="lg"
                variant="ghost"
                onClick={() => setConfirmingAbandon(true)}
                className="w-full h-12 text-sm font-bold uppercase tracking-widest text-destructive/80 hover:text-destructive hover:bg-destructive/10"
              >
                Abandonar Partida
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="confirm-abandon"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="text-[10px] font-mono text-destructive uppercase tracking-[0.4em] mb-2">
                Aviso do Sistema
              </div>
              <h2 className="text-2xl font-black uppercase tracking-wide text-destructive mb-4">
                ABANDONAR?
              </h2>
              <p className="font-mono text-xs text-white/60 mb-8 leading-relaxed uppercase">
                Tens certeza que desejas abandonar o combate? Isso registrará uma derrota imediata.
              </p>

              <div className="flex flex-col gap-3 w-full">
                <Button
                  size="lg"
                  onClick={onAbandon}
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest bg-destructive hover:bg-destructive/85 text-white"
                  style={{ boxShadow: "0 0 20px rgba(255,0,0,0.3)" }}
                >
                  Confirmar Abandono
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setConfirmingAbandon(false)}
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest border-muted-foreground/30 hover:border-primary text-white bg-transparent"
                >
                  Voltar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
