import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@shared/schema";
import { Shield, Eye, Edit } from "lucide-react";

const userSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório").optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  firstName: z.string().optional().or(z.literal("")),
  lastName: z.string().optional().or(z.literal("")),
  password: z.string().optional().or(z.literal("")),
  role: z.enum(["admin", "editor", "viewer"]),
  permissions: z.object({
    matricula: z.object({
      view: z.boolean().optional().default(false),
      edit: z.boolean().optional().default(false),
    }).optional(),
    nome: z.object({
      view: z.boolean().optional().default(false),
      edit: z.boolean().optional().default(false),
    }).optional(),
    processo: z.object({
      view: z.boolean().optional().default(false),
      edit: z.boolean().optional().default(false),
    }).optional(),
    prazoEntrega: z.object({
      view: z.boolean().optional().default(false),
      edit: z.boolean().optional().default(false),
    }).optional(),
    audiencia: z.object({
      view: z.boolean().optional().default(false),
      edit: z.boolean().optional().default(false),
    }).optional(),
    status: z.object({
      view: z.boolean().optional().default(false),
      edit: z.boolean().optional().default(false),
    }).optional(),
    canCreateCases: z.boolean().optional().default(false),
    canDeleteCases: z.boolean().optional().default(false),
  }).optional(),
});

type UserForm = z.infer<typeof userSchema>;

interface UserModalProps {
  user?: User | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

const defaultPermissions = {
  matricula: { view: false, edit: false },
  nome: { view: false, edit: false },
  processo: { view: false, edit: false },
  prazoEntrega: { view: false, edit: false },
  audiencia: { view: false, edit: false },
  status: { view: false, edit: false },
  canCreateCases: false,
  canDeleteCases: false,
  pages: {
    dashboard: false,
    cases: false,
    activityLog: false,
    users: false
  }
};

export default function UserModal({ user, onSubmit, onClose, isSubmitting }: UserModalProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      password: "",
      role: (user?.role as "admin" | "editor" | "viewer") || "viewer",
      permissions: (user as any)?.permissions || defaultPermissions,
    },
  });

  const handleSubmit = (values: UserForm) => {
    const submitData = {
      ...values,
      ...(values.password ? { password: values.password } : {}),
    };
    onSubmit(submitData);
  };

  const setRolePresets = (role: string) => {
    let permissions = defaultPermissions;
    
    if (role === "admin") {
      permissions = {
        matricula: { view: true, edit: true },
        nome: { view: true, edit: true },
        processo: { view: true, edit: true },
        prazoEntrega: { view: true, edit: true },
        audiencia: { view: true, edit: true },
        status: { view: true, edit: true },
        canCreateCases: true,
        canDeleteCases: true,
        pages: {
          dashboard: true,
          cases: true,
          activityLog: true,
          users: true
        }
      };
    } else if (role === "editor") {
      permissions = {
        matricula: { view: true, edit: true },
        nome: { view: true, edit: true },
        processo: { view: true, edit: true },
        prazoEntrega: { view: true, edit: true },
        audiencia: { view: true, edit: true },
        status: { view: true, edit: false },
        canCreateCases: true,
        canDeleteCases: false,
        pages: {
          dashboard: true,
          cases: true,
          activityLog: false,
          users: false
        }
      };
    } else if (role === "viewer") {
      permissions = {
        matricula: { view: true, edit: false },
        nome: { view: true, edit: false },
        processo: { view: true, edit: false },
        prazoEntrega: { view: true, edit: false },
        audiencia: { view: true, edit: false },
        status: { view: true, edit: false },
        canCreateCases: false,
        canDeleteCases: false,
        pages: {
          dashboard: true,
          cases: true,
          activityLog: false,
          users: false
        }
      };
    }
    
    form.setValue("permissions", permissions);
  };

  const fieldLabels = {
    matricula: "Matrícula",
    nome: "Nome",
    processo: "Processo",
    prazoEntrega: "Prazo de Entrega",
    audiencia: "Audiência",
    status: "Status",
    observacao: "Observação",
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Dados Básicos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dados Básicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de Usuário (Opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{user ? "Nova Senha (Opcional - deixe em branco para manter)" : "Senha (Opcional)"}</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Papel e Permissões */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Shield className="mr-2 h-4 w-4" />
                  Papel e Permissões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Papel do Usuário</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setRolePresets(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrador - Acesso total</SelectItem>
                          <SelectItem value="editor">Editor - Pode editar mas não excluir</SelectItem>
                          <SelectItem value="viewer">Visualizador - Apenas visualização</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Permissões por Campo */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Permissões por Campo</h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(fieldLabels).map(([field, label]) => (
                      <div key={field} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-sm">{label}</span>
                        <div className="flex items-center space-x-4">
                          <FormField
                            control={form.control}
                            name={`permissions.${field}.view` as any}
                            render={({ field: checkboxField }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={checkboxField.value}
                                    onCheckedChange={checkboxField.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs flex items-center">
                                  <Eye className="mr-1 h-3 w-3" />
                                  Ver
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`permissions.${field}.edit` as any}
                            render={({ field: checkboxField }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={checkboxField.value}
                                    onCheckedChange={checkboxField.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs flex items-center">
                                  <Edit className="mr-1 h-3 w-3" />
                                  Editar
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Permissões Gerais - Opcionais */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-sm">Permissões Gerais (Opcional)</h4>
                    <p className="text-xs text-gray-500 mb-3">Deixe desmarcado para não conceder essas permissões</p>
                    
                    <FormField
                      control={form.control}
                      name="permissions.canCreateCases"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Pode criar novos processos</FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="permissions.canDeleteCases"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm">Pode excluir processos</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Controle de Acesso às Páginas */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium text-sm">Acesso às Páginas</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={(form.watch("permissions") as any)?.pages?.dashboard ?? true}
                          onCheckedChange={(checked) => {
                            const currentPermissions = form.getValues("permissions") as any;
                            form.setValue("permissions", {
                              ...currentPermissions,
                              pages: {
                                ...currentPermissions?.pages,
                                dashboard: !!checked
                              }
                            });
                          }}
                        />
                        <Label className="text-sm">Dashboard</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={(form.watch("permissions") as any)?.pages?.cases ?? true}
                          onCheckedChange={(checked) => {
                            const currentPermissions = form.getValues("permissions") as any;
                            form.setValue("permissions", {
                              ...currentPermissions,
                              pages: {
                                ...currentPermissions?.pages,
                                cases: !!checked
                              }
                            });
                          }}
                        />
                        <Label className="text-sm">Processos</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={(form.watch("permissions") as any)?.pages?.activityLog ?? false}
                          onCheckedChange={(checked) => {
                            const currentPermissions = form.getValues("permissions") as any;
                            form.setValue("permissions", {
                              ...currentPermissions,
                              pages: {
                                ...currentPermissions?.pages,
                                activityLog: !!checked
                              }
                            });
                          }}
                        />
                        <Label className="text-sm">Log de Atividades</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={(form.watch("permissions") as any)?.pages?.users ?? false}
                          onCheckedChange={(checked) => {
                            const currentPermissions = form.getValues("permissions") as any;
                            form.setValue("permissions", {
                              ...currentPermissions,
                              pages: {
                                ...currentPermissions?.pages,
                                users: !!checked
                              }
                            });
                          }}
                        />
                        <Label className="text-sm">Usuários</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : (user ? "Salvar" : "Criar")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}