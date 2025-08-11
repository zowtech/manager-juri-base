import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import type { WidgetConfig, CaseWithRelations } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentCasesWidgetProps {
  config: WidgetConfig;
  data?: CaseWithRelations[];
}

const statusColors = {
  novo: "bg-blue-100 text-blue-800 border-blue-200",
  andamento: "bg-yellow-100 text-yellow-800 border-yellow-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
  pendente: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  novo: "Novo",
  andamento: "Em Andamento",
  concluido: "Concluído",
  pendente: "Pendente",
};

export default function RecentCasesWidget({ config, data }: RecentCasesWidgetProps) {
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
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            Nenhum processo recente
          </div>
        ) : (
          data.slice(0, 4).map((caseItem) => (
            <div key={caseItem.id} className="flex items-start space-x-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {caseItem.clientName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {caseItem.processNumber}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${statusColors[caseItem.status as keyof typeof statusColors]}`}
                  >
                    {statusLabels[caseItem.status as keyof typeof statusLabels]}
                  </Badge>
                  <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(caseItem.createdAt), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}