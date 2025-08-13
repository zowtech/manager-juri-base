import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  text,
  int,
  boolean,
  date,
  decimal,
  timestamp,
  json,
  index,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User storage table
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).unique(),
  username: varchar("username", { length: 255 }).unique(),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 50 }).notNull().default("viewer"), // admin, editor, or viewer
  permissions: json("permissions").default({
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
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee table - based on Excel schema
export const employees = mysqlTable("employees", {
  id: int("id").primaryKey().autoincrement(),
  empresa: varchar("empresa", { length: 10 }), // Company code (2, 33, 55, etc.)
  nome: varchar("nome", { length: 255 }),
  matricula: varchar("matricula", { length: 50 }),
  rg: varchar("rg", { length: 20 }),
  pis: varchar("pis", { length: 20 }),
  dataAdmissao: date("data_admissao"),
  dataDemissao: date("data_demissao"),
  salario: decimal("salario", { precision: 10, scale: 2 }),
  cargo: varchar("cargo", { length: 255 }),
  centroCusto: varchar("centro_custo", { length: 255 }),
  departamento: varchar("departamento", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("ativo"), // ativo, inativo, deletado
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legal cases table
export const cases = mysqlTable("cases", {
  id: int("id").primaryKey().autoincrement(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  employeeId: int("employee_id"),
  processNumber: varchar("process_number", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("novo"), // novo, pendente, concluido, atrasado
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  dataAudiencia: timestamp("data_audiencia"), // Data da audiência
  completedDate: timestamp("completed_date"),
  dataEntrega: timestamp("data_entrega"), // Data automática quando status vira "concluido"
  matricula: varchar("matricula", { length: 50 }), // Matrícula do funcionário relacionado
  tipoProcesso: varchar("tipo_processo", { length: 255 }), // trabalhista, rescisao_indireta, dano_moral, etc
  documentosSolicitados: json("documentos_solicitados"), // lista de documentos necessários
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity log table
export const activityLog = mysqlTable("activity_log", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id"),
  action: varchar("action", { length: 255 }),
  description: text("description"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dashboard layouts for user customization
export const dashboardLayouts = mysqlTable("dashboard_layouts", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id"),
  layout: json("layout"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLog),
  dashboardLayouts: many(dashboardLayouts),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  cases: many(cases),
}));

export const casesRelations = relations(cases, ({ one }) => ({
  employee: one(employees, {
    fields: [cases.employeeId],
    references: [employees.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

export const dashboardLayoutsRelations = relations(dashboardLayouts, ({ one }) => ({
  user: one(users, {
    fields: [dashboardLayouts.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export const insertDashboardLayoutSchema = createInsertSchema(dashboardLayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = z.infer<typeof insertUserSchema>;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = z.infer<typeof insertEmployeeSchema>;

export type Case = typeof cases.$inferSelect;
export type NewCase = z.infer<typeof insertCaseSchema>;

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = z.infer<typeof insertActivityLogSchema>;

export type DashboardLayout = typeof dashboardLayouts.$inferSelect;
export type NewDashboardLayout = z.infer<typeof insertDashboardLayoutSchema>;