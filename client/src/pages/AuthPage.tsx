import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User as UserType } from "@shared/schema";
import facilityLogo from "@assets/449265_6886_1753882292906.jpg";

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      const user: UserType = await response.json();
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Acesso autorizado",
        description: `Bem-vindo, ${user.firstName}!`,
        duration: 2000,
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error: any) {
      toast({
        title: "Acesso negado",
        description: "Credenciais inválidas. Verifique usuário e senha.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-800/40"></div>
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <div className="mx-auto">
                <img 
                  src={facilityLogo} 
                  alt="BASE FACILITIES" 
                  className="w-32 h-24 object-contain"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">BASE FACILITIES</h1>
                <p className="text-xl text-blue-100 font-light">Gestão Jurídica Corporativa</p>
              </div>
            </div>

            <div className="space-y-6 max-w-md">
              <p className="text-lg text-blue-50/90 leading-relaxed">
                Plataforma integrada para controle de processos, gestão de casos e auditoria completa de atividades jurídicas.
              </p>
              
              <div className="grid gap-4">
                <div className="flex items-center gap-3 text-blue-100">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Controle total de casos e processos</span>
                </div>
                <div className="flex items-center gap-3 text-blue-100">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Auditoria e rastreamento de atividades</span>
                </div>
                <div className="flex items-center gap-3 text-blue-100">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Dashboard analítico em tempo real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 lg:flex-initial lg:w-[500px] flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center space-y-4">
            <img 
              src={facilityLogo} 
              alt="BASE FACILITIES" 
              className="w-16 h-16 mx-auto rounded-full object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BASE FACILITIES</h1>
              <p className="text-gray-600">Gestão Jurídica Corporativa</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900">Área Restrita</h2>
              <p className="mt-2 text-gray-600">Acesse sua conta corporativa</p>
            </div>

            <Card className="border-0 shadow-xl bg-white">
              <CardHeader className="space-y-1 pb-8">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto lg:mx-0">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-gray-700">Usuário</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <Input 
                                placeholder="Digite seu usuário"
                                className="pl-10 h-12 border-2 focus:border-blue-500 transition-colors"
                                {...field} 
                              />
                            </div>
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
                          <FormLabel className="text-sm font-semibold text-gray-700">Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Digite sua senha"
                                className="pl-10 pr-10 h-12 border-2 focus:border-blue-500 transition-colors"
                                {...field} 
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Autenticando...
                        </div>
                      ) : (
                        "Acessar Sistema"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                © 2024 BASE FACILITIES - Sistema Corporativo de Gestão Jurídica
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}