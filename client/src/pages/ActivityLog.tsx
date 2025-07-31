import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { History, Filter, Download, Search, Calendar } from "lucide-react";

export default function ActivityLog() {
  const [actionFilter, setActionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["/api/activity-logs", { action: actionFilter, search: searchTerm }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { action: string; search: string }];
      const searchParams = new URLSearchParams();
      if (params.action && params.action !== 'all') searchParams.set('action', params.action);
      if (params.search) searchParams.set('search', params.search);
      
      const response = await fetch(`/api/activity-logs?${searchParams.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      
      const result = await response.json();
      console.log('🔍 FRONTEND: Logs recebidos:', result.length);
      return result;
    },
    refetchInterval: 2000, // Refetch a cada 2 segundos para logs em tempo real
    refetchOnWindowFocus: true,
    staleTime: 0, // Sempre considerar dados como stale
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE_CASE': return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE_CASE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'UPDATE_STATUS': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE_CASE': return 'bg-red-100 text-red-800 border-red-200';
      case 'VIEW_CASES': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'VIEW_DASHBOARD': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VIEW_USERS': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'LOGIN': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'DENIED_ACCESS': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE_CASE': return 'Processo Criado';
      case 'UPDATE_CASE': return 'Processo Editado';
      case 'UPDATE_STATUS': return 'Status Alterado';
      case 'DELETE_CASE': return 'Processo Excluído';
      case 'VIEW_CASES': return 'Visualizou Processos';
      case 'VIEW_DASHBOARD': return 'Acessou Dashboard';
      case 'VIEW_USERS': return 'Acessou Usuários';
      case 'LOGIN': return 'Login';
      case 'LOGOUT': return 'Logout';
      case 'DENIED_ACCESS': return 'Acesso Negado';
      default: return action.replace(/_/g, ' ');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Log de Modificações</h1>
        <p className="text-gray-600">Acompanhe todas as modificações de dados realizadas no sistema</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Search className="mr-2" size={16} />
                Atualizar
              </Button>
              <Button variant="outline" className="bg-green-600 text-white hover:bg-green-700">
                <Download className="mr-2" size={16} />
                Exportar Log
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas as Ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Modificações</SelectItem>
                  <SelectItem value="CREATE_CASE">Criação de Processo</SelectItem>
                  <SelectItem value="UPDATE_CASE">Edição de Processo</SelectItem>
                  <SelectItem value="UPDATE_STATUS">Alteração de Status</SelectItem>
                  <SelectItem value="DELETE_CASE">Exclusão de Processo</SelectItem>
                  <SelectItem value="DENIED_ACCESS">Acesso Negado</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Buscar modificações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log Table */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-lg font-semibold flex items-center">
            <History className="mr-2" size={20} />
            Registro de Modificações de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Data/Hora</TableHead>
                <TableHead className="font-semibold">Usuário</TableHead>
                <TableHead className="font-semibold">Ação</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">IP</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.length > 0 ? (
                logs.map((log: any) => {
                  console.log('🔍 FRONTEND: Renderizando log:', log.id, log.action);
                  return (
                <TableRow key={log.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} className="text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">
                          {log.user?.firstName?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.user?.role}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionColor(log.action)}>
                      {getActionLabel(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="text-sm">{log.description}</p>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {log.ipAddress || '127.0.0.1'}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm text-green-600">Sucesso</span>
                    </div>
                  </TableCell>
                </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-4">
                      <History className="w-16 h-16 text-gray-300" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          Nenhuma atividade encontrada
                        </h3>
                        <p className="text-gray-500">
                          Ainda não há registros de atividades para exibir.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {logs && logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {logs.length}
              </div>
              <div className="text-sm text-gray-600">Total de Atividades</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {logs.filter((log: any) => log.action.includes('CREATE')).length}
              </div>
              <div className="text-sm text-gray-600">Criações</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {[...new Set(logs.map((log: any) => log.userId))].length}
              </div>
              <div className="text-sm text-gray-600">Usuários Ativos</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}