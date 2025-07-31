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
  status: varchar("status").notNull().default("novo"), // novo, andamento, concluido, pendente
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
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

// Funcionários table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matricula: varchar("matricula").unique().notNull(),
  nome: varchar("nome").notNull(),
  cpf: varchar("cpf").unique(),
  rg: varchar("rg"),
  departamento: varchar("departamento"),
  cargo: varchar("cargo"),
  dataAdmissao: date("data_admissao"),
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
  createdById: true,
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
