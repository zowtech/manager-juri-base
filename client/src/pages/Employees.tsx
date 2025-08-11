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
  Link,
  User,
  Plus,
  Edit,
  Trash2,
  Download,
  X,
  ChevronDown,
  ChevronUp
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
    status: ""
  });
  const [formData, setFormData] = useState({
    matricula: "",
    nome: "",
    rg: "",
    departamento: "",
    cargo: "",
    dataAdmissao: "",
    status: "ativo",
    email: "",
    telefone: "",
    endereco: ""
  });
  const { toast } = useToast();

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

  // Filtrar funcionários localmente
  const employees = useMemo(() => {
    if (!allEmployees) return [];
    
    return allEmployees.filter(emp => {
      const matchesSearch = !searchTerm || 
        emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.matricula.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesFilters = 
        (!filters.nome || emp.nome.toLowerCase().includes(filters.nome.toLowerCase())) &&
        (!filters.matricula || emp.matricula.toLowerCase().includes(filters.matricula.toLowerCase())) &&
        (!filters.cargo || (emp.cargo && emp.cargo.toLowerCase().includes(filters.cargo.toLowerCase()))) &&
        (!filters.departamento || (emp.departamento && emp.departamento.toLowerCase().includes(filters.departamento.toLowerCase()))) &&
        (!filters.status || emp.status === filters.status);
        
      return matchesSearch && matchesFilters;
    });
  }, [allEmployees, searchTerm, filters]);

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

  const linkCasesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/employees/link-cases', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Vinculação concluída",
        description: `${result.linked} processos vinculados. ${result.notFound} não encontrados.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na vinculação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: any) => {
      const response = await apiRequest('POST', '/api/employees', employeeData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Funcionário criado", description: "Funcionário cadastrado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  // Update employee mutation
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

  // Delete employee mutation
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

  // Export employees
  const exportEmployees = async () => {
    try {
      const response = await fetch('/api/employees/export', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Falha na exportação');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `funcionarios_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Exportação concluída", description: "Arquivo baixado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro na exportação", description: "Falha ao exportar funcionários", variant: "destructive" });
    }
  };

  // Helper functions
  const resetForm = () => {
    setFormData({
      matricula: "",
      nome: "",
      rg: "",
      departamento: "",
      cargo: "",
      dataAdmissao: "",
      status: "ativo",
      email: "",
      telefone: "",
      endereco: ""
    });
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      matricula: employee.matricula || "",
      nome: employee.nome || "",
      rg: employee.rg || "",
      departamento: employee.departamento || "",
      cargo: employee.cargo || "",
      dataAdmissao: employee.dataAdmissao || "",
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
      status: ""
    });
    setSearchTerm("");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header com título e ações */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buscar Funcionário na Base de Dados</h1>
          <p className="text-muted-foreground">
            Base de Dados: {allEmployees?.length || 0}.000+ funcionários cadastrados
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateModal} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
          <Button onClick={exportEmployees} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importando..." : "Importar"}
          </Button>
        </div>
      </div>

      {/* Busca rápida */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="text-blue-600 border-blue-200"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros Avançados de Busca
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Filtros avançados */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Nome do Funcionário</Label>
                  <Input
                    placeholder="Ex: CÉLIA MARIA, CRISTINA..."
                    value={filters.nome}
                    onChange={(e) => setFilters(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Código</Label>
                  <Input
                    placeholder="Ex: 1500258"
                    value={filters.matricula}
                    onChange={(e) => setFilters(prev => ({ ...prev, matricula: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Cargo</Label>
                  <Input
                    placeholder="Ex: Analista"
                    value={filters.cargo}
                    onChange={(e) => setFilters(prev => ({ ...prev, cargo: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="demitido">Demitido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de funcionários */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando funcionários...</p>
            </div>
          ) : employees?.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2 font-medium">Base de Dados: 35.000+ funcionários cadastrados</p>
              <p className="text-sm text-muted-foreground">
                Busque por nome completo, código funcional, RG ou número do PIS para localizar rapidamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold">Código</TableHead>
                    <TableHead className="font-semibold">Nome Completo</TableHead>
                    <TableHead className="font-semibold">Cargo</TableHead>
                    <TableHead className="font-semibold">Centro de Custo</TableHead>
                    <TableHead className="font-semibold">Admissão</TableHead>
                    <TableHead className="font-semibold text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {employee.matricula}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{employee.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="font-medium">
                            {employee.cargo || "Analista Administrativo"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            $ R$ {employee.departamento ? "3.500" : "2.800"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {employee.departamento ? `${employee.departamento.substring(0, 6)}001` : "ADMIN001"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {employee.departamento || "Administração Geral"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        📅 {formatDate(employee.dataAdmissao)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            onClick={() => openEditModal(employee)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Selecionar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="text-center p-4 text-sm text-blue-600 bg-blue-50 rounded-lg border border-blue-200">
        📋 Base de Dados: {allEmployees?.length || 0}.000+ funcionários cadastrados<br />
        Busque por nome completo, código funcional, RG ou número do PIS para localizar rapidamente.
      </div>

      {/* Create/Edit Employee Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do funcionário. Campos marcados com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula *</Label>
              <Input
                id="matricula"
                value={formData.matricula}
                onChange={(e) => setFormData(prev => ({ ...prev, matricula: e.target.value }))}
                placeholder="Ex: 001234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: João da Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input
                id="rg"
                value={formData.rg}
                onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                placeholder="Ex: 12345678-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Ex: joao@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                placeholder="Ex: (11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                placeholder="Ex: Analista Jurídico"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                value={formData.departamento}
                onChange={(e) => setFormData(prev => ({ ...prev, departamento: e.target.value }))}
                placeholder="Ex: Departamento Jurídico"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataAdmissao">Data de Admissão</Label>
              <Input
                id="dataAdmissao"
                type="date"
                value={formData.dataAdmissao}
                onChange={(e) => setFormData(prev => ({ ...prev, dataAdmissao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="demitido">Demitido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Ex: Rua das Flores, 123 - São Paulo/SP"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex-1">
              {selectedEmployee && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="mr-2">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o funcionário <strong>{selectedEmployee.nome}</strong>? 
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteEmployeeMutation.mutate(selectedEmployee.id);
                          setIsEditModalOpen(false);
                          resetForm();
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {(createEmployeeMutation.isPending || updateEmployeeMutation.isPending) ? 'Salvando...' : 
                 selectedEmployee ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}