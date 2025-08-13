import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, User, Eye, EyeOff, Building2, Scale } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User as UserType } from "@shared/schema";

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
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Acesso autorizado",
        description: `Bem-vindo, ${user.firstName}!`,
        duration: 2000,
      });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-gradient-to-br from-blue-900 via-slate-800 to-blue-950">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-slate-800/40"></div>
        
        {/* Centered Content Container */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full h-full p-8">
          <div className="max-w-sm w-full text-center space-y-8">
            
            {/* Logo and Brand */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
                  LegalCore Pro
                </h1>
                <p className="text-xl text-blue-100 font-medium leading-relaxed">
                  Sistema Avançado de Gestão Jurídica
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-blue-300 rounded-full mx-auto"></div>
              </div>
            </div>

            {/* Features Cards */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-blue-100 bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Gestão Corporativa Integrada</span>
              </div>
              
              <div className="flex items-center space-x-3 text-blue-100 bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Controle de Processos Jurídicos</span>
              </div>
              
              <div className="flex items-center space-x-3 text-blue-100 bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Segurança e Conformidade</span>
              </div>
            </div>

            {/* Security Information */}
            <div className="pt-6 border-t border-white/20">
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">LegalCore Pro® - Sistema Proprietário</p>
                  <div className="text-xs text-blue-200 space-y-1">
                    <p>Criptografia SHA-256 • Conforme LGPD</p>
                    <p>Acesso restrito e monitorado</p>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                    <Lock className="w-3 h-3 text-white" />
                    <span className="text-xs font-medium text-white">Certificado Digital</span>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-white">SSL/TLS</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center min-h-screen bg-white p-4">
        <div className="w-full max-w-md">
          <div className="space-y-8">
            {/* Mobile Header */}
            <div className="text-center lg:hidden">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">BASE FACILITIES</h2>
              <p className="text-gray-600 mt-2">Sistema Jurídico</p>
            </div>

            {/* Login Form */}
            <Card className="shadow-2xl border border-gray-100 bg-white">
              <CardHeader className="space-y-4 pb-6 text-center">
                <div className="hidden lg:block mb-4">
                  <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Acesso ao Sistema</h2>
                  <p className="text-gray-600 mt-2">Entre com suas credenciais corporativas</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 px-8 pb-8">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium text-sm">Usuário</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <Input 
                                {...field} 
                                className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg text-sm" 
                                placeholder="Digite seu usuário"
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium text-sm">Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <Input 
                                {...field} 
                                type={showPassword ? "text" : "password"}
                                className="pl-10 pr-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg text-sm password-field" 
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg transition-all duration-200 rounded-lg"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Entrando...</span>
                          </div>
                        ) : (
                          "Entrar no Sistema"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>

                <div className="text-center text-xs text-gray-400 pt-6 border-t border-gray-100">
                  <p>© 2024 LegalCore Pro. Todos os direitos reservados.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}