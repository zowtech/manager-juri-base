import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = {
  novo: "#fbbf24",
  andamento: "#3b82f6", 
  concluido: "#10b981",
  pendente: "#ef4444",
};

export default function CaseStatusChart() {
  const { data: cases } = useQuery({
    queryKey: ["/api/cases"],
  });

  const statusCounts = cases?.reduce((acc: any, caseItem: any) => {
    const status = caseItem.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {}) || {};

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status === 'novo' ? 'Novo' :
          status === 'andamento' ? 'Em Andamento' :
          status === 'concluido' ? 'Concluído' : 'Pendente',
    value: count,
    status,
  }));

  if (!cases || cases.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
