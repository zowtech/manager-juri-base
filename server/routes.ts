// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { sql } from "drizzle-orm";

import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db, pool } from "./db";
import { parseBRDate } from "./utils/normalize";

import {
  employees as employeesTable,
  insertUserSchema,
  updateUserSchema,
  insertCaseSchema,
} from "@shared/schema";

/* =================================================================== */
/* Helpers                                                             */
/* =================================================================== */

function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated?.()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

const scryptAsync = promisify(crypto.scrypt);

async function hashPasswordSaltHexColonHash(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

const logActivity = async (
  req: any,
  action: string,
  resourceType: string,
  resourceId: string,
  description: string,
  metadata?: any
) => {
  try {
    if (!req.user?.id) return;
    const ip =
      req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || "Unknown";
    const ua = req.get("User-Agent") || "Unknown";
    await storage.logActivity({
      userId: req.user.id,
      action,
      resourceType,
      resourceId,
      description,
      ipAddress: ip,
      userAgent: ua,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  } catch (e) {
    console.error("logActivity:", e);
  }
};

/* =================================================================== */
/* Normalização de status derivado no SQL                              */
/* =================================================================== */
/** Normaliza status no DB e deriva "atrasado" por prazo vencido (date-only). */
const STATUS_CASE_SQL = `
  CASE
    WHEN c.due_date::date < CURRENT_DATE
         AND NOT (LOWER(COALESCE(c.status,'')) IN ('concluido','completed','done','closed','finalizado','finalizada','fechado','fechada'))
      THEN 'atrasado'
    WHEN LOWER(COALESCE(c.status,'')) IN ('novo','new')
      THEN 'novo'
    WHEN LOWER(COALESCE(c.status,'')) IN ('pendente','open','pending','in progress','em aberto','aberto')
      THEN 'pendente'
    WHEN LOWER(COALESCE(c.status,'')) IN ('concluido','completed','done','closed','finalizado','finalizada','fechado','fechada')
      THEN 'concluido'
    ELSE 'outros'
  END
`;

/* =================================================================== */
/* Dashboard Stats (Atrasados por prazo vencido, alinhado ao list)     */
/* =================================================================== */

const STATS_SQL = `
  WITH flags AS (
    SELECT
      ${STATUS_CASE_SQL} AS s
    FROM public.cases c
  )
  SELECT
    SUM(CASE WHEN s = 'novo' THEN 1 ELSE 0 END)::int       AS novos,
    SUM(CASE WHEN s = 'pendente' THEN 1 ELSE 0 END)::int   AS pendentes,
    SUM(CASE WHEN s = 'concluido' THEN 1 ELSE 0 END)::int  AS concluidos,
    SUM(CASE WHEN s = 'atrasado' THEN 1 ELSE 0 END)::int   AS atrasados,
    (SELECT COUNT(*) FROM public.cases)::int                AS total
  FROM flags;
`;

async function sendStats(res: Response) {
  const { rows } = await pool.query(STATS_SQL);
  const r = rows[0] || { novos: 0, pendentes: 0, atrasados: 0, concluidos: 0, total: 0 };
  const payload = {
    total: r.total,
    // PT
    novos: r.novos,
    pendentes: r.pendentes,
    atrasados: r.atrasados,
    concluidos: r.concluidos,
    // EN aliases
    new: r.novos,
    newCount: r.novos,
    pending: r.pendentes,
    pendingCount: r.pendentes,
    open: r.pendentes,
    openCount: r.pendentes,
    overdue: r.atrasados,
    late: r.atrasados,
    completed: r.concluidos,
    done: r.concluidos,
    closed: r.concluidos,
  };
  res.set("Cache-Control", "no-store");
  res.json(payload);
}

/* =================================================================== */
/* Activity Logs - resolução dinâmica de colunas                        */
/* =================================================================== */

type ActivityCols = {
  table: string;
  id: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: string;
  createdAt?: string;
};

async function resolveActivityTableAndCols(): Promise<ActivityCols> {
  // tenta activity_log, depois activity_logs
  const candidates = ["activity_log", "activity_logs"];

  for (const t of candidates) {
    // existe?
    const rel = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
      [t]
    );
    if (rel.rowCount === 0) continue;

    // pega colunas
    const colsRes = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
      [t]
    );
    const cols = colsRes.rows.map((r: any) => String(r.column_name));

    const pick = (options: string[]): string | undefined =>
      options.find((c) => cols.includes(c));

    const cfg: ActivityCols = {
      table: `public.${t}`,
      id: pick(["id"]) || "id",
      userId: pick(["user_id", "userId", "actor_id", "created_by"]),
      action: pick(["action", "acao"]),
      resourceType: pick(["resource_type", "resourceType", "entity_type", "tipo_recurso"]),
      resourceId: pick(["resource_id", "resourceId", "entity_id", "target_id", "recurso_id"]),
      description: pick(["description", "descricao", "message", "detail", "details"]),
      ipAddress: pick(["ip_address", "ipAddress"]),
      userAgent: pick(["user_agent", "userAgent"]),
      metadata: pick(["metadata", "meta", "extra"]),
      createdAt: pick(["created_at", "createdAt", "timestamp", "created_on"]),
    };

    return cfg;
  }

  // fallback: não existe tabela conhecida
  throw new Error("Nenhuma tabela de activity log encontrada (public.activity_log[s])");
}

/* =================================================================== */
/* Rotas                                                                */
/* =================================================================== */

export function registerRoutes(app: Express): void {
  /* ---------- Sessão ---------- */
  setupAuth(app);

  app.get("/api/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user?.id)
        return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (e) {
      console.error("/api/user", e);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  /* ---------- Users (admin) ---------- */
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const q = `
        SELECT id, email, username, first_name, last_name, role, permissions, created_at, updated_at
        FROM public.users
        ORDER BY created_at DESC
        LIMIT 200
      `;
      const { rows } = await pool.query(q);
      res.json(
        rows.map((u: any) => ({
          id: u.id,
          email: u.email,
          username: u.username,
          firstName: u.first_name,
          lastName: u.last_name,
          role: u.role,
          permissions: u.permissions,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
          password: null,
        }))
      );
    } catch (e) {
      console.error("[USERS/LIST]", e);
      res.status(500).json({ message: "DB error" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const data = insertUserSchema.parse(req.body);
      const username = data.username?.trim() || `user_${Date.now()}`;
      const email = data.email?.trim() || null;

      if (await storage.getUserByUsername(username))
        return res.status(400).json({ message: `Usuário "${username}" já existe` });
      if (email && (await storage.getUserByEmail(email)))
        return res.status(400).json({ message: `Email "${email}" já está em uso` });

      const passPlain = (data.password || "").trim() || "temp123";
      const password = await hashPasswordSaltHexColonHash(passPlain);

      const newUser = await storage.createUser({
        email,
        username,
        password,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        role: data.role || "user",
        permissions: data.permissions || null,
      });

      await logActivity(req, "CREATE_USER", "USER", newUser.id, `Criou usuário ${newUser.username}`);
      res.status(201).json(newUser);
    } catch (e) {
      console.error("[USERS/CREATE]", e);
      if (e instanceof z.ZodError)
        return res.status(400).json({ message: "Dados inválidos", errors: e.errors });
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const body = updateUserSchema.parse(req.body);
      const patch: any = {
        email: body.email ?? undefined,
        username: body.username ?? undefined,
        firstName: body.firstName ?? undefined,
        lastName: body.lastName ?? undefined,
        role: body.role ?? undefined,
        permissions: body.permissions ?? undefined,
      };
      if (body.password && body.password.trim() !== "")
        patch.password = await hashPasswordSaltHexColonHash(body.password.trim());
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

      const updated = await storage.updateUser(req.params.id, patch);
      await logActivity(req, "UPDATE_USER", "USER", req.params.id, `Atualizou usuário ${updated.username}`);
      res.json(updated);
    } catch (e) {
      console.error("[USERS/UPDATE]", e);
      if (e instanceof z.ZodError)
        return res.status(400).json({ message: "Dados inválidos", errors: e.errors });
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      await storage.deleteUser(req.params.id);
      await logActivity(req, "DELETE_USER", "USER", req.params.id, `Excluiu usuário`);
      res.status(204).send();
    } catch (e) {
      console.error("[USERS/DELETE]", e);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  /* ---------- Cases (100% alinhado com o dashboard) ---------- */

  // Lista /cases — status_display derivado no SQL com mesma regra dos cards
  app.get("/api/cases", isAuthenticated, async (req, res) => {
    try {
      const { status, search, limit, orderBy } = req.query as any;

      const params: any[] = [];
      let where = "WHERE 1=1";

      if (status) {
        const s = String(status).toLowerCase().trim();
        if (s === "atrasado" || s === "overdue" || s.startsWith("atra")) {
          where += ` AND (c.due_date::date < CURRENT_DATE
                     AND NOT (LOWER(COALESCE(c.status,'')) IN ('concluido','completed','done','closed','finalizado','finalizada','fechado','fechada')))`;
        } else if (s === "novo" || s === "new") {
          where += ` AND LOWER(COALESCE(c.status,'')) IN ('novo','new')`;
        } else if (s === "pendente" || s === "open" || s === "pending") {
          where += ` AND LOWER(COALESCE(c.status,'')) IN ('pendente','open','pending','in progress','em aberto','aberto')`;
        } else if (s === "concluido" || s === "completed" || s === "done" || s === "closed") {
          where += ` AND LOWER(COALESCE(c.status,'')) IN ('concluido','completed','done','closed','finalizado','finalizada','fechado','fechada')`;
        }
      }

      if (search) {
        const like = `%${String(search).toLowerCase()}%`;
        params.push(like, like, like, like);
        where += ` AND (
          LOWER(c.client_name)     LIKE $${params.length - 3}
          OR LOWER(c.process_number) LIKE $${params.length - 2}
          OR LOWER(e.name)           LIKE $${params.length - 1}
          OR LOWER(e.registration)   LIKE $${params.length}
        )`;
      }

      const ord =
        orderBy === "recent"
          ? "ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC"
          : "ORDER BY c.created_at DESC";
      const lim = Number(limit) > 0 ? `LIMIT ${Number(limit)}` : "LIMIT 500";

      const q = `
        SELECT
          c.id,
          c.client_name,
          c.process_type,
          c.process_number,
          c.status,
          ${STATUS_CASE_SQL} AS status_display,
          c.description,
          c.observacoes,
          c.company_id,
          c.due_date     AS due_date,
          c.hearing_date AS hearing_date,
          c.start_date   AS start_date,
          c.created_at,
          c.updated_at,
          e.id           AS employee_id,
          e.name         AS employee_name,
          e.registration AS employee_registration
        FROM public.cases c
        LEFT JOIN public.employees e ON e.id = c.employee_id
        ${where}
        ${ord}
        ${lim}
      `;
      const { rows } = await pool.query(q, params);

      const data = rows.map((r: any) => ({
        id: r.id,
        matricula: r.employee_registration || "N/A",
        clientName: r.client_name || "",
        processType: r.process_type || "",
        processNumber: r.process_number || "",
        dueDate: r.due_date || null,
        hearingDate: r.hearing_date || null,
        observacoes: r.observacoes || "",
        status: r.status_display, // <– derivado no SQL
        description: r.description || "",
        companyId: r.company_id || null,
        startDate: r.start_date || null,
        createdAt: r.created_at || null,
        updatedAt: r.updated_at || null,
        employeeId: r.employee_id || null,
        employeeName: r.employee_name || null,
        registration: r.employee_registration || "N/A",
        originalStatus: r.status || null,
        isOverdue: r.status_display === "atrasado",
      }));

      res.json(data);
    } catch (e) {
      console.error("GET /api/cases", e);
      res.status(200).json([]); // não derruba a UI
    }
  });

  // Detalhe — mesma derivação no SQL
  app.get("/api/cases/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const q = `
        SELECT
          c.*,
          ${STATUS_CASE_SQL} AS status_display,
          e.id           AS employee_id,
          e.name         AS employee_name,
          e.registration AS employee_registration
        FROM public.cases c
        LEFT JOIN public.employees e ON e.id = c.employee_id
        WHERE c.id = $1
        LIMIT 1
      `;
      const { rows } = await pool.query(q, [id]);
      if (!rows.length) return res.status(404).json({ message: "Case not found" });

      const r = rows[0];
      res.json({
        id: r.id,
        clientName: r.client_name || "",
        processType: r.process_type || "",
        processNumber: r.process_number || "",
        description: r.description || "",
        dueDate: r.due_date || null,
        hearingDate: r.hearing_date || null,
        startDate: r.start_date || null,
        observacoes: r.observacoes || "",
        companyId: r.company_id || null,
        status: r.status_display, // <– derivado no SQL
        originalStatus: r.status,
        archived: r.archived,
        deleted: r.deleted,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        employeeRegistration: r.employee_registration,
        matricula: r.employee_registration || "N/A",
        registration: r.employee_registration || "N/A",
        isOverdue: r.status_display === "atrasado",
      });
    } catch (e) {
      console.error("GET /api/cases/:id", e);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  // Criar
  app.post("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== "admin")
        return res.status(403).json({ message: "Insufficient permissions" });

      const b = req.body || {};
      let employeeId = b.employeeId;

      const matricula = b.matricula || b.registration;
      if (!employeeId && matricula) {
        const rs = await pool.query(
          `SELECT id FROM public.employees WHERE registration = $1 LIMIT 1`,
          [String(matricula)]
        );
        if (rs.rowCount) employeeId = rs.rows[0].id;
      }

      const toDate = (v: any) => (v ? new Date(v) : null);

      const data = {
        ...b,
        employeeId,
        dueDate: toDate(b.dueDate || b.prazoEntrega),
        hearingDate: toDate(b.hearingDate || b.dataAudiencia),
        startDate: toDate(b.startDate || b.dataInicio),
        // status textual de entrada normalizado; a derivação de "atrasado" é no SQL
        status: String(b.status || "pendente"),
        createdById: req.user.id,
      };

      const validated = insertCaseSchema.parse(data);
      const newCase = await storage.createCase(validated);

      await logActivity(
        req,
        "CREATE_CASE",
        "CASE",
        newCase.id,
        `Criou processo ${newCase.processNumber} - Cliente: ${newCase.clientName}`
      );
      res.status(201).json(newCase);
    } catch (e: any) {
      if (e instanceof z.ZodError)
        return res.status(400).json({ message: "Invalid data", errors: e.errors });
      console.error("POST /api/cases", e);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  // Atualizar status (mantém completedDate/dataEntrega) — a exibição “atrasado” continua derivada no SQL
  app.patch("/api/cases/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const newStatus = String(req.body?.status || "").trim();
      if (!newStatus) return res.status(400).json({ message: "Invalid status" });

      const c = await storage.getCaseById(id);
      if (!c) return res.status(404).json({ message: "Case not found" });

      const wasConcluded = /^(concluido|completed|done|closed|finalizado|finalizada|fechado|fechada)$/i.test(
        String(c.status || "")
      );
      const willBeConcluded = /^(concluido|completed|done|closed|finalizado|finalizada|fechado|fechada)$/i.test(
        newStatus
      );

      let completedDate = c.completedDate;
      let dataEntrega = c.dataEntrega;
      if (!wasConcluded && willBeConcluded) {
        completedDate = new Date();
        dataEntrega = new Date();
      } else if (wasConcluded && !willBeConcluded) {
        completedDate = null;
        dataEntrega = null;
      }

      const updated = await storage.updateCaseStatus(id, newStatus, completedDate, dataEntrega);

      await logActivity(req, "UPDATE_STATUS", "CASE", id, `Status ${c.status} -> ${newStatus}`);
      res.json(updated);
    } catch (e) {
      console.error("PATCH /api/cases/:id/status", e);
      res.status(500).json({ message: "Failed to update case status" });
    }
  });

  // Atualização geral
  app.patch("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const found = await storage.getCaseById(id);
      if (!found) return res.status(404).json({ message: "Case not found" });

      if (req.user?.role !== "admin") {
        const allowed = ["description", "dueDate", "assignedToId"];
        const bad = Object.keys(req.body).some((k) => !allowed.includes(k));
        if (bad) return res.status(403).json({ message: "Insufficient permissions" });
      }

      const patch = {
        clientName: req.body.clientName,
        processNumber: req.body.processNumber,
        description: req.body.description,
        status: req.body.status, // armazenamos como veio; derivação de “atrasado” é no SQL
        dueDate: parseBRDate(req.body.dueDate) ?? req.body.dueDate,
        startDate: parseBRDate(req.body.startDate) ?? req.body.startDate,
        observacoes: req.body.observacoes,
        employeeId: req.body.employeeId,
        assignedToId: req.body.assignedToId,
      } as any;
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

      const updated = await storage.updateCase(id, patch);
      await logActivity(req, "UPDATE_CASE", "CASE", id, `Editou processo ${found.processNumber}`);
      res.json(updated);
    } catch (e: any) {
      if (e instanceof z.ZodError)
        return res.status(400).json({ message: "Invalid data", errors: e.errors });
      console.error("PATCH /api/cases/:id", e);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  // Delete
  app.delete("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      if (req.user?.role !== "admin")
        return res.status(403).json({ message: "Insufficient permissions" });
      const c = await storage.getCaseById(id);
      if (!c) return res.status(404).json({ message: "Case not found" });
      await storage.deleteCase(id);
      await logActivity(req, "DELETE_CASE", "CASE", id, `Excluiu processo ${c.processNumber}`);
      res.status(204).send();
    } catch (e) {
      console.error("DELETE /api/cases/:id", e);
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  /* ---------- Dashboard (stats + updates) ---------- */

  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      await sendStats(res);
    } catch (e) {
      console.error("/api/dashboard/stats", e);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  app.get("/api/stats", isAuthenticated, async (_req, res) => {
    try {
      await sendStats(res);
    } catch (e) {
      console.error("/api/stats", e);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app.get("/api/dashboard", isAuthenticated, async (_req, res) => {
    try {
      await sendStats(res);
    } catch (e) {
      console.error("/api/dashboard", e);
      res.status(500).json({ message: "Failed to fetch dashboard" });
    }
  });

  app.get("/api/dashboard/updates", isAuthenticated, async (_req, res) => {
    try {
      const q = `
        SELECT
          c.id,
          c.client_name,
          c.process_number,
          ${STATUS_CASE_SQL} AS status_display,
          c.status AS original_status,
          c.updated_at,
          e.id           AS employee_id,
          e.name         AS employee_name,
          e.registration AS employee_registration
        FROM public.cases c
        LEFT JOIN public.employees e ON e.id = c.employee_id
        ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
        LIMIT 10
      `;
      const { rows } = await pool.query(q);
      res.json(
        rows.map((r: any) => ({
          id: r.id,
          clientName: r.client_name || "",
          processNumber: r.process_number || "",
          status: r.status_display,
          originalStatus: r.original_status,
          updatedAt: r.updated_at,
          employeeId: r.employee_id,
          employeeName: r.employee_name,
          employeeRegistration: r.employee_registration,
          matricula: r.employee_registration || "N/A",
          registration: r.employee_registration || "N/A",
        }))
      );
    } catch (e) {
      console.error("/api/dashboard/updates", e);
      res.status(500).json({ message: "Failed to fetch updates" });
    }
  });

  /* ---------- Activity Log (descoberta de colunas + limite) ---------- */

  const activityHandler = async (req: any, res: any) => {
    try {
      const cfg = await resolveActivityTableAndCols();

      const { action, date, search } = req.query as any;
      const limit = Math.min(Number(req.query?.limit) || 500, 10000);

      const params: any[] = [];
      const where: string[] = [];

      if (action && cfg.action) {
        params.push(String(action).toUpperCase());
        where.push(`UPPER(a.${cfg.action}) = $${params.length}`);
      }
      if (date && cfg.createdAt) {
        params.push(String(date));
        where.push(`a.${cfg.createdAt}::date = $${params.length}::date`);
      }
      if (search) {
        const like = `%${String(search).toLowerCase()}%`;
        const parts: string[] = [];
        if (cfg.description) {
          params.push(like);
          parts.push(`LOWER(a.${cfg.description}) LIKE $${params.length}`);
        }
        if (cfg.resourceType) {
          params.push(like);
          parts.push(`LOWER(a.${cfg.resourceType}) LIKE $${params.length}`);
        }
        if (cfg.resourceId) {
          params.push(like);
          parts.push(`LOWER(a.${cfg.resourceId}::text) LIKE $${params.length}`);
        }
        if (parts.length) where.push(`(${parts.join(" OR ")})`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const sel = [
        `${cfg.id}                      AS id`,
        cfg.userId ? `${cfg.userId}     AS user_id` : `NULL::text AS user_id`,
        cfg.action ? `${cfg.action}     AS action` : `NULL::text AS action`,
        cfg.resourceType ? `${cfg.resourceType} AS resource_type` : `NULL::text AS resource_type`,
        cfg.resourceId ? `${cfg.resourceId} AS resource_id` : `NULL::text AS resource_id`,
        cfg.description ? `${cfg.description} AS description` : `NULL::text AS description`,
        cfg.ipAddress ? `${cfg.ipAddress} AS ip_address` : `NULL::text AS ip_address`,
        cfg.userAgent ? `${cfg.userAgent} AS user_agent` : `NULL::text AS user_agent`,
        cfg.metadata ? `${cfg.metadata} AS metadata` : `NULL::text AS metadata`,
        cfg.createdAt ? `${cfg.createdAt} AS created_at` : `NOW() AS created_at`,
      ].join(",\n          ");

      const q = `
        SELECT
          ${sel}
        FROM ${cfg.table} a
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      const { rows } = await pool.query(q, params);

      const mapped = rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        action: r.action,
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        description: r.description,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        metadata: r.metadata,
        createdAt: r.created_at,
      }));

      res.json(mapped);
    } catch (err) {
      console.error("GET /api/activity-logs (db)", err);
      res.status(200).json([]);
    }
  };

  app.get("/api/activity-logs", isAuthenticated, activityHandler);
  app.get("/api/activity-log", isAuthenticated, activityHandler); // alias

  /* ---------- Employees (resumo) ---------- */

  app.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const term = String((req.query as any).search || "").toLowerCase();
      let rows;
      if (term) {
        const like = `%${term}%`;
        rows = await db
          .select()
          .from(employeesTable)
          .where(
            sql`LOWER(${employeesTable.name}) like ${like} OR LOWER(${employeesTable.registration}) like ${like}`
          )
          .orderBy(employeesTable.name);
      } else {
        rows = await db.select().from(employeesTable).orderBy(employeesTable.name);
      }
      res.json(
        rows.map((e: any) => ({
          ...e,
          empresa: e.companyId,
          nome: e.name,
          matricula: e.registration,
          dataAdmissao: e.admissionDate,
          dataDemissao: e.terminationDate,
          centroCusto: e.costCenter,
          cargo: e.role,
          departamento: e.department,
        }))
      );
    } catch (e) {
      console.error("GET /api/employees", e);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  /* ---------- 404 e erro global ---------- */

  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res
      .status(typeof err?.status === "number" ? err.status : 500)
      .json({ message: "Internal server error" });
  });
}
