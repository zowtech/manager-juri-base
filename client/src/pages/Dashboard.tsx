import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Activity,
  Settings,
  GripVertical
} from "lucide-react";
import type { CaseWithRelations } from "@shared/schema";
import ProcessTypeChart from "@/components/ProcessTypeChart";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface DashboardStats {
  total: number;
  novos: number;
  pendentes: number;
  concluidos: number;
  atrasados: number;
  averageResponseTime: number;
}

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDraggable, setIsDraggable] = useState(false);
  const [layouts, setLayouts] = useState({
    lg: [
      { i: 'header', x: 0, y: 0, w: 12, h: 2, static: true },
      { i: 'stats', x: 0, y: 2, w: 12, h: 2 },
      { i: 'charts', x: 0, y: 4, w: 8, h: 6 },
      { i: 'urgent', x: 8, y: 4, w: 4, h: 6 },
      { i: 'recent', x: 0, y: 10, w: 12, h: 4 },
    ]
  });

  // Data queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", { credentials: 'include' });
      if (!response.ok) {
        if (isUnauthorizedError(response.status)) {
          toast({
            title: "Sessão expirada",
            description: "Faça login novamente para continuar.",
            variant: "destructive",
          });
          return null;
        }
        throw new Error('Failed to fetch stats');
      }
      return response.json() as Promise<DashboardStats>;
    },
    refetchInterval: 300000, // 5 minutes
  });

  const { data: recentCases } = useQuery({
    queryKey: ["/api/cases", { limit: 10 }],
    queryFn: async () => {
      const response = await fetch("/api/cases?limit=10", { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch cases');
      return response.json() as Promise<CaseWithRelations[]>;
    },
    refetchInterval: 120000, // 2 minutes
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/activity-logs", { limit: 5 }],
    queryFn: async () => {
      const response = await fetch("/api/activity-logs?limit=5", { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      return response.json();
    },
    refetchInterval: 60000, // 1 minute
  });

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'novo': { variant: 'default' as const, label: 'Novo' },
      'andamento': { variant: 'secondary' as const, label: 'Em Andamento' },
      'pendente': { variant: 'outline' as const, label: 'Pendente' },
      'concluido': { variant: 'default' as const, label: 'Concluído' },
      'atrasado': { variant: 'destructive' as const, label: 'Atrasado' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.novo;
    
    return (
      <Badge variant={config.variant} className={
        status === 'concluido' ? 'bg-green-100 text-green-800 border-green-200' :
        status === 'atrasado' ? 'bg-red-100 text-red-800 border-red-200' :
        status === 'pendente' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
        status === 'andamento' ? 'bg-blue-100 text-blue-800 border-blue-200' :
        'bg-gray-100 text-gray-800 border-gray-200'
      }>
        {config.label}
      </Badge>
    );
  };

  // Get urgent cases (deadline within 3 days or overdue)
  const getUrgentCases = () => {
    if (!recentCases) return [];
    
    const today = new Date();
    return recentCases.filter(caseData => {
      if (!caseData.prazoEntrega) return false;
      
      const deadline = new Date(caseData.prazoEntrega);
      const daysDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysDiff <= 3; // Within 3 days or overdue
    }).sort((a, b) => {
      const deadlineA = new Date(a.prazoEntrega!).getTime();
      const deadlineB = new Date(b.prazoEntrega!).getTime();
      return deadlineA - deadlineB; // Most urgent first
    });
  };

  const urgentCases = getUrgentCases();
  
  // Calculate completion rate
  const completionRate = stats?.total ? Math.round((stats.concluidos / stats.total) * 100) : 0;

  const handleLayoutChange = useCallback((layout: any, layouts: any) => {
    setLayouts(layouts);
  }, []);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderWidget = (key: string) => {
    switch (key) {
      case 'header':
        return (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between h-full">
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
              <div className="mt-4 md:mt-0 flex items-center space-x-4">
                <Button
                  variant={isDraggable ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setIsDraggable(!isDraggable)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {isDraggable ? 'Finalizar Edição' : 'Personalizar Layout'}
                </Button>
                <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-4 py-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium capitalize">{user?.role}</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'stats':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-blue-700">Novos</CardTitle>
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{stats?.novos || 0}</div>
                <p className="text-xs text-blue-600 mt-1">Novos</p>
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
                <p className="text-xs text-yellow-600 mt-1">Pendentes</p>
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
                <p className="text-xs text-red-600 mt-1">Atrasados</p>
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
                <p className="text-xs text-green-600 mt-1">Concluídos</p>
              </CardContent>
            </Card>
          </div>
        );
      case 'charts':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <Card className="shadow-lg">
              <CardHeader className="bg-green-50 rounded-t-lg">
                <CardTitle className="flex items-center text-green-800">
                  <FileText className="mr-2 h-5 w-5 text-green-600" />
                  Últimas Atualizações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {recentCases && recentCases.length > 0 ? (
                    recentCases.slice(0, 5).map((caseData) => (
                      <div key={caseData.id} className="p-4 hover:bg-green-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {caseData.clientName}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Matrícula: {caseData.matricula} • Processo: {caseData.processNumber}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Atualizado: {new Date(caseData.updatedAt || caseData.createdAt).toLocaleDateString('pt-BR')}
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
                      <p>Nenhuma atualização recente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <ProcessTypeChart cases={recentCases || []} />
          </div>
        );
      case 'urgent':
        return (
          <Card className="shadow-lg h-full">
            <CardHeader className="bg-red-50 rounded-t-lg">
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                Processos Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
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
        );
      case 'recent':
        return (
          <Card className="shadow-lg h-full">
            <CardHeader className="bg-blue-50 rounded-t-lg">
              <CardTitle className="flex items-center text-blue-800">
                <Activity className="mr-2 h-5 w-5 text-blue-600" />
                Atividades Recentes e Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="divide-y divide-gray-100">
                    {recentActivity && recentActivity.length > 0 ? (
                      recentActivity.slice(0, 5).map((activity: any) => (
                        <div key={activity.id} className="py-3 first:pt-0">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Activity className="w-4 h-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">{activity.user?.firstName || 'Usuário'}</span>
                                {' '}{activity.action.toLowerCase().includes('create') ? 'criou' : 
                                     activity.action.toLowerCase().includes('update') ? 'atualizou' :
                                     activity.action.toLowerCase().includes('delete') ? 'excluiu' : 'modificou'}
                                {' '}um processo
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(activity.timestamp).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Activity className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <p>Nenhuma atividade recente</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
                    <p className="text-sm text-gray-600 mt-1">Taxa de Conclusão</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats?.averageResponseTime || 0}</div>
                    <p className="text-sm text-gray-600 mt-1">Tempo Médio (dias)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return <div>Widget não encontrado</div>;
    }
  };

  return (
    <div className="space-y-4">
      {isDraggable && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 text-blue-800">
            <GripVertical className="w-5 h-5" />
            <span className="font-medium">Modo de Edição Ativo</span>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            Arraste os widgets para reorganizar o layout. Redimensione puxando pelas bordas.
          </p>
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        isDraggable={isDraggable}
        isResizable={isDraggable}
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        {Object.keys(layouts.lg || {}).map((key) => (
          <div key={key} className="bg-white rounded-lg overflow-hidden">
            {renderWidget(key)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}