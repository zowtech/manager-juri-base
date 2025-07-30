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
  email: varchar("email").unique().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("viewer"), // admin, editor, or viewer
  permissions: jsonb("permissions").default(sql`'{
    "matricula": {"view": true, "edit": false},
    "nome": {"view": true, "edit": false},
    "processo": {"view": true, "edit": false},
    "prazoEntrega": {"view": true, "edit": false},
    "audiencia": {"view": true, "edit": false},
    "status": {"view": true, "edit": false},
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
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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

export type CaseWithRelations = typeof cases.$inferSelect & {
  assignedTo?: User;
  createdBy?: User;
};

export type InsertCase = z.infer<typeof insertCaseSchema>;
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
