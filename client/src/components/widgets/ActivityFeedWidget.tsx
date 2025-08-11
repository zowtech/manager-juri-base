import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, FileText } from "lucide-react";
import type { WidgetConfig, ActivityLogWithUser } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityFeedWidgetProps {
  config: WidgetConfig;
  data?: ActivityLogWithUser[];
}

const actionLabels = {
  CREATE_CASE: "Criou processo",
  UPDATE_CASE: "Atualizou processo", 
  DELETE_CASE: "Excluiu processo",
  CREATE_USER: "Criou usuário",
  UPDATE_USER: "Atualizou usuário",
  LOGIN: "Fez login",
  LOGOUT: "Fez logout",
};

const actionColors = {
  CREATE_CASE: "bg-green-100 text-green-800",
  UPDATE_CASE: "bg-blue-100 text-blue-800",
  DELETE_CASE: "bg-red-100 text-red-800",
  CREATE_USER: "bg-purple-100 text-purple-800",
  UPDATE_USER: "bg-yellow-100 text-yellow-800",
  LOGIN: "bg-gray-100 text-gray-800",
  LOGOUT: "bg-gray-100 text-gray-800",
};

export default function ActivityFeedWidget({ config, data }: ActivityFeedWidgetProps) {
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-48 overflow-y-auto">
        {data.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            Nenhuma atividade recente
          </div>
        ) : (
          data.slice(0, 6).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="h-3 w-3 text-gray-500" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${actionColors[activity.action as keyof typeof actionColors] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {actionLabels[activity.action as keyof typeof actionLabels] || activity.action}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {activity.description}
                </p>
                <div className="flex items-center text-xs text-gray-400 mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(activity.createdAt), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}