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

  const { data: user, isLoading: isUserLoading } = useGetMe({
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

  const login = async (data: LoginInput) => {
    try {
      const response = await loginMutation.mutateAsync({ data });
      setToken(response.token);
      queryClient.setQueryData(["/api/auth/me"], response.user);
      toast({
        title: "Acesso Autorizado",
        description: "Bem-vindo à arena.",
      });
      setLocation("/lobby");
    } catch (error) {
      toast({
        title: "Acesso Negado",
        description: "Credenciais inválidas.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (data: RegisterInput) => {
    try {
      const response = await registerMutation.mutateAsync({ data });
      setToken(response.token);
      queryClient.setQueryData(["/api/auth/me"], response.user);
      toast({
        title: "Registro Concluído",
        description: "Sua jornada começa agora.",
      });
      setLocation("/lobby");
    } catch (error) {
      toast({
        title: "Erro no Registro",
        description: "Não foi possível criar sua conta.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const performLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Ignore
    } finally {
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
