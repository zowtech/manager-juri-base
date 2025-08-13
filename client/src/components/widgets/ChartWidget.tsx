import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from "recharts";
import { Settings, Calendar } from "lucide-react";
import type { WidgetConfig } from "@shared/schema";

interface ChartWidgetProps {
  config: WidgetConfig;
  data?: any[];
  onConfigChange?: (newConfig: Partial<WidgetConfig>) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

export default function ChartWidget({ config, data, onConfigChange }: ChartWidgetProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempChartType, setTempChartType] = useState(config.data?.chartType || 'pie');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSaveSettings = () => {
    if (onConfigChange) {
      onConfigChange({
        data: {
          ...config.data,
          chartType: tempChartType,
          dateFilter: { startDate, endDate }
        }
      });
    }
    setShowSettings(false);
  };
  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-sm text-gray-500">Sem dados para exibir</div>
        </CardContent>
      </Card>
    );
  }

  const chartType = config.data?.chartType || 'pie';

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        {onConfigChange && (
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Gráfico</Label>
                  <Select value={tempChartType} onValueChange={setTempChartType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pie">Pizza</SelectItem>
                      <SelectItem value="bar">Barras</SelectItem>
                      <SelectItem value="line">Linha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Filtro por Data</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">De:</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Até:</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleSaveSettings} size="sm" className="w-full">
                  Aplicar Configurações
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : chartType === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}