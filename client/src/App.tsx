import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import ImportCases2024 from "@/pages/ImportCases2024";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Cases from "@/pages/Cases";
import Users from "@/pages/Users";
import ActivityLog from "@/pages/ActivityLog";
import Employees from "@/pages/Employees";
import Layout from "@/components/Layout";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, navigate] = useLocation();

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



  // Redirecionar se estiver na home e não tiver permissão para dashboard
  if (location === '/' && !hasPagePermission('dashboard') && firstAllowedPage) {
    if (firstAllowedPage === 'cases') {
      navigate('/cases');
      return null;
    } else if (firstAllowedPage === 'activityLog') {
      navigate('/activity-log');
      return null;
    } else if (firstAllowedPage === 'users') {
      navigate('/users');
      return null;
    }
  }

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
        {user?.role === 'admin' && <Route path="/import-2024" component={ImportCases2024} />}
        <Route path="/employees" component={Employees} />
        {hasPagePermission('users') && <Route path="/users" component={Users} />}
        {hasPagePermission('activityLog') && <Route path="/activity-log" component={ActivityLog} />}
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
