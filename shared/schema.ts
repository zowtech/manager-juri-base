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

/** USERS (propriedades camelCase mapeando colunas snake_case) */
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

/** SESSIONS */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** EMPLOYEES */
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

/** CASES (processos) */
export const cases = pgTable("cases", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id"),
  clientName: text("client_name"),
  processType: text("process_type"),
  dueDate: date("due_date"),
  hearingDate: date("hearing_date"),
  notes: text("notes"),
  companyId: integer("company_id").notNull().default(1),
  status: text("status").notNull().default("open"),
  archived: boolean("archived").notNull().default(false),
  deleted: boolean("deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** ACTIVITY LOG */
export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/** DASHBOARD LAYOUTS */
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  layoutKey: text("layout_key").notNull(),
  layout: jsonb("layout").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
