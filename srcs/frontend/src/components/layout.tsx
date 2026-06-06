import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Home, History, Trophy, User } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isAuthPage = location === "/login" || location === "/register" || location === "/" || location === "/game";

  if (isAuthPage) {
    return <div className="min-h-[100dvh] w-full">{children}</div>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground scanlines">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/lobby" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary">
              <span className="text-primary font-bold neon-text">ED</span>
            </div>
            <span className="font-bold tracking-widest text-lg hidden md:inline-block">
              ELEMENTAL DUEL
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/lobby" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/lobby" ? "text-primary neon-text" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-2"><Home className="w-4 h-4" /> Lobby</span>
            </Link>
            <Link href="/history" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/history" ? "text-primary neon-text" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-2"><History className="w-4 h-4" /> Histórico</span>
            </Link>
            <Link href="/leaderboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/leaderboard" ? "text-primary neon-text" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Placar</span>
            </Link>
            <Link href={`/profile/${user?.id}`} className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/profile") ? "text-primary neon-text" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> Perfil</span>
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline-block">
              {user?.username}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} title="Desconectar">
              <LogOut className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        {children}
      </main>
    </div>
  );
}
