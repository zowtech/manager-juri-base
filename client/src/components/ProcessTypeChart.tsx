import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface ProcessTypeChartProps {
  cases: any[];
}

export default function ProcessTypeChart({ cases }: ProcessTypeChartProps) {
  // Contar tipos de processos
  const processCounts = cases.reduce((acc, caseData) => {
    const tipo = caseData.tipoProcesso || 'Não Classificado';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Cores para cada tipo
  const colors: Record<string, string> = {
    'Trabalhista': '#ef4444',
    'Rescisão Indireta': '#f97316',
    'Dano Moral': '#8b5cf6',
    'Previdenciário': '#06b6d4',
    'Cível': '#10b981',
    'Não Classificado': '#6b7280'
  };

  const chartData = Object.entries(processCounts).map(([name, value]) => ({
    name,
    value,
    fill: colors[name] || '#6b7280'
  }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-gray-800">
          <BarChart3 className="mr-2 h-5 w-5" />
          Tipos de Processos Mais Comuns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={80} 
              fontSize={12}
              interval={0}
            />
            <YAxis />
            <Tooltip 
              formatter={[
                (value: number) => [`${value} processo${value !== 1 ? 's' : ''}`, 'Quantidade']
              ]}
            />
            <Bar dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}