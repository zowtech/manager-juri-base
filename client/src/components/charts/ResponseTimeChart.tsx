import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ResponseTimeChart() {
  const { data: cases } = useQuery({
    queryKey: ["/api/cases"],
  });

  // Generate monthly response time data
  const monthlyData = React.useMemo(() => {
    if (!cases) return [];

    const completedCases = cases.filter((c: any) => c.status === 'concluido' && c.completedDate);
    
    const monthlyStats: Record<string, { total: number; count: number }> = {};
    
    completedCases.forEach((caseItem: any) => {
      const completedDate = new Date(caseItem.completedDate);
      const startDate = new Date(caseItem.startDate);
      const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
      
      const responseTime = Math.ceil((completedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { total: 0, count: 0 };
      }
      
      monthlyStats[monthKey].total += responseTime;
      monthlyStats[monthKey].count += 1;
    });

    return Object.entries(monthlyStats)
      .map(([month, stats]) => ({
        month,
        averageTime: Math.round(stats.total / stats.count),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }, [cases]);

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>Dados insuficientes para análise</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
              return `${month}/${year}`;
            }}
          />
          <YAxis label={{ value: 'Dias', angle: -90, position: 'insideLeft' }} />
          <Tooltip 
            labelFormatter={(value) => {
              const [year, month] = value.split('-');
              return `${month}/${year}`;
            }}
            formatter={(value) => [`${value} dias`, 'Tempo Médio']}
          />
          <Line 
            type="monotone" 
            dataKey="averageTime" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import React from "react";
