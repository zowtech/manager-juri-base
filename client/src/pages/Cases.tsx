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
import { Plus, FileDown, Eye, Edit, Check, Trash2, UserPlus, Clock, Filter } from "lucide-react";
import type { CaseWithRelations } from "@shared/schema";
import ProcessTagRenderer from "@/components/ProcessTagRenderer";
import DeadlineAlert from "@/components/DeadlineAlert";

export default function Cases() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [matriculaFilter, setMatriculaFilter] = useState("");
  const [nomeFilter, setNomeFilter] = useState("");
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
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/cases", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Sucesso",
        description: "Processo criado com sucesso",
      });
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
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
        description: "Falha ao criar processo",
        variant: "destructive",
      });
    },
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/cases/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Sucesso",
        description: "Processo atualizado com sucesso",
      });
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
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
        description: "Falha ao atualizar processo",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/cases/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
      });
    },
    onError: (error: Error) => {
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
        description: "Falha ao atualizar status",
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
      toast({
        title: "Sucesso",
        description: "Processo excluído com sucesso",
      });
    },
    onError: (error: Error) => {
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

  const handleCreateCase = (data: any) => {
    createCaseMutation.mutate(data);
  };

  const handleUpdateCase = (data: any) => {
    updateCaseMutation.mutate({ ...data, id: selectedCase?.id });
  };

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
      novo: "bg-yellow-50/30 border-l-4 border-l-yellow-500",
      andamento: "bg-blue-50/30 border-l-4 border-l-blue-500",
      concluido: "bg-green-50/30 border-l-4 border-l-green-500",
      pendente: "bg-red-50/30 border-l-4 border-l-red-500",
    };
    return statusClasses[status as keyof typeof statusClasses] || "";
  };

  // Aplicar filtros localmente
  const filteredCases = cases?.filter((caseData: CaseWithRelations) => {
    const matchesMatricula = !matriculaFilter || caseData.matricula.toLowerCase().includes(matriculaFilter.toLowerCase());
    const matchesNome = !nomeFilter || caseData.nome.toLowerCase().includes(nomeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || caseData.status === statusFilter;
    const matchesSearch = !searchTerm || caseData.processo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || (caseData.prazoEntrega && new Date(caseData.prazoEntrega) <= new Date(dateFilter));
    
    return matchesMatricula && matchesNome && matchesStatus && matchesSearch && matchesDate;
  }) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Processos</h1>
        <div className="flex items-center gap-4">
          <CaseModal
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Processo
              </Button>
            }
            onSubmit={handleCreateCase}
            isSubmitting={createCaseMutation.isPending}
          />
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros avançados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Matrícula</label>
              <Input
                placeholder="Filtrar por matrícula"
                value={matriculaFilter}
                onChange={(e) => setMatriculaFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Nome</label>
              <Input
                placeholder="Filtrar por nome"
                value={nomeFilter}
                onChange={(e) => setNomeFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Prazo até</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Processo</label>
              <Input
                placeholder="Buscar em processos"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela principal com linhas profissionais */}
      <Card>
        <CardHeader>
          <CardTitle>
            Processos ({filteredCases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow className="border-b-2 border-gray-200">
                  <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Matrícula</TableHead>
                  <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Nome</TableHead>
                  <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Processo</TableHead>
                  <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Prazo de Entrega</TableHead>
                  <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Audiência</TableHead>
                  <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((caseData: CaseWithRelations) => (
                  <TableRow key={caseData.id} className={`${getRowClassName(caseData.status)} hover:bg-gray-50/50 border-b border-gray-100 transition-colors`}>
                    <TableCell className="font-medium border-r border-gray-100 py-4">{caseData.matricula}</TableCell>
                    <TableCell className="font-medium border-r border-gray-100 py-4">{caseData.nome}</TableCell>
                    <TableCell className="border-r border-gray-100 py-4 max-w-xs">
                      <ProcessTagRenderer processo={caseData.processo} />
                    </TableCell>
                    <TableCell className="border-r border-gray-100 py-4">
                      <DeadlineAlert prazoEntrega={caseData.prazoEntrega} status={caseData.status} />
                    </TableCell>
                    <TableCell className="border-r border-gray-100 py-4">
                      {caseData.audiencia ? new Date(caseData.audiencia).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="border-r border-gray-100 py-4">{getStatusBadge(caseData.status)}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCase(caseData);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {caseData.status !== 'concluido' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: caseData.id, status: 'concluido' })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Tem certeza que deseja excluir este processo?")) {
                              deleteCaseMutation.mutate(caseData.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <CaseModal
        trigger={<div />}
        caseData={selectedCase}
        onSubmit={selectedCase ? handleUpdateCase : handleCreateCase}
        isSubmitting={createCaseMutation.isPending || updateCaseMutation.isPending}
      />
    </div>
  );
}