import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Cases from "@/pages/Cases";
import Users from "@/pages/Users";
import ActivityLog from "@/pages/ActivityLog";
import Layout from "@/components/Layout";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Mostrar loading apenas por um breve momento
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário autenticado, mostrar página de login
  if (!isAuthenticated || !user) {
    return <AuthPage />;
  }

  // Função para verificar se tem permissão para uma página
  const hasPagePermission = (page: string) => {
    if (user?.role === 'admin') return true;
    return (user as any)?.permissions?.pages?.[page] === true;
  };

  // Encontrar a primeira página que o usuário tem permissão
  const getFirstAllowedPage = () => {
    if (hasPagePermission('dashboard')) return 'dashboard';
    if (hasPagePermission('cases')) return 'cases';
    if (hasPagePermission('activityLog')) return 'activityLog';
    if (hasPagePermission('users')) return 'users';
    return null;
  };

  const firstAllowedPage = getFirstAllowedPage();

  // Se não tem permissão para nenhuma página, mostrar erro
  if (!firstAllowedPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar nenhuma página do sistema.
            Entre em contato com o administrador.
          </p>
          <Button onClick={() => window.location.href = "/api/logout"} variant="outline">
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Switch>
        {hasPagePermission('dashboard') && <Route path="/" component={Dashboard} />}
        {hasPagePermission('cases') && <Route path="/cases" component={Cases} />}
        {hasPagePermission('users') && <Route path="/users" component={Users} />}
        {hasPagePermission('activityLog') && <Route path="/activity-log" component={ActivityLog} />}
        
        {/* Redirecionar página inicial para primeira página permitida */}
        {!hasPagePermission('dashboard') && (
          <Route path="/">
            {() => {
              if (firstAllowedPage === 'cases') window.location.replace('/cases');
              else if (firstAllowedPage === 'activityLog') window.location.replace('/activity-log');
              else if (firstAllowedPage === 'users') window.location.replace('/users');
              return null;
            }}
          </Route>
        )}
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
