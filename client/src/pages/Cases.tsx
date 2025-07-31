import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import NewCaseModal from "@/components/NewCaseModal";
import { Plus, FileDown, Eye, Edit, Check, Trash2, Clock, CheckCircle, AlertTriangle, Filter, Calendar, Users, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CaseWithRelations } from "@shared/schema";
import ProcessTagRenderer from "@/components/ProcessTagRenderer";
import DeadlineAlert from "@/components/DeadlineAlert";
import EmployeeSearchModal from "@/components/EmployeeSearchModal";
import { getUserPermissions, canChangeStatus } from "@/lib/permissions";
import ConfirmStatusDialog from "@/components/ConfirmStatusDialog";

export default function Cases() {
  const [activeTab, setActiveTab] = useState("pending");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFilterTo, setDateFilterTo] = useState("");
  const [matriculaFilter, setMatriculaFilter] = useState("");
  const [nomeFilter, setNomeFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseWithRelations | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    caseData: CaseWithRelations | null;
    newStatus: string;
  }>({
    open: false,
    caseData: null,
    newStatus: ''
  });
  
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
            title: "Não autorizado",
            description: "Você foi desconectado. Redirecionando...",
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
          title: "Não autorizado",
          description: "Você foi desconectado. Redirecionando...",
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
          title: "Não autorizado",
          description: "Você foi desconectado. Redirecionando...",
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
    onSuccess: (_, variables) => {
      // Invalidar todas as consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      const statusLabels = {
        'novo': 'Novo',
        'andamento': 'Em Andamento',
        'concluido': 'Concluído',
        'pendente': 'Pendente'
      };
      
      toast({
        title: "Status atualizado com sucesso",
        description: `Processo alterado para: ${statusLabels[variables.status as keyof typeof statusLabels]}`,
        variant: "default"
      });
      
      // Forçar atualização imediata da interface
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/cases"] });
      }, 50);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Redirecionando...",
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
          title: "Não autorizado",
          description: "Você foi desconectado. Redirecionando...",
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
      novo: { label: "Novo", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      andamento: { label: "Em Andamento", className: "bg-blue-100 text-blue-800 border-blue-200" },
      concluido: { label: "Concluído", className: "bg-green-100 text-green-800 border-green-200" },
      pendente: { label: "Pendente", className: "bg-red-100 text-red-800 border-red-200" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.novo;
    return (
      <Badge className={`${config.className} border font-medium`}>
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

  // Aplicar filtros e categorizar casos
  const filteredCases = cases?.filter((caseData: CaseWithRelations) => {
    const matchesMatricula = !matriculaFilter || caseData.clientName.toLowerCase().includes(matriculaFilter.toLowerCase());
    const matchesNome = !nomeFilter || caseData.processNumber.toLowerCase().includes(nomeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || caseData.status === statusFilter;
    const matchesSearch = !searchTerm || caseData.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = (!dateFilter && !dateFilterTo) || (caseData.dueDate && (
      (!dateFilter || new Date(caseData.dueDate) >= new Date(dateFilter)) &&
      (!dateFilterTo || new Date(caseData.dueDate) <= new Date(dateFilterTo))
    ));
    
    return matchesMatricula && matchesNome && matchesStatus && matchesSearch && matchesDate;
  }) || [];

  const pendingCases = filteredCases.filter((c: CaseWithRelations) => c.status === 'novo' || c.status === 'andamento' || c.status === 'pendente');
  const completedCases = filteredCases.filter((c: CaseWithRelations) => c.status === 'concluido');
  const overdueCases = filteredCases.filter((c: CaseWithRelations) => {
    if (!c.dueDate || c.status === 'concluido') return false;
    return new Date(c.dueDate) < new Date();
  });

  const renderCaseTable = (casesToShow: CaseWithRelations[], showCompleteAction = true) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50/80">
          <TableRow className="border-b-2 border-gray-200">
            <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Nome do Funcionário</TableHead>  
            <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Processo</TableHead>
            <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Descrição</TableHead>
            <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Observação</TableHead>
            <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Prazo de Entrega</TableHead>
            <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Data Início</TableHead>
            <TableHead className="font-semibold text-gray-700 border-r border-gray-200">Status</TableHead>
            <TableHead className="font-semibold text-gray-700">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {casesToShow.map((caseData: CaseWithRelations) => (
            <TableRow key={caseData.id} className={`${getRowClassName(caseData.status)} hover:bg-gray-50/50 border-b border-gray-100 transition-colors`}>
              <TableCell className="font-medium border-r border-gray-100 py-4">{caseData.clientName}</TableCell>
              <TableCell className="font-medium border-r border-gray-100 py-4">{caseData.processNumber}</TableCell>
              <TableCell className="border-r border-gray-100 py-4 max-w-xs">
                <ProcessTagRenderer processo={caseData.description} />
              </TableCell>
              <TableCell className="border-r border-gray-100 py-4 max-w-xs">
                <div className="text-sm text-gray-600 truncate" title={caseData.observacoes || ''}>
                  {caseData.observacoes || '-'}
                </div>
              </TableCell>
              <TableCell className="border-r border-gray-100 py-4">
                <DeadlineAlert prazoEntrega={caseData.dueDate ? caseData.dueDate.toString() : null} status={caseData.status} />
              </TableCell>
              <TableCell className="border-r border-gray-100 py-4">
                {caseData.startDate ? new Date(caseData.startDate).toLocaleDateString('pt-BR') : '-'}
              </TableCell>
              <TableCell className="border-r border-gray-100 py-4">{getStatusBadge(caseData.status)}</TableCell>
              <TableCell className="py-4">
                <div className="flex items-center space-x-2">
                  {getUserPermissions(user).canEditAllCases && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCase(caseData);
                        setIsModalOpen(true);
                      }}
                      title="Editar processo"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {/* Botões de ação com confirmação */}
                  {caseData.status !== 'concluido' && canChangeStatus(user, caseData.status, 'concluido') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDialog({
                        open: true,
                        caseData,
                        newStatus: 'concluido'
                      })}
                      title="Marcar como concluído"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {caseData.status === 'concluido' && canChangeStatus(user, caseData.status, 'andamento') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDialog({
                        open: true,
                        caseData,
                        newStatus: 'andamento'
                      })}
                      title="Reabrir processo"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                  {user?.role === 'admin' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Mais opções de status"
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {caseData.status !== 'novo' && (
                          <DropdownMenuItem onClick={() => setConfirmDialog({
                            open: true,
                            caseData,
                            newStatus: 'novo'
                          })}>
                            <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                            Marcar como Novo
                          </DropdownMenuItem>
                        )}
                        {caseData.status !== 'pendente' && (
                          <DropdownMenuItem onClick={() => setConfirmDialog({
                            open: true,
                            caseData,
                            newStatus: 'pendente'
                          })}>
                            <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                            Marcar como Pendente
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {user?.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Tem certeza que deseja excluir este processo?")) {
                          deleteCaseMutation.mutate(caseData.id);
                        }
                      }}
                      title="Excluir processo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Carregando processos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Processos Jurídicos dos Funcionários</h1>
            <p className="text-blue-100">
              Sistema integrado para processos trabalhistas e jurídicos da empresa
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            {user?.role === 'admin' && (
              <Button 
                onClick={() => { setSelectedCase(null); setIsModalOpen(true); }}
                className="bg-white text-blue-600 hover:bg-blue-50 font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Processo
              </Button>
            )}
            <Button 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-600 bg-blue-600 hover:bg-blue-50"
              onClick={() => {
                if (!cases || cases.length === 0) {
                  toast({
                    title: "Nenhum dado para exportar",
                    description: "Não há processos para exportar no momento.",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Exportar para CSV
                const csvContent = cases.map(c => 
                  `"${c.clientName || ''}","${c.processNumber || ''}","${c.description || ''}","${c.status || ''}","${c.dueDate ? new Date(c.dueDate).toLocaleDateString('pt-BR') : ''}"`
                ).join('\n');
                const blob = new Blob([`Nome,Processo,Descrição,Status,Prazo\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `processos_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                toast({
                  title: "Exportação concluída",
                  description: `${cases.length} processos exportados com sucesso.`,
                });
              }}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros Avançados */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Filter className="mr-2 h-4 w-4" />
            Filtros Avançados de Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Primeira linha de filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Nome do Funcionário</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: CÉLIA MARIA, CRISTINA..."
                    value={nomeFilter}
                    onChange={(e) => setNomeFilter(e.target.value)}
                    className="border-gray-300 flex-1"
                  />
                  <EmployeeSearchModal
                    onSelectEmployee={(employee) => {
                      setMatriculaFilter(employee.codigo);
                      setNomeFilter(employee.nomeCompleto);
                    }}
                    trigger={
                      <Button variant="outline" size="sm" className="px-3">
                        <Users className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Processo</label>
                <Input
                  placeholder="Ex: 1500258, 217584..."
                  value={matriculaFilter}
                  onChange={(e) => setMatriculaFilter(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-gray-300">
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">Buscar Processo</label>
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-300"
                />
              </div>
            </div>

            {/* Segunda linha - Filtros de data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Data de - Início</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Data até - Final</label>
                <Input
                  type="date"
                  value={dateFilterTo}
                  onChange={(e) => setDateFilterTo(e.target.value)}
                  className="border-gray-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Ações</label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchTerm('');
                    setDateFilter('');
                    setDateFilterTo('');
                    setMatriculaFilter('');
                    setNomeFilter('');
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>

            {/* Terceira linha - Estatísticas dos filtros */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-600">{filteredCases.length}</div>
                <div className="text-xs text-blue-600">Resultados</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-green-600">{completedCases.length}</div>
                <div className="text-xs text-green-600">Concluídos</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-orange-600">{pendingCases.length}</div>
                <div className="text-xs text-orange-600">Pendentes</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-red-600">{overdueCases.length}</div>
                <div className="text-xs text-red-600">Atrasados</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Processos */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
                <TabsTrigger 
                  value="pending" 
                  className="flex items-center space-x-2 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800"
                >
                  <Clock className="w-4 h-4" />
                  <span>Pendentes ({pendingCases.length})</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="completed"
                  className="flex items-center space-x-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Concluídos ({completedCases.length})</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="overdue"
                  className="flex items-center space-x-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-800"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Atrasados ({overdueCases.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="p-0 m-0">
              {pendingCases.length > 0 ? (
                renderCaseTable(pendingCases, true)
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <CheckCircle className="mx-auto h-16 w-16 text-green-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum processo pendente</h3>
                  <p>Todos os processos estão concluídos ou não há processos cadastrados.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="p-0 m-0">
              {completedCases.length > 0 ? (
                renderCaseTable(completedCases, false)
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Clock className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum processo concluído</h3>
                  <p>Ainda não há processos finalizados no sistema.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overdue" className="p-0 m-0">
              {overdueCases.length > 0 ? (
                renderCaseTable(overdueCases, true)
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <Calendar className="mx-auto h-16 w-16 text-green-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum processo atrasado</h3>
                  <p>Todos os prazos estão em dia. Excelente trabalho!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal */}
      <NewCaseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCase(null);
        }}
        onSubmit={selectedCase ? handleUpdateCase : handleCreateCase}
        isSubmitting={createCaseMutation.isPending || updateCaseMutation.isPending}
        caseData={selectedCase}
      />

      <ConfirmStatusDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        onConfirm={() => {
          if (confirmDialog.caseData) {
            updateStatusMutation.mutate({ 
              id: confirmDialog.caseData.id, 
              status: confirmDialog.newStatus 
            });
            setConfirmDialog({ open: false, caseData: null, newStatus: '' });
          }
        }}
        currentStatus={confirmDialog.caseData?.status || ''}
        newStatus={confirmDialog.newStatus}
        processNumber={confirmDialog.caseData?.processNumber || ''}
        clientName={confirmDialog.caseData?.clientName || ''}
      />
    </div>
  );
}