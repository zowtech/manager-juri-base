import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import type { ActivityLogWithUser } from "@shared/schema";

export default function ActivityLog() {
  const [actionFilter, setActionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/activity-logs", { action: actionFilter, date: dateFilter }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { action: string; date: string }];
      const searchParams = new URLSearchParams();
      if (params.action) searchParams.set('action', params.action);
      if (params.date) searchParams.set('date', params.date);
      
      const response = await fetch(`/api/activity-logs?${searchParams.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      
      return response.json();
    },
  });

  const getActionBadge = (action: string) => {
    const actionConfig = {
      create: { label: "Criação", className: "bg-green-100 text-green-800" },
      edit: { label: "Edição", className: "bg-blue-100 text-blue-800" },
      delete: { label: "Exclusão", className: "bg-red-100 text-red-800" },
      status_change: { label: "Mudança de Status", className: "bg-yellow-100 text-yellow-800" },
    };
    
    const config = actionConfig[action as keyof typeof actionConfig] || actionConfig.create;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <History className="mr-2" size={20} />
              Log de Atividades
            </CardTitle>
            <div className="flex items-center space-x-4">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas as Ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as Ações</SelectItem>
                  <SelectItem value="create">Criação</SelectItem>
                  <SelectItem value="edit">Edição</SelectItem>
                  <SelectItem value="delete">Exclusão</SelectItem>
                  <SelectItem value="status_change">Mudança de Status</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log: ActivityLogWithUser) => (
                <TableRow key={log.id} className="hover:bg-gray-50">
                  <TableCell className="text-sm">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {log.user.role}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.description}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {log.ipAddress || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(!logs || logs.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              Nenhuma atividade encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
