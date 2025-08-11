import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, GripVertical } from "lucide-react";
import type { WidgetConfig, LayoutItem } from "@shared/schema";

interface DashboardCustomizerProps {
  availableWidgets: WidgetConfig[];
  activeWidgets: WidgetConfig[];
  layout: LayoutItem[];
  onWidgetToggle: (widget: WidgetConfig, enabled: boolean) => void;
  onSaveLayout: () => void;
}

export default function DashboardCustomizer({ 
  availableWidgets, 
  activeWidgets, 
  layout,
  onWidgetToggle,
  onSaveLayout 
}: DashboardCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const widgetTypeLabels = {
    stats: "Estatísticas",
    chart: "Gráficos",
    'recent-cases': "Processos Recentes",
    'case-distribution': "Distribuição de Casos",
    'activity-feed': "Feed de Atividades",
    'quick-actions': "Ações Rápidas",
  };

  const activeWidgetIds = activeWidgets.map(w => w.id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mb-4">
          <Settings className="h-4 w-4 mr-2" />
          Personalizar Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Personalizar Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-3">Widgets Disponíveis</h3>
            <div className="grid grid-cols-1 gap-3">
              {availableWidgets.map((widget) => (
                <Card key={widget.id} className="p-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={widget.id}
                      checked={activeWidgetIds.includes(widget.id)}
                      onCheckedChange={(checked) => 
                        onWidgetToggle(widget, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={widget.id} 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {widget.title}
                      </label>
                      <p className="text-xs text-gray-500">
                        {widgetTypeLabels[widget.type] || widget.type}
                      </p>
                    </div>
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Layout Atual</h3>
            <div className="text-xs text-gray-500 mb-3">
              Arraste e redimensione os widgets no dashboard para personalizar o layout.
            </div>
            <div className="grid grid-cols-2 gap-2">
              {layout.map((item) => {
                const widget = activeWidgets.find(w => w.id === item.i);
                return widget ? (
                  <div key={item.i} className="bg-gray-50 p-2 rounded text-xs">
                    <div className="font-medium">{widget.title}</div>
                    <div className="text-gray-500">
                      {item.w}x{item.h} em ({item.x}, {item.y})
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onSaveLayout();
                setIsOpen(false);
              }}
            >
              Salvar Layout
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}