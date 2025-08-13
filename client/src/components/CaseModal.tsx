import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCaseSchema } from "@shared/schema";
import { z } from "zod";

interface CaseModalProps {
  trigger: React.ReactNode;
  caseData?: any;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
}

const formSchema = z.object({
  matricula: z.string().min(1, "Matrícula é obrigatória"),
  nome: z.string().min(1, "Nome é obrigatório"),
  processo: z.string().min(1, "Descrição do processo é obrigatória"),
  prazoEntrega: z.string().optional(),
  audiencia: z.string().optional(),
  observacao: z.string().optional(),
  status: z.string().default("novo"),
});

export default function CaseModal({ trigger, caseData, onSubmit, isSubmitting }: CaseModalProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      matricula: caseData?.matricula || "",
      nome: caseData?.nome || "",
      processo: caseData?.processo || "",
      prazoEntrega: caseData?.prazoEntrega ? new Date(caseData.prazoEntrega).toISOString().split('T')[0] : "",
      audiencia: caseData?.audiencia ? new Date(caseData.audiencia).toISOString().split('T')[0] : "",
      observacao: caseData?.observacao || "",
      status: caseData?.status || "novo",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const submitData = {
      ...values,
      prazoEntrega: values.prazoEntrega ? new Date(values.prazoEntrega) : null,
      audiencia: values.audiencia ? new Date(values.audiencia) : null,
      observacao: values.observacao || null,
    };
    onSubmit(submitData);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {caseData ? "Editar Caso" : "Novo Caso"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="matricula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matrícula</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 1500258" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="processo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Processo</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva os processos separados por vírgula (ex: TRABALHISTA, Rescisão indireta, Dano Moral)"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prazoEntrega"
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
                name="audiencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Audiência</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações adicionais sobre o processo (opcional)"
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : (caseData ? "Salvar" : "Criar")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}