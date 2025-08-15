// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { promisify } from "node:util";
import multer from "multer";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";

import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db, pool } from "./db";
import { parseBRDate, parseBRMoney } from "./utils/normalize";

import {
  users as usersTable,
  employees as employeesTable,
  cases as casesTable, // apenas por consistência de tipos
  insertUserSchema,
  updateUserSchema,
  insertCaseSchema,
} from "@shared/schema";

const scryptAsync = promisify(crypto.scrypt);
const upload = multer({ dest: "uploads/" });

/* ---------------------- helpers ---------------------- */
function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated?.()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

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

function normalizeStatusText(s: any): "novo" | "pendente" | "atrasado" | "concluido" | "outros" {
  if (!s) return "outros";
  const p = String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  if (p.startsWith("novo") || p === "new") return "novo";
  if (
    p.startsWith("pend") ||
    ["open", "pending", "in progress", "em aberto", "aberto"].includes(p)
  )
    return "pendente";
  if (p.startsWith("atras") || ["overdue", "late", "delayed", "vencido"].includes(p))
    return "atrasado";
  if (
    p.startsWith("conclu") ||
    ["completed", "done", "closed", "finalizado", "finalizada", "fechado", "fechada"].includes(p)
  )
    return "concluido";
  return "outros";
}

/* ======================================================
   registerRoutes
====================================================== */
export function registerRoutes(app: Express): void {
  setupAuth(app);

  /* ------------ user (sessão) ------------ */
  app.get("/api/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user?.id) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (e) {
      console.error("/api/user", e);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  /* ------------ users (admin) ------------ */
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

  /* ------------ CASES ------------ */

  // LISTA estável para a tela /cases
  app.get("/api/cases", isAuthenticated, async (req, res) => {
    try {
      const { status, search, limit, orderBy } = req.query as any;

      const params: any[] = [];
      let where = "WHERE 1=1";

      if (status) {
        // aceita open/pending/... e PT
        const norm = normalizeStatusText(status);
        const variants =
          norm === "novo"
            ? ["novo", "new"]
            : norm === "pendente"
            ? ["pendente", "open", "pending", "in progress", "em aberto", "aberto"]
            : norm === "atrasado"
            ? ["atrasado", "overdue", "late", "delayed", "vencido"]
            : norm === "concluido"
            ? ["concluido", "completed", "done", "closed", "finalizado", "finalizada", "fechado", "fechada"]
            : [String(status)];
        params.push(variants);
        where += ` AND LOWER(c.status) = ANY($${params.length})`;
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
        // campos que a tabela precisa
        matricula: r.employee_registration || "N/A",
        clientName: r.client_name || "",
        processType: r.process_type || "",
        processNumber: r.process_number || "",
        dueDate: r.due_date || null,
        hearingDate: r.hearing_date || null,
        observacoes: r.observacoes || "",
        status: normalizeStatusText(r.status), // novo|pendente|atrasado|concluido
        // extras
        description: r.description || "",
        companyId: r.company_id || null,
        startDate: r.start_date || null,
        createdAt: r.created_at || null,
        updatedAt: r.updated_at || null,
        employeeId: r.employee_id || null,
        employeeName: r.employee_name || null,
        registration: r.employee_registration || "N/A",
        originalStatus: r.status || null,
      }));

      res.json(data);
    } catch (e) {
      console.error("GET /api/cases", e);
      // nunca quebre a tela: devolve array vazio
      res.status(200).json([]);
    }
  });

  // DETALHE
  app.get("/api/cases/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const q = `
        SELECT
          c.*,
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
        status: normalizeStatusText(r.status),
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
      });
    } catch (e) {
      console.error("GET /api/cases/:id", e);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  // CRIAR
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
        status: normalizeStatusText(b.status || "pendente"),
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

  // ATUALIZAR STATUS
  app.patch("/api/cases/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const statusNorm = normalizeStatusText(req.body?.status);
      if (!["novo", "pendente", "concluido", "atrasado"].includes(statusNorm))
        return res.status(400).json({ message: "Invalid status" });

      const c = await storage.getCaseById(id);
      if (!c) return res.status(404).json({ message: "Case not found" });

      let completedDate = c.completedDate;
      let dataEntrega = c.dataEntrega;
      if (statusNorm === "concluido" && c.status !== "concluido") {
        completedDate = new Date();
        dataEntrega = new Date();
      } else if (statusNorm !== "concluido" && c.status === "concluido") {
        completedDate = null;
        dataEntrega = null;
      }

      const updated = await storage.updateCaseStatus(
        id,
        statusNorm,
        completedDate,
        dataEntrega
      );

      await logActivity(
        req,
        "UPDATE_STATUS",
        "CASE",
        id,
        `Status ${c.status} -> ${statusNorm}`
      );
      res.json(updated);
    } catch (e) {
      console.error("PATCH /api/cases/:id/status", e);
      res.status(500).json({ message: "Failed to update case status" });
    }
  });

  // ATUALIZAÇÃO GERAL
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
        status: req.body.status ? normalizeStatusText(req.body.status) : undefined,
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

  /* ------------ DASHBOARD (contadores + updates) ------------ */

  // SQL direto mapeando todos os sinônimos
  const STATS_SQL = `
    SELECT
      SUM(CASE
            WHEN lower(coalesce(status,'')) in ('novo','new')
            THEN 1 ELSE 0 END)::int AS novos,
      SUM(CASE
            WHEN lower(coalesce(status,'')) in ('pendente','open','pending','in progress','em aberto','aberto')
            THEN 1 ELSE 0 END)::int AS pendentes,
      SUM(CASE
            WHEN lower(coalesce(status,'')) in ('atrasado','overdue','late','delayed','vencido')
            THEN 1 ELSE 0 END)::int AS atrasados,
      SUM(CASE
            WHEN lower(coalesce(status,'')) in ('concluido','completed','done','closed','finalizado','finalizada','fechado','fechada')
            THEN 1 ELSE 0 END)::int AS concluidos,
      COUNT(*)::int AS total
    FROM public.cases;
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
      // EN aliases (o front pode usar qualquer um)
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

  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try { await sendStats(res); } catch (e) { console.error("/api/dashboard/stats", e); res.status(500).json({ message: "Failed to fetch dashboard stats" }); }
  });
  app.get("/api/stats", isAuthenticated, async (_req, res) => {
    try { await sendStats(res); } catch (e) { console.error("/api/stats", e); res.status(500).json({ message: "Failed to fetch stats" }); }
  });
  app.get("/api/dashboard", isAuthenticated, async (_req, res) => {
    try { await sendStats(res); } catch (e) { console.error("/api/dashboard", e); res.status(500).json({ message: "Failed to fetch dashboard" }); }
  });

  app.get("/api/dashboard/updates", isAuthenticated, async (_req, res) => {
    try {
      const q = `
        SELECT c.id, c.client_name, c.process_number, c.status, c.updated_at,
               e.id AS employee_id, e.name AS employee_name, e.registration AS employee_registration
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
          status: normalizeStatusText(r.status),
          originalStatus: r.status,
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

  /* ------------ employees resumo ------------ */
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

  /* ------------ 404 & error ------------ */
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res
      .status(typeof err?.status === "number" ? err.status : 500)
      .json({ message: "Internal server error" });
  });
}
