// src/pages/register.tsx

import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
// ✅ Importa o novo componente
import { NeonRingBackground } from "@/components/neonRingBackground";

const registerSchema = z.object({
  username: z.string().min(3, { message: "O codinome deve ter pelo menos 3 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

export default function Register() {
  const { register } = useAuth();
  
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      await register(data);
    } catch (error) {
      // Error handled in useAuth
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative scanlines">
      {/* ✅ Usa o componente (sem duplicação) */}
      <NeonRingBackground sparkCount={15} />

      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-secondary/30 p-8 rounded-xl neon-box-secondary z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-widest text-secondary neon-text-secondary uppercase">Novo Combatente</h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono uppercase tracking-wider">Cadastre suas credenciais na rede</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-secondary font-mono uppercase tracking-wider">Codinome</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu apelido na arena" className="bg-background/50 border-secondary/50 focus-visible:ring-secondary font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-secondary font-mono uppercase tracking-wider">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="seu@email.com"
                      className="bg-background/50 border-secondary/50 focus-visible:ring-secondary font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-secondary font-mono uppercase tracking-wider">Senha de Acesso</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="bg-background/50 border-secondary/50 focus-visible:ring-secondary font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full h-12 text-lg font-bold tracking-widest uppercase bg-secondary hover:bg-secondary/80 text-secondary-foreground neon-box-secondary" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Processando..." : "Registrar"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-muted-foreground font-mono">
          Já possui acesso?{" "}
          <Link href="/login" className="text-secondary hover:text-secondary/80 transition-colors uppercase tracking-widest neon-text-secondary">
            Conectar
          </Link>
        </div>
      </div>
    </div>
  );
}