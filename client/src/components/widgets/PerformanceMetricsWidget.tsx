import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import type { WidgetConfig } from "@shared/schema";

interface PerformanceMetrics {
  averageCompletionTime: number;
  casesSolvedThisMonth: number;
  pendingCases: number;
  overduePercentage: number;
}

interface PerformanceMetricsWidgetProps {
  config: WidgetConfig;
  data?: PerformanceMetrics;
}

export default function PerformanceMetricsWidget({ config, data }: PerformanceMetricsWidgetProps) {
  if (!data) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Carregando métricas...</div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Tempo Médio de Conclusão",
      value: `${data.averageCompletionTime} dias`,
      icon: Clock,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Casos Resolvidos (Mês)",
      value: data.casesSolvedThisMonth,
      icon: CheckCircle,
      color: "bg-green-500",
      bgColor: "bg-green-50",
    },
    {
      label: "Casos Pendentes",
      value: data.pendingCases,
      icon: TrendingUp,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      label: "Em Atraso",
      value: `${data.overduePercentage}%`,
      icon: AlertTriangle,
      color: data.overduePercentage > 20 ? "bg-red-500" : data.overduePercentage > 10 ? "bg-yellow-500" : "bg-green-500",
      bgColor: data.overduePercentage > 20 ? "bg-red-50" : data.overduePercentage > 10 ? "bg-yellow-50" : "bg-green-50",
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-1 md:pb-2">
        <CardTitle className="text-xs md:text-sm font-medium">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className={`p-2 md:p-3 rounded-lg ${metric.bgColor} border`}>
              <div className="flex items-center space-x-2">
                <div className={`p-1 rounded ${metric.color}`}>
                  <metric.icon className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] md:text-xs text-gray-600 truncate">{metric.label}</p>
                  <p className="text-sm md:text-base font-bold">{metric.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}