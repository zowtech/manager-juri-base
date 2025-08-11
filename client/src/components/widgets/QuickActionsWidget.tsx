import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, Users } from "lucide-react";
import type { WidgetConfig } from "@shared/schema";

interface QuickActionsWidgetProps {
  config: WidgetConfig;
  onNewCase?: () => void;
  onSearchEmployees?: () => void;
}

export default function QuickActionsWidget({ config, onNewCase, onSearchEmployees }: QuickActionsWidgetProps) {
  const actions = [
    {
      label: "Novo Processo",
      icon: Plus,
      onClick: onNewCase,
      className: "bg-blue-500 hover:bg-blue-600 text-white",
    },
    {
      label: "Buscar Funcionário",
      icon: Search,
      onClick: onSearchEmployees,
      className: "bg-green-500 hover:bg-green-600 text-white",
    },
    {
      label: "Relatórios",
      icon: FileText,
      onClick: () => {}, 
      className: "bg-purple-500 hover:bg-purple-600 text-white",
    },
    {
      label: "Usuários",
      icon: Users,
      onClick: () => {}, 
      className: "bg-orange-500 hover:bg-orange-600 text-white",
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              onClick={action.onClick}
              className={`h-16 flex flex-col items-center justify-center space-y-1 ${action.className}`}
              size="sm"
            >
              <action.icon className="h-4 w-4" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}