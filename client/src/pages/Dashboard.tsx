import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Users,
  BarChart3,
  Activity
} from "lucide-react";
import type { CaseWithRelations } from "@shared/schema";
import ProcessTypeChart from "@/components/ProcessTypeChart";

interface DashboardStats {
  total: number;
  novos: number;
  pendentes: number;
  concluidos: number;
  atrasados: number;
  averageResponseTime: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Não autorizado",
            description: "Você foi desconectado. Redirecionando...",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/api/login";
          }, 500);
          return { total: 0, novos: 0, pendentes: 0, concluidos: 0, atrasados: 0, averageResponseTime: 0 };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as Promise<DashboardStats>;
    },
  });

  const { data: recentCases } = useQuery({
    queryKey: ["/api/cases", { limit: 5 }],
    queryFn: async () => {
      const response = await fetch("/api/cases?limit=5", {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as Promise<CaseWithRelations[]>;
    },
  });

  const getStatusBadge = (status: string, alertColor?: string) => {
    const statusConfig = {
      novo: { label: "Novo", className: "bg-blue-100 text-blue-800 border-blue-200" },
      pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      concluido: { label: "Concluído", className: "bg-green-100 text-green-800 border-green-200" },
      atrasado: { label: "Atrasado", className: "bg-red-100 text-red-800 border-red-200" },
    };
    
    // Aplicar cores de alerta se fornecidas
    let finalClassName = statusConfig[status as keyof typeof statusConfig]?.className || statusConfig.novo.className;
    
    if (alertColor === 'red') {
      finalClassName = "bg-red-100 text-red-800 border-red-200";
    } else if (alertColor === 'yellow') {
      finalClassName = "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.novo;
    return (
      <Badge className={`${finalClassName} border font-medium px-2 py-1`}>
        {config.label}
      </Badge>
    );
  };

  const getUrgentCases = () => {
    if (!recentCases) return [];
    
    return recentCases.filter(caseData => {
      if (!caseData.prazoEntrega) return false;
      const deadline = new Date(caseData.prazoEntrega);
      const today = new Date();
      const daysDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 3 && caseData.status !== 'concluido';
    });
  };

  const urgentCases = getUrgentCases();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Bem-vindo, {user?.firstName}!
            </h1>
            <p className="text-blue-100 text-lg">
              Visão geral do sistema jurídico - {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-4 py-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium capitalize">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Ordem: NOVOS, PENDENTES, ATRASADOS, CONCLUÍDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-blue-700">Novos</CardTitle>
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats?.novos || 0}</div>
            <p className="text-xs text-blue-600 mt-1">
              Novos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-yellow-700">Pendentes</CardTitle>
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-900">{stats?.pendentes || 0}</div>
            <p className="text-xs text-yellow-600 mt-1">
              Pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-red-700">Atrasados</CardTitle>
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{stats?.atrasados || 0}</div>
            <p className="text-xs text-red-600 mt-1">
              Atrasados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-green-700">Concluídos</CardTitle>
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{stats?.concluidos || 0}</div>
            <p className="text-xs text-green-600 mt-1">
              Concluídos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Urgent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gray-50 rounded-t-lg">
            <CardTitle className="flex items-center text-gray-800">
              <Activity className="mr-2 h-5 w-5 text-blue-600" />
              Processos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentCases && recentCases.length > 0 ? (
                recentCases.slice(0, 5).map((caseData) => (
                  <div key={caseData.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {caseData.nome}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Matrícula: {caseData.matricula}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(caseData.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>Nenhum processo encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Cases */}
        <Card className="shadow-lg">
          <CardHeader className="bg-red-50 rounded-t-lg">
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
              Processos Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {urgentCases.length > 0 ? (
                urgentCases.map((caseData) => {
                  const deadline = new Date(caseData.prazoEntrega!);
                  const today = new Date();
                  const daysDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={caseData.id} className="p-4 hover:bg-red-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {caseData.nome}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Calendar className="w-3 h-3 text-red-500" />
                            <p className="text-xs text-red-600">
                              {daysDiff <= 0 ? 'Vencido' : `${daysDiff} dia${daysDiff > 1 ? 's' : ''} restante${daysDiff > 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            {deadline.toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-300 mb-4" />
                  <p>Nenhum processo urgente</p>
                  <p className="text-xs text-gray-400 mt-1">Todos os prazos estão em dia</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tipos de Processos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProcessTypeChart cases={recentCases || []} />
        
        {/* Performance Summary */}
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-50 rounded-t-lg">
            <CardTitle className="flex items-center text-blue-800">
              <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
              Resumo de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
                <p className="text-sm text-gray-600 mt-1">Taxa de Conclusão</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats?.averageResponseTime || 0}</div>
                <p className="text-sm text-gray-600 mt-1">Tempo Médio (dias)</p>
              </div>
            </div>
            
            {/* Tipos mais comuns */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Tipos Mais Recorrentes</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Trabalhista</span>
                  </div>
                  <span className="font-medium">{recentCases?.filter(c => c.tipoProcesso === 'Trabalhista').length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Rescisão Indireta</span>
                  </div>
                  <span className="font-medium">{recentCases?.filter(c => c.tipoProcesso === 'Rescisão Indireta').length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>Dano Moral</span>
                  </div>
                  <span className="font-medium">{recentCases?.filter(c => c.tipoProcesso === 'Dano Moral').length || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}