import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileSpreadsheet, Upload, CheckCircle, AlertTriangle, Users, Calendar } from "lucide-react";

interface ImportStats {
  total: number;
  concluidos: number;
  comFuncionario: number;
  semFuncionario: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  employeeNotFound: number;
  employeeNotFoundList: Array<{ clientName: string; processNumber: string }>;
  message: string;
}

export default function ImportCases2024Modal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Buscar estatísticas atuais dos processos 2024
  const { data: stats, isLoading: statsLoading } = useQuery<ImportStats>({
    queryKey: ["/api/cases/stats-2024"],
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cases/import-2024");
      return await response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases/stats-2024"] });
      
      if (result.success) {
        toast({
          title: "Importação Concluída",
          description: result.message,
        });
      } else {
        toast({
          title: "Erro na Importação",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao importar processos de 2024",
        variant: "destructive",
      });
      console.error("Import error:", error);
    },
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5 text-blue-600" />
            Importar Processos de 2024
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estatísticas atuais */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Situação Atual dos Processos 2024
            </h3>
            {statsLoading ? (
              <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats?.total || 0}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats?.concluidos || 0}</div>
                    <div className="text-sm text-gray-600">Concluídos</div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats?.comFuncionario || 0}</div>
                    <div className="text-sm text-gray-600">Vinculados</div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats?.semFuncionario || 0}</div>
                    <div className="text-sm text-gray-600">Sem Vínculo</div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          <Separator />

          {/* Informações sobre a importação */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Sobre a Importação</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Arquivo: processos 2024_1753977488884.xlsx</li>
              <li>• Total de registros na planilha: 213 processos</li>
              <li>• Todos os processos serão marcados como "concluído"</li>
              <li>• Sistema tentará vincular funcionários automaticamente</li>
              <li>• Processos duplicados serão ignorados</li>
            </ul>
          </div>

          {/* Botão de importação */}
          <div className="text-center">
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {importMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importando...
                </div>
              ) : (
                <div className="flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Processos de 2024
                </div>
              )}
            </Button>
          </div>

          {/* Resultado da importação */}
          {importResult && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center mb-3">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <h3 className={`font-semibold ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    Resultado da Importação
                  </h3>
                </div>
                
                <p className={`mb-4 ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {importResult.message}
                </p>

                {importResult.success && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {importResult.imported} Importados
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        {importResult.errors.length} Erros
                      </Badge>
                    </div>
                    <div className="text-center">
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        {importResult.employeeNotFound} Sem Funcionário
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Lista de erros */}
                {importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-800 mb-2">Erros Encontrados:</h4>
                    <div className="max-h-32 overflow-y-auto bg-red-100 p-3 rounded text-sm">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-red-700">{error}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de funcionários não encontrados */}
                {importResult.employeeNotFoundList && importResult.employeeNotFoundList.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-orange-800 mb-2">Funcionários Não Encontrados:</h4>
                    <div className="max-h-32 overflow-y-auto bg-orange-100 p-3 rounded text-sm">
                      {importResult.employeeNotFoundList.slice(0, 10).map((item, index) => (
                        <div key={index} className="text-orange-700">
                          {item.clientName} - Processo: {item.processNumber}
                        </div>
                      ))}
                      {importResult.employeeNotFoundList.length > 10 && (
                        <div className="text-orange-600 font-medium">
                          ... e mais {importResult.employeeNotFoundList.length - 10} registros
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}