import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";
import { ArenaBackground } from "@/components/arena-background";

const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

export default function Login() {
  const { login } = useAuth();
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      await login(data);
    } catch (error) {
      // Error handled in useAuth
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative scanlines">
      <ArenaBackground />
      
      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-primary/30 p-8 rounded-xl neon-box z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-widest text-primary neon-text uppercase">Acesso</h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono uppercase tracking-wider">Identifique-se para entrar na arena</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary font-mono uppercase tracking-wider">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="seu@email.com"
                      className="bg-background/50 border-primary/50 focus-visible:ring-primary font-mono"
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
                  <FormLabel className="text-primary font-mono uppercase tracking-wider">Senha de Acesso</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="bg-background/50 border-primary/50 focus-visible:ring-primary font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full h-12 text-lg font-bold tracking-widest uppercase neon-box" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Autenticando..." : "Conectar"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center text-sm text-muted-foreground font-mono">
          Ainda não tem acesso?{" "}
          <Link href="/register" className="text-primary hover:text-primary/80 transition-colors uppercase tracking-widest neon-text">
            Registrar-se
          </Link>
        </div>
      </div>
    </div>
  );
}
