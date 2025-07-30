import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Scale, Shield, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import facilityLogo from "@assets/449265_6886_1753882292906.jpg";

const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/login", data);
      const user: User = await response.json();
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${user.firstName}!`,
      });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src={facilityLogo} 
              alt="Logo" 
              className="h-16 w-16 mx-auto mb-4 rounded-full object-cover"
            />
            <h1 className="text-3xl font-bold text-gray-900">BASE FACILITIES</h1>
            <p className="text-gray-600 mt-2">Sistema de Gestão Jurídica</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl text-center">Acesso ao Sistema</CardTitle>
              <CardDescription className="text-center">
                Entre com suas credenciais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite seu nome de usuário" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Digite sua senha" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-8 text-white flex items-center justify-center">
        <div className="max-w-lg text-center">
          <Scale className="h-20 w-20 mx-auto mb-6 text-blue-200" />
          <h2 className="text-4xl font-bold mb-6">
            Sistema de Gestão Jurídica
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Plataforma interna para gestão de casos jurídicos com controle de 
            atividades e relatórios analíticos em tempo real.
          </p>
          
          <div className="grid grid-cols-1 gap-4 text-left">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-blue-300" />
              <span className="text-blue-100">Gestão completa de casos jurídicos</span>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-blue-300" />
              <span className="text-blue-100">Controle de acesso por perfis</span>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-blue-300" />
              <span className="text-blue-100">Auditoria completa de atividades</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}