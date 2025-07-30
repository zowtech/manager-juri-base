import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, User, Building, MapPin, Calendar, DollarSign } from "lucide-react";

interface Employee {
  codigo: string;          // Código do Funcionário
  numeroRG: string;        // Número do RG
  numeroPIS: string;      // Número do PIS
  dataAdmissao: string;   // Data de Admissão
  salario?: number;       // Salário
  descricaoCargo: string; // Descrição do Cargo
  centroCusto: string;    // Centro de Custo
  descricaoCusto?: string; // Descrição do Custo
  nomeCompleto: string;   // Nome completo do funcionário
}

interface EmployeeSearchModalProps {
  onSelectEmployee: (employee: Employee) => void;
  trigger?: React.ReactNode;
}

export default function EmployeeSearchModal({ onSelectEmployee, trigger }: EmployeeSearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"nome" | "codigo" | "rg" | "pis">("nome");

  // Simulação de funcionários baseada na estrutura da planilha
  const mockEmployees: Employee[] = [
    {
      codigo: "1500258",
      numeroRG: "12.345.678-9",
      numeroPIS: "123.45678.90-1",
      dataAdmissao: "2020-01-15",
      salario: 3500.00,
      descricaoCargo: "Analista Administrativo",
      centroCusto: "ADMIN001",
      descricaoCusto: "Administração Geral",
      nomeCompleto: "CÉLIA MARIA DE JESUS"
    },
    {
      codigo: "217584",
      numeroRG: "98.765.432-1",
      numeroPIS: "987.65432.10-9",
      dataAdmissao: "2019-06-10",
      salario: 4200.00,
      descricaoCargo: "Coordenadora de RH",
      centroCusto: "RH001",
      descricaoCusto: "Recursos Humanos",
      nomeCompleto: "CRISTINA DE SOUSA SILVEIRA"
    },
    {
      codigo: "1505827",
      numeroRG: "45.678.912-3",
      numeroPIS: "456.78912.34-5",
      dataAdmissao: "2021-03-22",
      salario: 2800.00,
      descricaoCargo: "Auxiliar Operacional",
      centroCusto: "OP001",
      descricaoCusto: "Operações",
      nomeCompleto: "LAÉRCIO SOBRINHO CARDOSO"
    }
  ];

  const filteredEmployees = mockEmployees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    switch (searchType) {
      case "nome":
        return emp.nomeCompleto.toLowerCase().includes(searchLower);
      case "codigo":
        return emp.codigo.includes(searchTerm);
      case "rg":
        return emp.numeroRG.includes(searchTerm);
      case "pis":
        return emp.numeroPIS.includes(searchTerm);
      default:
        return true;
    }
  });

  const handleSelectEmployee = (employee: Employee) => {
    onSelectEmployee(employee);
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
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.codigo} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-medium">
                      {employee.codigo}
                    </TableCell>
                    <TableCell className="font-medium">
                      {employee.nomeCompleto}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{employee.descricaoCargo}</div>
                        {employee.salario && (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            R$ {employee.salario.toLocaleString('pt-BR')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{employee.centroCusto}</div>
                        <div className="text-xs text-gray-500">{employee.descricaoCusto}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(employee.dataAdmissao).toLocaleDateString('pt-BR')}
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
                ))}
              </TableBody>
            </Table>
            
            {filteredEmployees.length === 0 && searchTerm && (
              <div className="p-8 text-center text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum funcionário encontrado com os critérios de busca.</p>
                <p className="text-sm mt-2">Tente buscar por nome, código, RG ou PIS.</p>
              </div>
            )}
          </div>

          {/* Info sobre a base de dados */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <Building className="h-4 w-4" />
              <span className="font-medium">Base de Dados:</span>
              <span>35.000+ funcionários cadastrados</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Busque por nome completo, código funcional, RG ou número do PIS para localizar rapidamente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}