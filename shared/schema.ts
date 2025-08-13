import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  date,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("viewer"), // admin, editor, or viewer
  permissions: jsonb("permissions").default(sql`'{
    "matricula": {"view": true, "edit": false},
    "nome": {"view": true, "edit": false},
    "processo": {"view": true, "edit": false},
    "prazoEntrega": {"view": true, "edit": false},
    "audiencia": {"view": true, "edit": false},
    "status": {"view": true, "edit": false},
    "observacao": {"view": true, "edit": false},
    "canCreateCases": false,
    "canDeleteCases": false,
    "pages": {
      "dashboard": true,
      "cases": true,
      "activityLog": false,
      "users": false
    }
  }'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legal cases table
export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientName: varchar("client_name").notNull(),
  employeeId: varchar("employee_id").references(() => employees.id), // Link para funcionário
  processNumber: varchar("process_number").notNull(),
  description: text("description").notNull(),
  status: varchar("status").notNull().default("novo"), // novo, pendente, concluido, atrasado
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  dataEntrega: timestamp("data_entrega"), // Data automática quando status vira "concluido"
  tipoProcesso: varchar("tipo_processo"), // trabalhista, rescisao_indireta, dano_moral, etc
  documentosSolicitados: jsonb("documentos_solicitados"), // lista de documentos necessários 
  documentosAnexados: jsonb("documentos_anexados"), // lista de documentos enviados com links
  observacoes: text("observacoes"),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Nova tabela para tipos de processos
export const tiposProcesso = pgTable("tipos_processo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: varchar("nome").notNull(),
  descricao: text("descricao"),
  documentosPadrao: jsonb("documentos_padrao"), // documentos típicos para este tipo
  cor: varchar("cor").default("#3b82f6"), // cor para identificação visual
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Funcionários table - 11 colunas do Excel
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresa: varchar("empresa"), // Coluna 1: Empresa
  nome: varchar("nome").notNull(), // Coluna 2: Nome
  matricula: varchar("matricula").unique().notNull(), // Coluna 3: Matrícula
  rg: varchar("rg"), // Coluna 4: RG
  pis: varchar("pis"), // Coluna 5: PIS
  dataAdmissao: date("data_admissao"), // Coluna 6: Data Admissão
  dataDemissao: date("data_demissao"), // Coluna 7: Data Demissão
  salario: varchar("salario"), // Coluna 8: Salário
  cargo: varchar("cargo"), // Coluna 9: Cargo
  centroCusto: varchar("centro_custo"), // Coluna 10: Centro Custo
  departamento: varchar("departamento"), // Coluna 11: Departamento
  // Campos adicionais do sistema
  cpf: varchar("cpf").unique(),
  status: varchar("status").default("ativo"), // ativo, inativo, demitido
  email: varchar("email"),
  telefone: varchar("telefone"),
  endereco: text("endereco"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity log table
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(), // create, edit, delete, status_change
  resourceType: varchar("resource_type").notNull(), // case, user
  resourceId: varchar("resource_id").notNull(),
  description: text("description").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  metadata: text("metadata"), // JSON metadata for additional details
  createdAt: timestamp("created_at").defaultNow(),
});

// Dashboard layouts table - for drag-and-drop widget customization
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  layout: jsonb("layout").notNull(), // Grid layout configuration  
  widgets: jsonb("widgets").notNull(), // Widget configurations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedCases: many(cases, { relationName: "assignedTo" }),
  createdCases: many(cases, { relationName: "createdBy" }),
  activityLogs: many(activityLog),
}));

export const casesRelations = relations(cases, ({ one }) => ({
  assignedTo: one(users, {
    fields: [cases.assignedToId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  createdBy: one(users, {
    fields: [cases.createdById],
    references: [users.id],
    relationName: "createdBy",
  }),
  employee: one(employees, {
    fields: [cases.employeeId],
    references: [employees.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  cases: many(cases),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// Schemas
// User insert and update schemas - all fields optional except role
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial().extend({
  role: z.enum(["admin", "editor", "viewer"]).default("viewer")
});

export const updateUserSchema = insertUserSchema.partial();

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedDate: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Case with relations type
export type CaseWithRelations = Case & {
  assignedTo?: User | null;
  createdBy: User;
};

// Activity log with user type
export type ActivityLogWithUser = ActivityLog & {
  user: User;
};

// Employee types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Dashboard layout schemas
export const insertDashboardLayoutSchema = createInsertSchema(dashboardLayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Dashboard layout types
export type DashboardLayout = {
  id: string;
  userId: string;
  layout: any;
  widgets: any;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertDashboardLayout = z.infer<typeof insertDashboardLayoutSchema>;

// Widget types for dashboard
export interface WidgetConfig {
  id: string;
  type: 'stats' | 'chart' | 'recent-cases' | 'case-distribution' | 'activity-feed' | 'quick-actions';
  title: string;
  data?: any;
  refreshInterval?: number;
}

export interface LayoutItem {
  i: string; // widget id
  x: number;
  y: number; 
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}
