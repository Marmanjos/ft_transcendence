import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Home, History, Trophy, User, Users, UsersRound, Bell } from "lucide-react";
import { useEffect } from "react";
import { useWs } from "@/hooks/use-ws";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNotifications, type AppNotification } from "@/hooks/use-notifications";

const NOTIF_LABEL: Record<string, string> = {
  FRIEND_REQUEST:  "te enviou uma solicitação de amizade",
  FRIEND_ACCEPTED: "aceitou sua solicitação de amizade",
  FRIEND_REMOVED:  "te removeu dos amigos",
  GAME_INVITE:     "te convidou para um jogo",
};

function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [, setLocation] = useLocation();

  const handleClick = (notif: AppNotification) => {
    markRead(notif.id);
    if (notif.type === "FRIEND_REQUEST" || notif.type === "FRIEND_ACCEPTED") {
      setLocation("/friends");
    } else if (notif.type === "ORG_INVITE") {
      setLocation("/groups");
    } else if (notif.type === "ORG_MESSAGE") {
      setLocation(`/groups/${notif.payload.organizationId}`);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-primary text-black text-[9px] font-black rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 bg-card border-border flex flex-col">
        <SheetHeader className="flex flex-row items-center justify-between pr-6">
          <SheetTitle className="uppercase tracking-widest text-sm font-mono">Notificações</SheetTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-[10px] text-muted-foreground hover:text-primary uppercase tracking-widest"
            >
              Limpar tudo
            </Button>
          )}
        </SheetHeader>

        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {notifications.length === 0 ? (
            <div className="text-center py-16 font-mono text-muted-foreground uppercase text-xs border border-dashed border-border/40 rounded-xl">
              Sem notificações
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="w-full text-left p-3 rounded-lg border border-border bg-black/20 hover:border-primary/40 transition-all group"
              >
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  {n.type.replaceAll("_", " ")}
                </p>
                <p className="text-sm text-white/80 mt-0.5">
                  {(n.payload as any).fromUsername && (
                    <span className="font-bold">{(n.payload as any).fromUsername} </span>
                  )}
                  {NOTIF_LABEL[n.type] ?? ""}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  {new Date(n.createdAt).toLocaleString("pt-BR")}
                </p>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, token } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { onMessage } = useWs(token);

  // Apenas GAME_INVITE_RECEIVED continua como toast puro (não persiste)
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
                setLocation(`/room?code=${encodeURIComponent(msg.roomCode)}`);
              }}
              className="bg-primary hover:bg-primary/80 font-bold uppercase tracking-wider text-xs h-8 px-3 text-white"
            >
              Aceitar
            </Button>
          ),
        });
      }
    });
    return off;
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

          <nav className="flex items-center gap-4">
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
            <NotificationBell />
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline-block">
              {user?.username}
            </span>
            <Button variant="ghost" size="icon" onClick={logout} title="Desconectar">
              <LogOut className="h-5 w-5 text-destructive" />
            </Button>
            <div className="rounded-full border border-red-500/30 bg-black/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-red-300">
              build {BUILD_TAG}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        {children}
      </main>
    </div>
  );
}