import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { Settings, Clock, TrendingUp, TrendingDown } from "lucide-react";
import type { WidgetConfig, CaseWithRelations } from "@shared/schema";

interface DeliveryTimeWidgetProps {
  config: WidgetConfig;
  data?: CaseWithRelations[];
  onConfigChange?: (newConfig: Partial<WidgetConfig>) => void;
}

export default function DeliveryTimeWidget({ config, data, onConfigChange }: DeliveryTimeWidgetProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSaveSettings = () => {
    if (onConfigChange) {
      onConfigChange({
        data: {
          ...config.data,
          dateFilter: { startDate, endDate }
        }
      });
    }
    setShowSettings(false);
  };

  // Calculate delivery time analytics
  const calculateDeliveryMetrics = () => {
    if (!data) return { average: 0, chartData: [], totalCompleted: 0, trend: 0 };

    const completedCases = data.filter(c => 
      c.status === 'concluido' && 
      c.createdAt && 
      (c.dataEntrega || c.completedDate)
    );

    if (completedCases.length === 0) {
      return { average: 0, chartData: [], totalCompleted: 0, trend: 0 };
    }

    // Calculate delivery times in days
    const deliveryTimes = completedCases.map(c => {
      const created = new Date(c.createdAt!);
      const completed = new Date(c.dataEntrega || c.completedDate!);
      const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        clientName: c.clientName,
        days: Math.max(days, 0), // Prevent negative values
        completedDate: completed
      };
    });

    // Calculate average
    const average = Math.round(
      deliveryTimes.reduce((sum, item) => sum + item.days, 0) / deliveryTimes.length
    );

    // Create chart data grouped by month
    const monthlyData = deliveryTimes.reduce((acc, item) => {
      const month = item.completedDate.toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!acc[month]) {
        acc[month] = { month, totalDays: 0, count: 0 };
      }
      
      acc[month].totalDays += item.days;
      acc[month].count += 1;
      
      return acc;
    }, {} as Record<string, { month: string; totalDays: number; count: number }>);

    const chartData = Object.values(monthlyData)
      .map(item => ({
        month: item.month,
        avgDays: Math.round(item.totalDays / item.count)
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months

    // Calculate trend (comparing last 2 months)
    let trend = 0;
    if (chartData.length >= 2) {
      const current = chartData[chartData.length - 1].avgDays;
      const previous = chartData[chartData.length - 2].avgDays;
      trend = current - previous;
    }

    return {
      average,
      chartData,
      totalCompleted: completedCases.length,
      trend
    };
  };

  const metrics = calculateDeliveryMetrics();

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
                  <Label>Filtro por Data de Conclusão</Label>
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
                  Aplicar Filtro
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">{metrics.average}</span>
            </div>
            <p className="text-xs text-gray-500">Dias Médios</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              {metrics.trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span className={`text-2xl font-bold ${metrics.trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Math.abs(metrics.trend)}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {metrics.trend >= 0 ? 'Aumento' : 'Redução'} vs mês anterior
            </p>
          </div>
        </div>

        {/* Chart */}
        {metrics.chartData.length > 0 ? (
          <div>
            <p className="text-xs text-gray-600 mb-2">Tempo Médio por Mês</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={metrics.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 8 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fontSize: 8 }} />
                <Tooltip 
                  formatter={(value) => [`${value} dias`, 'Tempo Médio']}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Bar dataKey="avgDays" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 py-4">
            Nenhum processo concluído para análise
          </div>
        )}

        <div className="text-xs text-gray-400 text-center">
          {metrics.totalCompleted} processos concluídos analisados
        </div>
      </CardContent>
    </Card>
  );
}