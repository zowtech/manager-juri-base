import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  Search, 
  Users, 
  Upload, 
  Link,
  User,
  Building,
  Calendar,
  Phone,
  Mail
} from "lucide-react";
import type { Employee } from "@shared/schema";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["/api/employees", { search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await fetch(`/api/employees?${params}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as Promise<Employee[]>;
    },
  });

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // A busca é automática via useQuery
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground">
            Base de dados com {employees?.length || 0} funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importando..." : "Importar Planilha"}
          </Button>
          <Button
            onClick={() => linkCasesMutation.mutate()}
            disabled={linkCasesMutation.isPending}
            variant="outline"
          >
            <Link className="h-4 w-4 mr-2" />
            {linkCasesMutation.isPending ? "Vinculando..." : "Vincular Processos"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Buscar por nome ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando funcionários...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees?.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {employee.nome}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Mat.: {employee.matricula}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={employee.status === 'ativo' ? 'default' : 'secondary'}
                  >
                    {employee.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {employee.cargo && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.cargo}</span>
                  </div>
                )}
                {employee.departamento && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.departamento}</span>
                  </div>
                )}
                {employee.dataAdmissao && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Admissão: {formatDate(employee.dataAdmissao)}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
                {employee.telefone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.telefone}</span>
                  </div>
                )}
                {employee.rg && (
                  <div className="text-xs text-muted-foreground">
                    RG: {employee.rg}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {employees && employees.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum funcionário encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? `Nenhum resultado para "${searchTerm}"`
                : "Importe a planilha de funcionários para começar"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}