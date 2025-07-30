import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import CaseModal from "@/components/CaseModal";
import { Plus, FileDown, Eye, Edit, Check, Trash2, UserPlus } from "lucide-react";
import type { CaseWithRelations } from "@shared/schema";

export default function Cases() {
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseWithRelations | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cases, isLoading } = useQuery({
    queryKey: ["/api/cases", { status: statusFilter, search: searchTerm }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { status: string; search: string }];
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.set('status', params.status);
      if (params.search) searchParams.set('search', params.search);
      
      const response = await fetch(`/api/cases?${searchParams.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Unauthorized",
            description: "You are logged out. Logging in again...",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/api/login";
          }, 500);
          return [];
        }
        throw new Error('Failed to fetch cases');
      }
      
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/cases/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Status do processo atualizado com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do processo",
        variant: "destructive",
      });
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Processo excluído com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir processo",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      novo: { label: "Novo", variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800" },
      andamento: { label: "Em Andamento", variant: "default" as const, className: "bg-blue-100 text-blue-800" },
      concluido: { label: "Concluído", variant: "default" as const, className: "bg-green-100 text-green-800" },
      pendente: { label: "Pendente", variant: "destructive" as const, className: "bg-red-100 text-red-800" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.novo;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getRowClassName = (status: string) => {
    const statusClasses = {
      novo: "bg-yellow-50 border-l-4 border-l-yellow-500",
      andamento: "bg-blue-50 border-l-4 border-l-blue-500",
      concluido: "bg-green-50 border-l-4 border-l-green-500",
      pendente: "bg-red-50 border-l-4 border-l-red-500",
    };
    return statusClasses[status as keyof typeof statusClasses] || "";
  };

  const handleNewCase = () => {
    setSelectedCase(null);
    setIsModalOpen(true);
  };

  const handleEditCase = (caseData: CaseWithRelations) => {
    setSelectedCase(caseData);
    setIsModalOpen(true);
  };

  const handleMarkComplete = (id: string) => {
    updateStatusMutation.mutate({ id, status: "concluido" });
  };

  const handleDeleteCase = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este processo?")) {
      deleteCaseMutation.mutate(id);
    }
  };

  const completedCases = cases?.filter((c: CaseWithRelations) => c.status === 'concluido') || [];
  const pendingCases = cases?.filter((c: CaseWithRelations) => c.status !== 'concluido') || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              {user?.role === 'admin' && (
                <Button onClick={handleNewCase} className="bg-base-navy hover:bg-blue-800">
                  <Plus className="mr-2" size={16} />
                  Novo Processo
                </Button>
              )}
              <Button variant="outline" className="bg-green-600 text-white hover:bg-green-700">
                <FileDown className="mr-2" size={16} />
                Exportar
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os Status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Buscar processos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed Cases */}
      <Card>
        <CardHeader className="bg-green-50">
          <CardTitle className="text-green-600 flex items-center">
            <Check className="mr-2" size={20} />
            Processos Concluídos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Data Início</TableHead>
                <TableHead>Data Conclusão</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedCases.map((caseData: CaseWithRelations) => (
                <TableRow key={caseData.id} className={`${getRowClassName(caseData.status)} hover:bg-gray-50`}>
                  <TableCell className="font-medium">{caseData.clientName}</TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{caseData.description}</div>
                      {caseData.processNumber && (
                        <div className="text-xs text-gray-500">#{caseData.processNumber}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(caseData.startDate).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    {caseData.completedDate ? new Date(caseData.completedDate).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell>
                    {caseData.assignedTo ? `${caseData.assignedTo.firstName} ${caseData.assignedTo.lastName}` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye size={16} className="text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditCase(caseData)}>
                        <Edit size={16} className="text-green-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {completedCases.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum processo concluído encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Cases */}
      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-600 flex items-center">
            <Clock className="mr-2" size={20} />
            Processos Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Data Início</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingCases.map((caseData: CaseWithRelations) => (
                <TableRow key={caseData.id} className={`${getRowClassName(caseData.status)} hover:bg-gray-50`}>
                  <TableCell className="font-medium">{caseData.clientName}</TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{caseData.description}</div>
                      {caseData.processNumber && (
                        <div className="text-xs text-gray-500">#{caseData.processNumber}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(caseData.startDate).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    {caseData.dueDate ? new Date(caseData.dueDate).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(caseData.status)}</TableCell>
                  <TableCell>
                    {caseData.assignedTo ? `${caseData.assignedTo.firstName} ${caseData.assignedTo.lastName}` : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye size={16} className="text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditCase(caseData)}>
                        <Edit size={16} className="text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleMarkComplete(caseData.id)}>
                        <Check size={16} className="text-yellow-600" />
                      </Button>
                      {user?.role === 'admin' && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCase(caseData.id)}>
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pendingCases.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum processo pendente encontrado
            </div>
          )}
        </CardContent>
      </Card>

      <CaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        caseData={selectedCase}
      />
    </div>
  );
}
