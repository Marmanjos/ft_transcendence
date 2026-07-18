import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe, useLogin, useRegister, useLogout } from "@workspace/api-client-react";
import type { LoginInput, RegisterInput, User } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "elemental_duel_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading, isError } = useGetMe({
    query: {
      queryKey: ["/api/auth/me"],
      enabled: !!token,
      retry: false,
    }
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  // Handle token expiration/invalidation from the backend
  useEffect(() => {
    if (isError && token) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      queryClient.clear();
      setLocation("/login");
    }
  }, [isError, token, queryClient, setLocation]);

  const login = async (data: LoginInput) => {
    try {
      // 1. Executa a mutação de forma limpa
      const response = await loginMutation.mutateAsync({ data });
      if ((response as any).error) {
        throw new Error((response as any).error);
      }
      // Synchronously set token in localStorage before updating state and navigating
      // to ensure subsequent requests can access the token immediately.
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      localStorage.setItem(TOKEN_KEY, response.token);
      queryClient.setQueryData(["/api/auth/me"], response.user);
      
      toast({
        title: "Acesso Autorizado",
        description: "Bem-vindo à arena.",
      });
      setLocation("/lobby");
    } catch (error: any) {
      // Clear any existing token on failed login attempts
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      queryClient.clear();
      const description = error?.data?.error || error?.message || "Credenciais inválidas.";
      toast({
        title: "Acesso Negado",
        description,
        variant: "destructive",
      });
      throw error; // Re‑throw to propagate error after cleanup
    }
  };

  const register = async (data: RegisterInput) => {
    try {
      // 1. Executa a mutação de forma limpa
      const response = await registerMutation.mutateAsync({ data });
      if ((response as any).error) {
        throw new Error((response as any).error);
      }
      // Synchronously set token in localStorage before updating state and navigating
      localStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      localStorage.setItem(TOKEN_KEY, response.token);
      queryClient.setQueryData(["/api/auth/me"], response.user);
      
      toast({
        title: "Registro Concluído",
        description: "Sua jornada começa agora.",
      });
      setLocation("/lobby");
    } catch (error: any) {
      const description = error?.data?.error || error?.message || "Não foi possível criar sua conta.";
      toast({
        title: "Erro no Registro",
        description,
        variant: "destructive",
      });
      throw error;
    }
  };

  const performLogout = async () => {
    try {
      // Executa de forma limpa e síncrona
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Ignore network failures on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      queryClient.clear();
      setLocation("/");
    }
  };

  const isLoading = !!token && isUserLoading;

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, register, logout: performLogout, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
