import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

setBaseUrl(import.meta.env.VITE_API_BASE_URL?.trim() || null);

setAuthTokenGetter(() => localStorage.getItem("elemental_duel_token"));

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Lobby from "@/pages/lobby";
import Room from "@/pages/room";
import Game from "@/pages/game";
import Game3v3 from "@/pages/game-3v3";
import Game3v3Arena from "@/pages/game-3v3-arena";
import GameMulti from "@/pages/game-multi";
import History from "@/pages/history";
import Leaderboard from "@/pages/leaderboard";
import Profile from "@/pages/profile";
import Friends from "@/pages/friends";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/group-detail";
import MatchDetail from "@/pages/match-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        <Route path="/lobby">
          <ProtectedRoute><Lobby /></ProtectedRoute>
        </Route>
        <Route path="/game/3v3">
          <ProtectedRoute><Game3v3 /></ProtectedRoute>
        </Route>
        <Route path="/game/3v3/arena">
          <ProtectedRoute><Game3v3Arena /></ProtectedRoute>
        </Route>
        <Route path="/game/multi">
          <ProtectedRoute><GameMulti /></ProtectedRoute>
        </Route>
        <Route path="/game">
          <ProtectedRoute><Game /></ProtectedRoute>
        </Route>
        <Route path="/room">
          <ProtectedRoute><Room /></ProtectedRoute>
        </Route>
        <Route path="/friends">
          <ProtectedRoute><Friends /></ProtectedRoute>
        </Route>
        <Route path="/groups">
          <ProtectedRoute><Groups /></ProtectedRoute>
        </Route>
        <Route path="/groups/:id">
          {params => <ProtectedRoute><GroupDetail id={Number(params.id)} /></ProtectedRoute>}
        </Route>
        <Route path="/history">
          <ProtectedRoute><History /></ProtectedRoute>
        </Route>
        <Route path="/leaderboard">
          <ProtectedRoute><Leaderboard /></ProtectedRoute>
        </Route>
        <Route path="/profile/:id">
          {params => <ProtectedRoute><Profile id={Number(params.id)} /></ProtectedRoute>}
        </Route>
        <Route path="/match/:id">
          {params => <ProtectedRoute><MatchDetail id={Number(params.id)} /></ProtectedRoute>}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
