// server/storage.ts
import crypto from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, pool } from "./db";
import {
  users,
  sessions,
  employees,
  cases,
  activityLog,
  dashboardLayouts,
} from "@shared/schema";

type Maybe<T> = T | null | undefined;

export const storage = {
  /* ========== USERS ========== */

  async getUser(id: string) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async getUserByUsername(username: string) {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return rows[0] ?? null;
  },

  async getUserByEmail(email: string) {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  },

  async createUser(data: {
    email?: Maybe<string>;
    username: string;
    password: string;
    firstName?: Maybe<string>;
    lastName?: Maybe<string>;
    role?: Maybe<string>;
    permissions?: Maybe<string>;
  }) {
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(users)
      .values({
        id,
        email: data.email ?? null,
        username: data.username,
        password: data.password,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        role: data.role ?? "user",
        permissions: data.permissions ?? null,
      })
      .returning();
    return row;
  },

  async updateUser(
    id: string,
    patch: Partial<{
      email: string | null;
      username: string;
      password: string;
      firstName: string | null;
      lastName: string | null;
      role: string | null;
      permissions: string | null;
    }>
  ) {
    const [row] = await db.update(users).set(patch as any).where(eq(users.id, id)).returning();
    return row;
  },

  async deleteUser(id: string) {
    await db.delete(users).where(eq(users.id, id));
  },

  /* ========== CASES ========== */

  async getCases(params?: { status?: string; search?: string }) {
    const whereParts: any[] = [];

    if (params?.status) {
      whereParts.push(eq(cases.status, params.status));
    }

    if (params?.search && params.search.trim() !== "") {
      const like = `%${params.search.toLowerCase()}%`;
      whereParts.push(
        sql`LOWER(${cases.clientName}) like ${like} OR LOWER(${cases.processNumber}) like ${like}`
      );
    }

    const where = whereParts.length
      ? whereParts.length === 1
        ? whereParts[0]
        : and(...whereParts)
      : undefined;

    const rows = await db
      .select()
      .from(cases)
      .where(where as any)
      .orderBy(desc(cases.updatedAt), desc(cases.createdAt), asc(cases.clientName));

    return rows;
  },

  async getCaseById(id: string) {
    const rows = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async createCase(data: any) {
    const id = crypto.randomUUID();

    const toInsert: any = {
      id,
      employeeId: data.employeeId ?? null,
      clientName: data.clientName ?? null,
      processType: data.processType ?? null,
      processNumber: data.processNumber ?? null,
      description: data.description ?? null,
      dueDate: data.dueDate ?? null,
      hearingDate: data.hearingDate ?? null,
      startDate: data.startDate ?? null,
      observacoes: data.observacoes ?? null,
      companyId: data.companyId ?? 1,
      status: data.status ?? "open",
      archived: data.archived ?? false,
      deleted: data.deleted ?? false,
    };

    const [row] = await db.insert(cases).values(toInsert).returning();
    return row;
  },

  async updateCase(id: string, patch: any) {
    const toSet: any = {
      ...patch,
      updatedAt: new Date(),
    };
    const [row] = await db.update(cases).set(toSet).where(eq(cases.id, id)).returning();
    return row;
  },

  async updateCaseStatus(
    id: string,
    status: string,
    _completedDate?: Date | null,
    _dataEntrega?: Date | null
  ) {
    const [row] = await db
      .update(cases)
      .set({ status, updatedAt: new Date() } as any)
      .where(eq(cases.id, id))
      .returning();
    return row;
  },

  async deleteCase(id: string) {
    await db.delete(cases).where(eq(cases.id, id));
  },

  async getCaseStats() {
    const result = await pool.query<{
      status: string;
      count: string;
    }>(`select status, count(*)::int as count from public.cases group by status`);
    const byStatus = Object.fromEntries(result.rows.map((r) => [r.status || "unknown", Number(r.count)]));
    const total = Object.values(byStatus).reduce((a: number, b: any) => a + Number(b), 0);
    return { total, byStatus };
  },

  /* ========== DASHBOARD LAYOUTS ========== */

  async getDashboardLayout(userId: string) {
    const rows = await db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.userId, userId), eq(dashboardLayouts.layoutKey, "default")))
      .limit(1);
    if (rows[0]) return rows[0];
    return {
      id: "default",
      userId,
      layoutKey: "default",
      layout: { widgets: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  async saveDashboardLayout(userId: string, layout: any, widgets?: any[]) {
    const current = await this.getDashboardLayout(userId);
    const data = {
      userId,
      layoutKey: "default",
      layout: layout ?? { widgets: widgets ?? [] },
      updatedAt: new Date(),
    } as any;

    let row;
    if ((current as any)?.id && (current as any).id !== "default") {
      [row] = await db
        .update(dashboardLayouts)
        .set(data)
        .where(eq(dashboardLayouts.id, (current as any).id))
        .returning();
    } else {
      const id = crypto.randomUUID();
      [row] = await db
        .insert(dashboardLayouts)
        .values({ id, ...data, createdAt: new Date() })
        .returning();
    }
    return row;
  },

  /* ========== ACTIVITY LOGS ========== */

  async logActivity(entry: {
    userId: Maybe<string>;
    action: string;
    resourceType: string;
    resourceId: string;
    description: string;
    ipAddress?: Maybe<string>;
    userAgent?: Maybe<string>;
    metadata?: Maybe<string>;
  }) {
    const id = crypto.randomUUID();
    const details =
      entry.metadata && typeof entry.metadata === "string"
        ? (() => {
            try {
              return JSON.parse(entry.metadata);
            } catch {
              return { description: entry.description, metadata: entry.metadata };
            }
          })()
        : { description: entry.description };

    await db.insert(activityLog).values({
      id,
      actorId: entry.userId ?? null,
      action: entry.action,
      entity: entry.resourceType,
      entityId: entry.resourceId,
      details: details as any,
    } as any);
    return id;
  },

  // >>>>>>> ENRIQUECIDO (com actor e description como string) <<<<<<<
  async getActivityLogs(params: {
    action?: string;
    date?: string;
    search?: string;
    limit?: number;
    processOnly?: boolean;
  }) {
    const limit = params.limit && params.limit > 0 ? params.limit : 200;

    const filters: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (params.action) {
      filters.push(`l.action = $${i++}`);
      values.push(params.action);
    }
    if (params.processOnly) {
      filters.push(`l.entity = 'CASE'`);
    }
    if (params.search && params.search.trim() !== "") {
      filters.push(`(LOWER(l.entity) LIKE $${i} OR LOWER(l.action) LIKE $${i})`);
      values.push(`%${params.search.toLowerCase()}%`);
      i++;
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const q = `
      SELECT
        l.id,
        l.entity,
        l.entity_id,
        l.action,
        l.details,
        l.created_at,
        l.actor_id,
        u.username,
        u.first_name,
        u.last_name
      FROM activity_log l
      LEFT JOIN users u ON u.id = l.actor_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT ${limit}
    `;

    const result = await pool.query(q, values);

    // Normaliza pra evitar objeto bruto no front (React não renderiza objetos)
    return result.rows.map((r: any) => {
      let description = "";
      if (r.details && typeof r.details === "object") {
        description = r.details.description ?? JSON.stringify(r.details);
      } else if (typeof r.details === "string") {
        description = r.details;
      }
      return {
        id: r.id,
        resourceType: r.entity,
        resourceId: r.entity_id,
        action: r.action,
        description,
        createdAt: r.created_at,
        actor: {
          id: r.actor_id ?? null,
          username: r.username ?? null,
          firstName: r.first_name ?? null,
          lastName: r.last_name ?? null,
        },
      };
    });
  },
};
