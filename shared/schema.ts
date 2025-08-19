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

/* ============================================================
   DRIZZLE TABLES
   ============================================================ */

// USERS -------------------------------------------------------
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"), // pode ser null
  username: text("username").notNull(),
  password: text("password").notNull(),

  // mapeia para colunas snake_case
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user"),

  // AGORA JSONB (não text)
  permissions: jsonb("permissions").$type<Record<string, unknown>>().default({}),

  profileImageUrl: text("profile_image_url"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// SESSIONs (se usar connect-pg-simple ele cria tabela própria "session")
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// EMPLOYEES ---------------------------------------------------
export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  companyId: integer("company_id").notNull().default(1),
  name: text("name").notNull(),
  registration: text("registration").notNull(), // matricula
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

// CASES -------------------------------------------------------
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

  // padroniza com o que o front usa: 'novo' | 'pendente' | 'concluido' | 'atrasado'
  status: text("status").notNull().default("novo"),

  archived: boolean("archived").notNull().default(false),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// ACTIVITY LOG ------------------------------------------------
export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// DASHBOARD LAYOUTS ------------------------------------------
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  layoutKey: text("layout_key").notNull(),
  layout: jsonb("layout").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ============================================================
   ZOD SCHEMAS (inputs de API)
   ============================================================ */

// --- helpers de datas: aceita string|Date e transforma em Date|undefined ---
const dateInput = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  });

// permissions aceita:
//  - objeto { ... } -> usa direto
//  - string JSON -> JSON.parse
//  - null/undefined -> {}
export const permissionsSchema = z
  .union([
    z.record(z.any()),
    z
      .string()
      .transform((s) => {
        try {
          const parsed = JSON.parse(s);
          return typeof parsed === "object" && parsed !== null ? parsed : {};
        } catch {
          return {};
        }
      }),
    z.null(),
    z.undefined(),
  ])
  .transform((v) => v ?? {})
  .default({});

// role com padrão
export const roleSchema = z.enum(["admin", "user"]).default("user");

// USER CREATE
export const insertUserSchema = z.object({
  email: z.string().email().optional().nullable(),
  username: z.string().min(3, "username muito curto"),
  // password pode vir vazio no painel e o backend gerar default/criptografar
  password: z.string().min(1).optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  role: roleSchema.optional(),
  permissions: permissionsSchema,
});

// USER UPDATE
export const updateUserSchema = z.object({
  email: z.string().email().optional().nullable(),
  username: z.string().min(3).optional(),
  password: z.string().min(1).optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  role: roleSchema.optional(),
  permissions: permissionsSchema.optional(),
});

// CASE CREATE
export const insertCaseSchema = z
  .object({
    clientName: z.string().optional().nullable(),
    processNumber: z.string().optional().nullable(),
    processType: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    // usa enum do app
    status: z.enum(["novo", "pendente", "concluido", "atrasado"]).optional().default("novo"),

    dueDate: dateInput,
    hearingDate: dateInput,
    startDate: dateInput,

    observacoes: z.string().optional().nullable(),
    employeeId: z.string().optional().nullable(),
    assignedToId: z.string().optional().nullable(),
    companyId: z.number().int().optional().nullable(),
    createdById: z.string().optional().nullable(),
  })
  .passthrough();

// Tipos úteis
export type InsertUserInput = z.infer<typeof insertUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InsertCaseInput = z.infer<typeof insertCaseSchema>;
