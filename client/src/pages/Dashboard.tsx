import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, FileText, CheckCircle, Clock, Timer, TrendingUp, Users, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["/api/cases"],
  });

  if (statsLoading || logsLoading || casesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-16 mb-4" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Processos",
      value: stats?.total || "0",
      icon: FileText,
      color: "bg-blue-500",
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Processos Concluídos",
      value: stats?.completed || "0",
      icon: CheckCircle,
      color: "bg-green-500",
      trend: "+8%",
      trendUp: true,
    },
    {
      title: "Em Andamento",
      value: stats?.inProgress || "0",
      icon: Clock,
      color: "bg-yellow-500",
      trend: "+3%",
      trendUp: true,
    },
    {
      title: "Tempo Médio",
      value: `${stats?.averageResponseTime || 0}d`,
      icon: Timer,
      color: "bg-purple-500",
      trend: "-2d",
      trendUp: false,
    },
  ];

  const recentCases = cases?.slice(0, 5) || [];
  const urgentCases = cases?.filter((c: any) => {
    if (c.dueDate) {
      const dueDate = new Date(c.dueDate);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    }
    return false;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-blue-100 text-blue-800';
      case 'andamento': return 'bg-yellow-100 text-yellow-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Executivo</h1>
        <p className="text-gray-600">Visão geral dos processos jurídicos e métricas de desempenho</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.trendUp ? (
                        <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.trend}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processos Urgentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center">
              <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
              Processos Urgentes
            </CardTitle>
            <Badge variant="destructive">{urgentCases.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {urgentCases.length > 0 ? urgentCases.map((caseItem: any) => {
                const dueDate = new Date(caseItem.dueDate);
                const today = new Date();
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={caseItem.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{caseItem.clientName}</h4>
                      <p className="text-sm text-gray-600 truncate">{caseItem.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={`${diffDays <= 2 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                        {diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `${diffDays}d`}
                      </Badge>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Nenhum processo urgente no momento</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Atividade Recente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center">
              <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
              Atividade Recente
            </CardTitle>
            <Button variant="outline" size="sm">Ver Todas</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs && recentLogs.length > 0 ? recentLogs.slice(0, 5).map((log: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{log.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {log.user?.firstName} {log.user?.lastName} • {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Nenhuma atividade recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processos Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <FileText className="w-5 h-5 text-green-500 mr-2" />
            Processos Recentes
          </CardTitle>
          <Button variant="outline" size="sm">Ver Todos</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCases.length > 0 ? recentCases.map((caseItem: any) => (
              <div key={caseItem.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{caseItem.clientName}</h4>
                    <Badge className={getStatusColor(caseItem.status)}>
                      {caseItem.status === 'novo' && 'Novo'}
                      {caseItem.status === 'andamento' && 'Em Andamento'}
                      {caseItem.status === 'concluido' && 'Concluído'}
                      {caseItem.status === 'pendente' && 'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{caseItem.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Criado em {new Date(caseItem.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Ver Detalhes
                </Button>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>Nenhum processo encontrado</p>
                <Button className="mt-4" variant="outline">
                  Criar Primeiro Processo
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}