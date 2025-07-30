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
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="text-center space-y-8 max-w-md">
            <div className="space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Scale className="w-10 h-10 text-white" />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-white">BASE FACILITIES</h1>
                <p className="text-xl text-blue-100 leading-relaxed">
                  Sistema Profissional de Gerenciamento Jurídico Corporativo
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-8">
              <div className="flex items-center space-x-3 text-blue-200">
                <Building2 className="w-5 h-5" />
                <span>Gestão Corporativa Integrada</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-200">
                <Scale className="w-5 h-5" />
                <span>Controle Jurídico Completo</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-200">
                <Lock className="w-5 h-5" />
                <span>Segurança e Conformidade</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="space-y-8">
            {/* Mobile Header */}
            <div className="text-center lg:hidden">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">BASE FACILITIES</h2>
              <p className="text-gray-600 mt-2">Sistema Jurídico</p>
            </div>

            {/* Login Form */}
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-4 pb-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Acesso ao Sistema</h2>
                  <p className="text-gray-600 mt-2">Entre com suas credenciais corporativas</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Usuário</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <Input 
                                {...field} 
                                className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                                placeholder="Digite seu usuário"
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
                          <FormLabel className="text-gray-700 font-medium">Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <Input 
                                {...field} 
                                type={showPassword ? "text" : "password"}
                                className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                                placeholder="Digite sua senha"
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
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
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg transition-all duration-200"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Entrando...</span>
                        </div>
                      ) : (
                        "Entrar no Sistema"
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="text-center text-sm text-gray-500 pt-4 border-t">
                  Sistema corporativo - Acesso restrito
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}