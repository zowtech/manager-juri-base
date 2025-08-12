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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmployeeSelector from "@/components/EmployeeSelector";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CaseWithRelations } from "@shared/schema";
import * as React from "react";

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
  caseData?: CaseWithRelations | null;
}

// NOVO SCHEMA CONFORME SOLICITAÇÃO DO USUÁRIO
const formSchema = z.object({
  matricula: z.string().min(1, "Matrícula é obrigatória"),
  clientName: z.string().min(1, "Nome do cliente/funcionário é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória (separar diferentes processos por vírgula)"),
  dueDate: z.string().optional(),
  audienceDate: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['novo', 'andamento', 'concluido', 'pendente']).default('novo'),
});

type FormSchema = z.infer<typeof formSchema>;

export default function NewCaseModal({ isOpen, onClose, onSubmit, isSubmitting, caseData }: NewCaseModalProps) {
  const [selectedEmployee, setSelectedEmployee] = React.useState<{ matricula: string; nome: string } | null>(null);
  
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      matricula: "",
      clientName: "",
      description: "",
      dueDate: "",
      audienceDate: "",
      observacoes: "",
      status: "novo",
    },
  });

  // Resetar formulário quando caseData muda (para edição)
  React.useEffect(() => {
    if (caseData) {
      form.reset({
        matricula: caseData.matricula || "",
        clientName: caseData.clientName || "",
        description: caseData.description || "",
        dueDate: caseData.dueDate ? new Date(caseData.dueDate).toISOString().split('T')[0] : "",
        audienceDate: caseData.audienceDate ? new Date(caseData.audienceDate).toISOString().split('T')[0] : "",
        observacoes: caseData.observacoes || "",
        status: (caseData.status as FormSchema['status']) || "novo",
      });
      
      // Definir funcionário selecionado se existir
      if (caseData.matricula && caseData.clientName) {
        setSelectedEmployee({
          matricula: caseData.matricula,
          nome: caseData.clientName
        });
      }
    } else {
      form.reset({
        matricula: "",
        clientName: "",
        description: "",
        dueDate: "",
        audienceDate: "",
        observacoes: "",
        status: "novo",
      });
      setSelectedEmployee(null);
    }
  }, [caseData, form]);

  // Sincronizar seleção de funcionário com o formulário
  React.useEffect(() => {
    if (selectedEmployee) {
      form.setValue('matricula', selectedEmployee.matricula);
      form.setValue('clientName', selectedEmployee.nome);
    }
  }, [selectedEmployee, form]);

  const handleSubmit = (data: FormSchema) => {
    const submitData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      audienceDate: data.audienceDate ? new Date(data.audienceDate) : null,
    };
    onSubmit(submitData);
  };

  const handleClose = () => {
    form.reset();
    setSelectedEmployee(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {caseData ? "Editar Processo" : "Novo Processo"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* SELETOR DE FUNCIONÁRIO POR MATRÍCULA */}
            <FormField
              control={form.control}
              name="matricula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcionário (Matrícula)</FormLabel>
                  <FormControl>
                    <EmployeeSelector
                      value={selectedEmployee}
                      onSelect={(employee) => {
                        setSelectedEmployee(employee);
                      }}
                      placeholder="Busque por matrícula ou nome do funcionário..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* NOME DO CLIENTE/FUNCIONÁRIO (preenchido automaticamente) */}
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente/Funcionário</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Nome será preenchido automaticamente ao selecionar funcionário"
                      readOnly={!!selectedEmployee}
                      className={selectedEmployee ? "bg-gray-50" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DESCRIÇÃO DOS PROCESSOS (separados por vírgula) */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição dos Processos</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Descreva os processos separando por vírgula. Ex: Horas Extras, Assédio Moral, Demissão sem Justa Causa"
                      rows={4}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500">
                    💡 Separe diferentes tipos de processo por vírgula para analytics automático
                  </p>
                </FormItem>
              )}
            />

            {/* DATAS - PRAZO E AUDIÊNCIA */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo de Entrega</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Data da Audiência</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* OBSERVAÇÕES */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Observações adicionais sobre o caso..."
                      rows={3}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* STATUS (apenas para edição) */}
            {caseData && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="andamento">Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : (caseData ? "Atualizar" : "Criar Processo")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}