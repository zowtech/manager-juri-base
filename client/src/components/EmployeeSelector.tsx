import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, X } from "lucide-react";
import { Employee } from "@shared/schema";

interface EmployeeSelectorProps {
  value?: { matricula: string; nome: string } | null;
  onSelect: (employee: { matricula: string; nome: string } | null) => void;
  placeholder?: string;
}

export default function EmployeeSelector({ value, onSelect, placeholder = "Buscar por matrícula ou nome..." }: EmployeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { search: searchTerm }],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const response = await fetch(`/api/employees?search=${encodeURIComponent(searchTerm)}&limit=10`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    },
    enabled: searchTerm.length >= 2,
  });

  const handleSelect = (employee: Employee) => {
    onSelect({
      matricula: employee.matricula,
      nome: employee.nome
    });
    setSearchTerm("");
    setShowResults(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm("");
    setShowResults(false);
  };

  // Mostrar resultados quando há busca e resultados
  useEffect(() => {
    setShowResults(searchTerm.length >= 2 && employees.length > 0);
  }, [searchTerm, employees]);

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <User className="h-4 w-4 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">{value.nome}</p>
            <p className="text-xs text-blue-600">Matrícula: {value.matricula}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="pl-10"
              onFocus={() => {
                if (searchTerm.length >= 2 && employees.length > 0) {
                  setShowResults(true);
                }
              }}
            />
          </div>

          {showResults && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-center text-gray-500">
                  Buscando funcionários...
                </div>
              ) : employees.length > 0 ? (
                employees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => handleSelect(employee)}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{employee.nome}</p>
                        <p className="text-sm text-gray-600">
                          Matrícula: {employee.matricula}
                        </p>
                        {employee.cargo && (
                          <p className="text-xs text-gray-500">{employee.cargo}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {employee.empresa && (
                          <Badge variant="outline" className="text-xs">
                            {employee.empresa}
                          </Badge>
                        )}
                        {employee.status && (
                          <Badge 
                            variant={employee.status === 'ativo' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {employee.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500">
                  Nenhum funcionário encontrado
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}