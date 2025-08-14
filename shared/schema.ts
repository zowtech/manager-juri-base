// shared/schema.ts
import {
  pgTable,
  text,
  integer,
  boolean,
  numeric,
  date,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod";

/* =========================
   DRIZZLE TABLES (snake_case no banco,
   propriedades camelCase no código)
   ========================= */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),

  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role"),
  permissions: text("permissions"),
  profileImageUrl: text("profile_image_url"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1),
  name: text("name").notNull(),
  registration: text("registration").notNull(), // matrícula
  rg: text("rg"),
  pis: text("pis"),
  admissionDate: date("admission_date"),
  terminationDate: date("termination_date"),
  salary: numeric("salary"),
  role: text("role"),
  department: text("department"),
  costCenter: text("cost_center"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const cases = pgTable("cases", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id"),
  clientName: text("client_name"),
  processType: text("process_type"),
  processNumber: text("process_number"),
  description: text("description"),
  dueDate: date("due_date"),
  hearingDate: date("hearing_date"),
  startDate: date("start_date"),
  observacoes: text("observacoes"),
  companyId: integer("company_id").notNull().default(1),
  status: text("status").notNull().default("open"),
  archived: boolean("archived").notNull().default(false),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  layoutKey: text("layout_key").notNull(),
  layout: jsonb("layout").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* =========================
   TIPOS (úteis se você precisar)
   ========================= */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type Case = typeof cases.$inferSelect;

/* =========================
   ZOD SCHEMAS (exports esperados pelo routes.ts)
   ========================= */

// Criação de usuário (tela Usuários)
export const insertUserSchema = z.object({
  email: z.string().email().optional().nullable(),
  username: z.string().min(3, "username deve ter ao menos 3 caracteres"),
  password: z.string().min(1, "password obrigatório").optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  permissions: z.union([z.string(), z.null()]).optional(),
});

// Atualização de usuário
export const updateUserSchema = z.object({
  email: z.string().email().optional().nullable(),
  username: z.string().min(3).optional(),
  password: z.string().min(1).optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  permissions: z.union([z.string(), z.null()]).optional(),
});

// Criação de caso/processo
// Deixei permissivo pra não travar seu fluxo atual;
// aceitamos string ou Date para datas e passamos adiante.
export const insertCaseSchema = z
  .object({
    clientName: z.string().optional().nullable(),
    processNumber: z.string().optional().nullable(),
    processType: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    status: z.string().optional().default("open"),
    dueDate: z.union([z.string(), z.date()]).optional().nullable(),
    hearingDate: z.union([z.string(), z.date()]).optional().nullable(),
    startDate: z.union([z.string(), z.date()]).optional().nullable(),
    observacoes: z.string().optional().nullable(),

    employeeId: z.string().optional().nullable(),
    assignedToId: z.string().optional().nullable(),
    companyId: z.number().int().optional().nullable(),
    createdById: z.string().optional().nullable(),
  })
  .passthrough(); // permite campos extras sem quebrar
