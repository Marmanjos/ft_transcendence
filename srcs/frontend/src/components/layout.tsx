import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Home, History, Trophy, User, Users, UsersRound, Bell } from "lucide-react";
import { useEffect } from "react";
import { useWs } from "@/hooks/use-ws";
import { useToast } from "@/hooks/use-toast";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, token } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { send, onMessage } = useWs(token);

  useEffect(() => {
    if (!token) return;

    const off = onMessage((msg) => {
      if (msg.type === "GAME_INVITE_RECEIVED") {
        toast({
          title: "Desafio Recebido! ⚔️",
          description: `${msg.fromUsername} te convidou para jogar.`,
          action: (
            <Button
              size="sm"
              onClick={() => {
                send({ type: "JOIN_ROOM", code: msg.roomCode });
                setLocation("/room");
              }}
              className="bg-primary hover:bg-primary/80 font-bold uppercase tracking-wider text-xs h-8 px-3 text-white"
            >
              Aceitar
            </Button>
          ),
        });
      } else if (msg.type === "FRIEND_UPDATE") {
        if (msg.reason === "REQUEST_RECEIVED") {
          toast({
            title: "Solicitação de Amizade! 🤝",
            description: `${msg.fromUsername || "Alguém"} enviou-te um pedido de amizade.`,
            action: (
              <Button
                size="sm"
                onClick={() => setLocation("/friends")}
                className="bg-primary hover:bg-primary/80 font-bold uppercase tracking-wider text-xs h-8 px-3 text-white"
              >
                Ver Pedidos
              </Button>
            ),
          });
        } else if (msg.reason === "REQUEST_ACCEPTED") {
          toast({
            title: "Pedido Aceito! 🎉",
            description: `Agora você e ${msg.fromUsername || "um jogador"} são amigos.`,
          });
        }
      }
    });

    return () => {
      off();
    };
  }, [token, onMessage, send, setLocation, toast]);

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
            <Link href="/groups" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/groups" ? "text-primary neon-text" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-2"><UsersRound className="w-4 h-4" /> Grupos</span>
            </Link>
            <Link href={`/profile/${user?.id}`} className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/profile") ? "text-primary neon-text" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> Perfil</span>
            </Link>
            <Link href="/friends" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/friends" ? "text-primary neon-text" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Amigos</span>
            </Link>
            <span className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notificações</span>
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
