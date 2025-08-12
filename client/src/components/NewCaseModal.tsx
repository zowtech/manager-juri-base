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

const formSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  processNumber: z.string().min(1, "Número do processo é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  dueDate: z.string().optional(),
  status: z.enum(['novo', 'andamento', 'concluido', 'pendente']).default('novo'),
});

type FormSchema = z.infer<typeof formSchema>;

export default function NewCaseModal({ isOpen, onClose, onSubmit, isSubmitting, caseData }: NewCaseModalProps) {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      processNumber: "",
      description: "",
      dueDate: "",
      status: "novo",
    },
  });

  // Resetar formulário quando caseData muda (para edição)
  React.useEffect(() => {
    if (caseData) {
      form.reset({
        clientName: caseData.clientName || "",
        processNumber: caseData.processNumber || "",
        description: caseData.description || "",
        dueDate: caseData.dueDate ? new Date(caseData.dueDate).toISOString().split('T')[0] : "",
        status: (caseData.status as FormSchema['status']) || "novo",
      });
    } else {
      form.reset({
        clientName: "",
        processNumber: "",
        description: "",
        dueDate: "",
        status: "novo",
      });
    }
  }, [caseData, form]);

  const handleSubmit = (values: FormSchema) => {
    const submitData = {
      ...values,
      dueDate: values.dueDate ? new Date(values.dueDate) : null,
    };
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
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Nome do Cliente/Funcionário</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: CÉLIA MARIA DE JESUS"
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
                name="processNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Número do Processo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 5000123-45.2024.5.03.0001"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Descrição do Processo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o tipo de processo, valores envolvidos, situação atual..."
                      className="border-gray-300 min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-gray-300">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Prazo de Entrega</FormLabel>
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