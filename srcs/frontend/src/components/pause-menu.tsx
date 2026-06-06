import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function PauseMenu({ onResume, onRestart, onMainMenu }: PauseMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 40 }}
        transition={{ type: "spring", bounce: 0.3 }}
        className="flex flex-col items-center gap-4 p-10 border border-primary/30 rounded-2xl bg-card/80"
        style={{ minWidth: 340, boxShadow: "0 0 60px rgba(0,255,255,0.1)" }}
      >
        <div className="text-xs font-mono text-primary uppercase tracking-[0.4em] mb-2 opacity-60">Sistema Pausado</div>
        <h2 className="text-4xl font-black uppercase tracking-widest text-white mb-6"
          style={{ textShadow: "0 0 20px rgba(0,255,255,0.5)" }}>
          PAUSA
        </h2>

        <Button
          size="lg"
          onClick={onResume}
          className="w-full h-14 text-lg font-bold uppercase tracking-widest neon-box"
        >
          Continuar
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={onRestart}
          className="w-full h-14 text-lg font-bold uppercase tracking-widest border-muted-foreground/40 hover:border-primary"
        >
          Reiniciar Partida
        </Button>

        <Button
          size="lg"
          variant="ghost"
          onClick={onMainMenu}
          className="w-full h-14 text-lg font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive"
        >
          Menu Principal
        </Button>
      </motion.div>
    </motion.div>
  );
}
