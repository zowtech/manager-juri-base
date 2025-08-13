import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, User, Building, MapPin, Calendar, DollarSign, Plus } from "lucide-react";
import type { Employee as EmployeeType } from "@shared/schema";

interface EmployeeSearchModalProps {
  onSelectEmployee: (employee: { codigo: string; nomeCompleto: string }) => void;
  trigger?: React.ReactNode;
}

export default function EmployeeSearchModal({ onSelectEmployee, trigger }: EmployeeSearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"nome" | "codigo" | "rg" | "pis">("nome");

  // Buscar funcionários reais da API
  const { data: allEmployees, isLoading } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch(`/api/employees`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as Promise<EmployeeType[]>;
    },
  });

  // Filtrar funcionários excluindo deletados e aplicando busca
  const filteredEmployees = (allEmployees || []).filter(emp => {
    // Não mostrar funcionários deletados
    if (emp.status === 'deletado') return false;
    
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    switch (searchType) {
      case "nome":
        return emp.nome?.toLowerCase().includes(searchLower);
      case "codigo":
        return emp.matricula?.toString().toLowerCase().includes(searchLower);
      case "rg":
        return emp.rg?.toString().toLowerCase().includes(searchLower);
      case "pis":
        return emp.pis?.toString().toLowerCase().includes(searchLower);
      default:
        return true;
    }
  });

  const handleSelectEmployee = (employee: EmployeeType) => {
    onSelectEmployee({
      codigo: employee.matricula || '',
      nomeCompleto: employee.nome || ''
    });
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Buscar Funcionário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Buscar Funcionário na Base de Dados
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filtros de busca */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder={`Buscar por ${searchType === 'nome' ? 'nome' : searchType === 'codigo' ? 'código' : searchType === 'rg' ? 'RG' : 'PIS'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={searchType === "nome" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSearchType("nome")}
              >
                Nome
              </Button>
              <Button
                variant={searchType === "codigo" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSearchType("codigo")}
              >
                Código
              </Button>
              <Button
                variant={searchType === "rg" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSearchType("rg")}
              >
                RG
              </Button>
              <Button
                variant={searchType === "pis" ? "default" : "outline"} 
                size="sm"
                onClick={() => setSearchType("pis")}
              >
                PIS
              </Button>
            </div>
          </div>

          {/* Resultados da busca */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50 sticky top-0">
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Carregando funcionários...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? "Nenhum funcionário encontrado com os critérios de busca." : "Nenhum funcionário encontrado."}
                      <br />
                      <span className="text-sm">Tente buscar por nome, código, RG ou PIS.</span>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-medium">
                        {employee.matricula}
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.nome}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{employee.cargo || "-"}</div>
                          {employee.salario && (
                            <Badge variant="outline" className="text-xs">
                              <DollarSign className="h-3 w-3 mr-1" />
                              R$ {Number(employee.salario).toLocaleString('pt-BR')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{employee.centroCusto || "-"}</div>
                          <div className="text-xs text-gray-500">{employee.departamento || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {employee.dataAdmissao ? new Date(employee.dataAdmissao).toLocaleDateString('pt-BR') : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSelectEmployee(employee)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Info sobre a base de dados */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-700 text-sm">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">Base de Dados:</span>
                  <span>{(allEmployees || []).filter(emp => emp.status !== 'deletado').length} funcionários cadastrados</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Busque por nome completo, código funcional, RG ou número do PIS para localizar rapidamente.
                </p>
              </div>
              <Button 
                onClick={() => {
                  setIsOpen(false);
                  // Navegar para página de funcionários para criar novo
                  window.location.href = '/employees';
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Novo
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}