import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CaseStatusChart from "@/components/charts/CaseStatusChart";
import ResponseTimeChart from "@/components/charts/ResponseTimeChart";
import { ArrowUp, ArrowDown, FileText, CheckCircle, Clock, Timer } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  if (isLoading) {
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
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Processos",
      value: stats?.total || 0,
      icon: FileText,
      change: "+12%",
      changeType: "increase" as const,
      color: "blue",
    },
    {
      title: "Concluídos",
      value: stats?.completed || 0,
      icon: CheckCircle,
      change: "+8%",
      changeType: "increase" as const,
      color: "green",
    },
    {
      title: "Em Andamento",
      value: stats?.inProgress || 0,
      icon: Clock,
      change: "+3%",
      changeType: "increase" as const,
      color: "yellow",
    },
    {
      title: "Tempo Médio",
      value: `${stats?.averageResponseTime || 0} dias`,
      icon: Timer,
      change: "-5%",
      changeType: "decrease" as const,
      color: "red",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className={`border-l-4 border-l-${stat.color}-500`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-full`}>
                  <stat.icon className={`text-${stat.color}-600 text-xl`} size={24} />
                </div>
              </div>
              <div className="mt-4 text-sm">
                <span className={`${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                  {stat.changeType === 'increase' ? <ArrowUp size={16} className="mr-1" /> : <ArrowDown size={16} className="mr-1" />}
                  {stat.change} este mês
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Processos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseStatusChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo de Resposta Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponseTimeChart />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentLogs?.slice(0, 5).map((log: any) => (
              <div key={log.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-full">
                  {log.action === 'create' && <FileText className="text-blue-600" size={16} />}
                  {log.action === 'edit' && <Clock className="text-yellow-600" size={16} />}
                  {log.action === 'delete' && <div className="text-red-600">×</div>}
                  {log.action === 'status_change' && <CheckCircle className="text-green-600" size={16} />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{log.user.firstName} {log.user.lastName}</p>
                  <p className="text-sm text-gray-600">{log.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
            {(!recentLogs || recentLogs.length === 0) && (
              <p className="text-gray-500 text-center py-4">Nenhuma atividade recente</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
