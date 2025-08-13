import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Filter,
  Upload, 
  User,
  Plus,
  Edit,
  Trash2,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Users
} from "lucide-react";
import type { Employee } from "@shared/schema";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    nome: "",
    matricula: "",
    cargo: "",
    departamento: "",
    empresa: ""
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    empresa: "2",
    nome: "",
    matricula: "",
    rg: "",
    pis: "",
    dataAdmissao: "",
    dataDemissao: "",
    salario: "",
    cargo: "",
    centroCusto: "",
    departamento: "",
    status: "ativo",
    email: "",
    telefone: "",
    endereco: ""
  });

  // Company options
  const companyOptions = [
    { value: "2", label: "2" },
    { value: "33", label: "33" },
    { value: "55", label: "55" },
    { value: "79", label: "79" },
    { value: "104", label: "104" },
    { value: "107", label: "107" },
    { value: "123", label: "123" },
    { value: "125", label: "125" },
    { value: "126", label: "126" },
    { value: "127", label: "127" },
    { value: "128", label: "128" },
    { value: "150", label: "150" }
  ];



  const { data: allEmployees, isLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch(`/api/employees`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as Promise<Employee[]>;
    },
  });

  // Filtros funcionais melhorados - excluir deletados
  const filteredEmployees = useMemo(() => {
    if (!allEmployees) return [];
    
    console.log('🔍 FILTROS DEBUG:', {
      total: allEmployees.length,
      searchTerm,
      filters,
      firstEmployee: allEmployees[0]
    });
    
    const filtered = allEmployees.filter(emp => {
      // Não mostrar funcionários deletados
      if (emp.status === 'deletado') return false;
      
      // Busca geral (deve ser mais flexível e incluir mais campos)
      const matchesSearch = !searchTerm || 
        emp.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.matricula?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.rg?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.pis?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.empresa?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.centroCusto?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        
      // Filtros específicos
      const matchesFilters = 
        (!filters.nome || emp.nome?.toLowerCase().includes(filters.nome.toLowerCase())) &&
        (!filters.matricula || emp.matricula?.toString().toLowerCase().includes(filters.matricula.toLowerCase())) &&
        (!filters.cargo || emp.cargo?.toLowerCase().includes(filters.cargo.toLowerCase())) &&
        (!filters.departamento || emp.departamento?.toLowerCase().includes(filters.departamento.toLowerCase())) &&
        (!filters.empresa || emp.empresa?.toString() === filters.empresa);
        
      const result = matchesSearch && matchesFilters;
      
      if (searchTerm && result) {
        console.log('✅ MATCH:', emp.nome, emp.matricula);
      }
      
      return result;
    });
    
    console.log('📊 FILTROS RESULTADO:', filtered.length, 'de', allEmployees.length);
    return filtered;
  }, [allEmployees, searchTerm, filters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const employees = filteredEmployees.slice(startIndex, endIndex);

  // Reset pagination when filters change
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Importar planilha
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Importação concluída",
        description: `${result.imported} funcionários importados com ${result.errors?.length || 0} erros`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Criar funcionário
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/employees', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Funcionário criado", description: "Funcionário adicionado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  // Atualizar funcionário
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PUT', `/api/employees/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Funcionário atualizado", description: "Dados salvos com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  // Deletar funcionário
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/employees/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Funcionário excluído", description: "Funcionário removido com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      empresa: "2",
      nome: "",
      matricula: "",
      rg: "",
      pis: "",
      dataAdmissao: "",
      dataDemissao: "",
      salario: "",
      cargo: "",
      centroCusto: "",
      departamento: "",
      status: "ativo",
      email: "",
      telefone: "",
      endereco: ""
    });
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      empresa: employee.empresa || "2",
      nome: employee.nome || "",
      matricula: employee.matricula || "",
      rg: employee.rg || "",
      pis: employee.pis || "",
      dataAdmissao: employee.dataAdmissao || "",
      dataDemissao: employee.dataDemissao || "",
      salario: employee.salario || "",
      cargo: employee.cargo || "",
      centroCusto: employee.centroCusto || "",
      departamento: employee.departamento || "",
      status: employee.status || "ativo",
      email: employee.email || "",
      telefone: employee.telefone || "",
      endereco: employee.endereco || ""
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = () => {
    if (selectedEmployee) {
      updateEmployeeMutation.mutate({ id: selectedEmployee.id, data: formData });
    } else {
      createEmployeeMutation.mutate(formData);
    }
  };

  const clearFilters = () => {
    setFilters({
      nome: "",
      matricula: "",
      cargo: "",
      departamento: "",
      empresa: ""
    });
    setSearchTerm("");
    resetPagination();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatSalaryDisplay = (salary: string | null) => {
    if (!salary) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(salary));
  };

  // Handle salary input change with formatting
  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove everything except numbers, comma, and period
    const cleanValue = value.replace(/[^\d,.]/g, '');
    setFormData({ ...formData, salario: cleanValue });
  };

  const uploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando funcionários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Profissional */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Gestão de Funcionários</h1>
              <p className="text-blue-100">BASE FACILITIES - Sistema Corporativo</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{filteredEmployees.length}</div>
            <div className="text-blue-100">Total de Funcionários</div>
            <div className="text-sm text-blue-200 mt-1">
              Página {currentPage} de {totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ações Principais */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Busca Global */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, matrícula, RG, cargo ou departamento..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetPagination();
                }}
                className="pl-10 h-11 text-sm"
              />
            </div>
            
            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-11"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-11"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>

              <Button
                variant="outline"
                className="h-11"
              >
                <label className="cursor-pointer flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={uploadFile}
                    className="hidden"
                    disabled={importMutation.isPending}
                  />
                </label>
              </Button>
            </div>
          </div>

          {/* Painel de Filtros Avançados */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nome</Label>
                  <Input
                    placeholder="Filtrar por nome"
                    value={filters.nome}
                    onChange={(e) => {
                      setFilters({...filters, nome: e.target.value});
                      resetPagination();
                    }}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Matrícula</Label>
                  <Input
                    placeholder="Filtrar por matrícula"
                    value={filters.matricula}
                    onChange={(e) => {
                      setFilters({...filters, matricula: e.target.value});
                      resetPagination();
                    }}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Cargo</Label>
                  <Input
                    placeholder="Filtrar por cargo"
                    value={filters.cargo}
                    onChange={(e) => {
                      setFilters({...filters, cargo: e.target.value});
                      resetPagination();
                    }}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Centro de Custo</Label>
                  <Input
                    placeholder="Filtrar por centro de custo"
                    value={filters.departamento}
                    onChange={(e) => {
                      setFilters({...filters, departamento: e.target.value});
                      resetPagination();
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Empresa</Label>
                  <Select
                    value={filters.empresa}
                    onValueChange={(value) => {
                      setFilters({...filters, empresa: value});
                      resetPagination();
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todas as empresas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as empresas</SelectItem>
                      {companyOptions.map((company) => (
                        <SelectItem key={company.value} value={company.value}>
                          {company.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Funcionários por página:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredEmployees.length)} de {filteredEmployees.length} funcionários
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    const maxVisiblePages = 5;
                    const halfRange = Math.floor(maxVisiblePages / 2);
                    return page >= currentPage - halfRange && page <= currentPage + halfRange;
                  })
                  .map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Profissional de Funcionários */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lista de Funcionários</CardTitle>
            <div className="text-sm text-gray-500">
              {employees.length} de {allEmployees?.length || 0} funcionários
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[80px] font-semibold">Empresa</TableHead>
                  <TableHead className="w-[120px] font-semibold">Matrícula</TableHead>
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">RG</TableHead>
                  <TableHead className="font-semibold">PIS</TableHead>
                  <TableHead className="font-semibold">Admissão</TableHead>
                  <TableHead className="font-semibold">Salário</TableHead>
                  <TableHead className="font-semibold">Cargo</TableHead>
                  <TableHead className="font-semibold">Centro de Custo</TableHead>
                  <TableHead className="w-[100px] font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="text-xs">
                        {employee.empresa || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {employee.matricula}
                    </TableCell>
                    <TableCell className="font-medium">
                      {employee.nome}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {employee.rg || "-"}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {employee.pis || "-"}
                    </TableCell>
                    <TableCell>
                      {formatDate(employee.dataAdmissao)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatSalaryDisplay(employee.salario)}
                    </TableCell>
                    <TableCell>
                      {employee.cargo || "-"}
                    </TableCell>
                    <TableCell>
                      {employee.centroCusto || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(employee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o funcionário <strong>{employee.nome}</strong>?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteEmployeeMutation.mutate(employee.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {employees.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum funcionário encontrado</p>
                <p className="text-sm text-gray-400">Tente ajustar os filtros ou adicionar novos funcionários</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criar/Editar Funcionário */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee ? 'Altere os dados do funcionário selecionado.' : 'Preencha os dados do novo funcionário.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            <div>
              <Label htmlFor="empresa">Empresa *</Label>
              <Select
                value={formData.empresa}
                onValueChange={(value) => setFormData({...formData, empresa: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companyOptions.map((company) => (
                    <SelectItem key={company.value} value={company.value}>
                      {company.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="mt-1"
                placeholder="Ex: Lucas Silva"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="matricula">Matrícula *</Label>
              <Input
                id="matricula"
                value={formData.matricula}
                onChange={(e) => setFormData({...formData, matricula: e.target.value})}
                className="mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg}
                onChange={(e) => setFormData({...formData, rg: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="pis">PIS</Label>
              <Input
                id="pis"
                value={formData.pis}
                onChange={(e) => setFormData({...formData, pis: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="dataAdmissao">Data Admissão</Label>
              <Input
                id="dataAdmissao"
                type="date"
                value={formData.dataAdmissao}
                onChange={(e) => setFormData({...formData, dataAdmissao: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="dataDemissao">Data Demissão</Label>
              <Input
                id="dataDemissao"
                type="date"
                value={formData.dataDemissao}
                onChange={(e) => setFormData({...formData, dataDemissao: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="salario">Salário</Label>
              <Input
                id="salario"
                value={formData.salario}
                onChange={handleSalaryChange}
                placeholder="Ex: 5000,00 ou 5000.50"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Digite apenas números, vírgula ou ponto</p>
            </div>
            
            <div>
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="centroCusto">Centro de Custo</Label>
              <Input
                id="centroCusto"
                value={formData.centroCusto}
                onChange={(e) => setFormData({...formData, centroCusto: e.target.value})}
                className="mt-1"
                placeholder="Ex: 001, 002, 003, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                value={formData.departamento}
                onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                className="mt-1"
                placeholder="Ex: Financeiro, Operações, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="demitido">Demitido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              setIsEditModalOpen(false);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
            >
              {selectedEmployee ? 'Salvar Alterações' : 'Criar Funcionário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}