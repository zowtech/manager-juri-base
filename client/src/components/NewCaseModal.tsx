import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CaseWithRelations } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import * as React from "react";

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  caseData?: CaseWithRelations | null;
}

const formSchema = z.object({
  matricula: z.string().min(1, "Matrícula é obrigatória"),
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  processType: z.string().min(1, "Tipo de processo é obrigatório"),
  dueDate: z.string().min(1, "Prazo de entrega é obrigatório"),
  audienceDate: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

export default function NewCaseModal({ isOpen, onClose, onSubmit, isSubmitting, caseData }: NewCaseModalProps) {
  const { toast } = useToast();
  const [isSearchingEmployee, setIsSearchingEmployee] = React.useState(false);
  
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      matricula: caseData?.matricula || "",
      clientName: caseData?.clientName || "",
      processType: caseData?.processNumber || "",
      dueDate: caseData?.dueDate ? new Date(caseData.dueDate).toISOString().split('T')[0] : "",
      audienceDate: caseData?.dataAudiencia ? new Date(caseData.dataAudiencia).toISOString().split('T')[0] : "",
      observacoes: caseData?.observacoes || "",
    },
  });

  // Query para buscar funcionários
  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch('/api/employees', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    },
  });

  // Função para buscar funcionário por matrícula
  const handleMatriculaSearch = React.useCallback(async (matricula: string) => {
    if (!matricula || matricula.length < 3) return;
    
    setIsSearchingEmployee(true);
    try {
      const employee = employees?.find((emp: any) => 
        emp.matricula && emp.matricula.toLowerCase().includes(matricula.toLowerCase())
      );
      
      if (employee) {
        form.setValue('clientName', employee.nome || '');
        toast({
          title: "Funcionário encontrado",
          description: `${employee.nome} - Matrícula: ${employee.matricula}`,
        });
      } else {
        toast({
          title: "Funcionário não encontrado",
          description: "Verifique a matrícula e tente novamente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
    } finally {
      setIsSearchingEmployee(false);
    }
  }, [employees, form, toast]);

  // Watch matrícula field to trigger search
  const matriculaValue = form.watch('matricula');
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (matriculaValue && matriculaValue.length >= 3) {
        handleMatriculaSearch(matriculaValue);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [matriculaValue, handleMatriculaSearch]);

  // Resetar formulário quando caseData muda (para edição)
  React.useEffect(() => {
    if (caseData) {
      form.reset({
        matricula: (caseData as any).matricula || "",
        clientName: caseData.clientName || "",
        processType: caseData.processNumber || "",
        dueDate: caseData.dueDate ? new Date(caseData.dueDate).toISOString().split('T')[0] : "",
        audienceDate: caseData.dataAudiencia ? new Date(caseData.dataAudiencia).toISOString().split('T')[0] : "",
        observacoes: caseData.observacoes || "",
      });
    } else {
      form.reset({
        matricula: "",
        clientName: "",
        processType: "",
        dueDate: "",
        audienceDate: "",
        observacoes: "",
      });
    }
  }, [caseData, form]);

  const handleSubmit = (values: FormSchema) => {
    const submitData = {
      clientName: values.clientName,
      processNumber: values.processType, // Using processType as processNumber for backend compatibility
      description: values.processType || 'Processo Jurídico', // Required field
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      dataAudiencia: values.audienceDate ? new Date(values.audienceDate).toISOString() : null,
      observacoes: values.observacoes || '',
      matricula: values.matricula,
      status: 'novo', // Default status
      createdById: 'admin-id' // This will be overridden by the server based on authenticated user
    };
    
    console.log('🚀 Sending data to API:', submitData);
    onSubmit(submitData);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {caseData ? "Editar Processo" : "Novo Processo"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="matricula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Matrícula</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Digite a matrícula do funcionário"
                          {...field}
                          className="border-gray-300 pr-10"
                        />
                        {isSearchingEmployee && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome será preenchido automaticamente"
                        {...field}
                        className="border-gray-300 bg-gray-50"
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="processType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Tipo de Processo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Trabalhista, Rescisão Contratual, Acordo Coletivo..."
                      {...field}
                      className="border-gray-300"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Prazo de Entrega *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audienceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Data Audiência</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes adicionais: valores envolvidos, situação atual, documentos necessários..."
                      className="border-gray-300 min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Salvando...
                  </div>
                ) : (
                  caseData ? "Atualizar Processo" : "Criar Processo"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}