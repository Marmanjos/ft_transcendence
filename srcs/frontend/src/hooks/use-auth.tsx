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
      // 1. Executa a mutação de forma limpa
      const response = await loginMutation.mutateAsync({ data });

      // 2. Verifica se o backend respondeu com erro controlado (200 success: false)
      if (response && (response as any).success === false) {
        toast({
          title: "Erro no Login",
          description: (response as any).error || "Credenciais inválidas.",
          variant: "destructive"
        });
        return; // Trava o fluxo para não salvar tokens inválidos
      }

      // 3. Se correu bem, guarda o token e segue o fluxo
      setToken(response.token);
      localStorage.setItem(TOKEN_KEY, response.token);
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
      // 1. Executa a mutação de forma limpa
      const response = await registerMutation.mutateAsync({ data });

      // 2. Interceta o erro 200 controlado do backend (ex: email ou username já em uso)
      if (response && (response as any).success === false) {
        toast({ 
          title: "Erro", 
          description: (response as any).error || "Ocorreu um erro.", 
          variant: "destructive" 
        }); 
        return; 
      }

      // 3. Fluxo de sucesso real se passar na validação do backend
      setToken(response.token);
      localStorage.setItem(TOKEN_KEY, response.token);
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
      // Executa de forma limpa e síncrona
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Ignore network failures on logout
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
