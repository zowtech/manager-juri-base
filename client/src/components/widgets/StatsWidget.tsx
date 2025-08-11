import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import type { WidgetConfig } from "@shared/schema";

interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  averageResponseTime: number;
}

interface StatsWidgetProps {
  config: WidgetConfig;
  data?: DashboardStats;
}

export default function StatsWidget({ config, data }: StatsWidgetProps) {
  if (!data) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: "Total de Processos",
      value: data.total,
      icon: FileText,
      color: "bg-blue-500",
    },
    {
      label: "Concluídos",
      value: data.completed,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      label: "Em Andamento",
      value: data.inProgress,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      label: "Tempo Médio",
      value: `${data.averageResponseTime}d`,
      icon: AlertTriangle,
      color: "bg-orange-500",
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center space-x-2">
              <div className={`p-1 rounded ${stat.color}`}>
                <stat.icon className="h-3 w-3 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-sm font-semibold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}