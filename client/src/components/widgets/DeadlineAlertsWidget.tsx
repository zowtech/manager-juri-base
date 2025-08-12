import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Calendar, CheckCircle } from "lucide-react";
import type { WidgetConfig } from "@shared/schema";

interface DeadlineAlert {
  id: string;
  processNumber: string;
  clientName: string;
  dueDate: string;
  daysOverdue: number;
  priority: 'high' | 'medium' | 'low';
}

interface DeadlineAlertsWidgetProps {
  config: WidgetConfig;
  data?: DeadlineAlert[];
}

export default function DeadlineAlertsWidget({ config, data }: DeadlineAlertsWidgetProps) {
  if (!data) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Carregando alertas...</div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhum prazo em atraso!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return Clock;
      case 'low': return Calendar;
      default: return Clock;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-1 md:pb-2">
        <CardTitle className="text-xs md:text-sm font-medium flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span>{config.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.slice(0, 5).map((alert) => {
            const PriorityIcon = getPriorityIcon(alert.priority);
            return (
              <div key={alert.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border">
                <div className={`p-1 rounded ${getPriorityColor(alert.priority)}`}>
                  <PriorityIcon className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{alert.processNumber}</p>
                  <p className="text-[10px] text-gray-500 truncate">{alert.clientName}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {alert.daysOverdue > 0 
                        ? `${alert.daysOverdue} dias em atraso`
                        : `Vence em ${Math.abs(alert.daysOverdue)} dias`
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
          {data.length > 5 && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                +{data.length - 5} outros alertas
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}