import { UsersRound } from "lucide-react";

export default function Groups() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4">
      <div className="w-16 h-16 rounded-lg border border-primary/40 bg-primary/10 flex items-center justify-center text-primary">
        <UsersRound className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-black uppercase tracking-widest text-primary neon-text">
        Grupos
      </h1>
      <p className="font-mono uppercase tracking-widest text-muted-foreground">
        Coming soon
      </p>
    </div>
  );
}
