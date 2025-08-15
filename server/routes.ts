// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import * as fs from "fs";
import multer from "multer";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";

import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db, pool } from "./db";
import { parseBRDate, parseBRMoney } from "./utils/normalize";

import {
  users as usersTable,
  employees as employeesTable,
  cases as casesTable,
  insertUserSchema,
  updateUserSchema,
  insertCaseSchema,
} from "@shared/schema";

const scryptAsync = promisify(crypto.scrypt);
const upload = multer({ dest: "uploads/" });

/* ------------------------------------------------------------------
   NORMALIZAÇÃO DE STATUS / DASHBOARD
-------------------------------------------------------------------*/
function normalizeStatusText(s: any): string {
  if (!s) return "";
  const plain = String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

  // PT (prefixos)
  if (plain.startsWith("novo"))   return "novo";
  if (plain.startsWith("pend"))   return "pendente";
  if (plain.startsWith("atras"))  return "atrasado";
  if (plain.startsWith("conclu")) return "concluido";

  // EN / variações
  if (["new"].includes(plain))                             return "novo";
  if (["open","pending","in progress","em aberto","aberto"].includes(plain)) return "pendente";
  if (["overdue","late","delayed","vencido"].includes(plain))               return "atrasado";
  if (["completed","done","closed","finalizado","finalizada","fechado","fechada"].includes(plain))
    return "concluido";

  return "outros";
}

// sinônimos por status normalizado -> usados em filtros SQL
function statusDbVariants(norm: string): string[] {
  switch (norm) {
    case "novo":       return ["novo","new"];
    case "pendente":   return ["pendente","open","pending","in progress","em aberto","aberto"];
    case "atrasado":   return ["atrasado","overdue","late","delayed","vencido"];
    case "concluido":  return ["concluido","completed","done","closed","finalizado","finalizada","fechado","fechada"];
    default:           return [norm];
  }
}

async function computeDashboardStatsFromDB() {
  const q = `
    select lower(coalesce(status,'')) as s,
           count(*)::int as c,
           sum( (due_date < now() and not (lower(coalesce(status,'')) like 'conclu%'))::int )::int as vencidos_part
    from public.cases
    group by 1
  `;
  const { rows } = await pool.query(q);

  const counters = { total: 0, novo: 0, pendente: 0, atrasado: 0, concluido: 0, vencidos: 0 };
  for (const r of rows) {
    counters.total += r.c || 0;
    const b = normalizeStatusText(r.s);
    if (b in counters) (counters as any)[b] += r.c || 0;
    counters.vencidos += r.vencidos_part || 0;
  }
  return counters;
}

/* ------------------------------------------------------------------
   HELPERS GERAIS
-------------------------------------------------------------------*/
function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Unauthorized" });
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
    const ipAddress =
      req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || "Unknown";
    const userAgent = req.get("User-Agent") || "Unknown";
    await storage.logActivity({
      userId: req.user.id,
      action, resourceType, resourceId, description,
      ipAddress, userAgent,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  } catch (e) { console.error("❌ logActivity:", e); }
};

interface AuthenticatedRequest extends Request { user?: any; }

/* ------------------------------------------------------------------
   ROTAS
-------------------------------------------------------------------*/
export function registerRoutes(app: Express): void {
  app.get("/api/test", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  setupAuth(app);

  app.get("/api/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user?.id) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) { console.error("get /api/user", err); res.status(500).json({ message: "Failed to fetch user" }); }
  });

  /* ================= USERS ================= */
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
      res.json(rows.map((u: any) => ({
        id: u.id, email: u.email, username: u.username,
        firstName: u.first_name, lastName: u.last_name,
        role: u.role, permissions: u.permissions,
        createdAt: u.created_at, updatedAt: u.updated_at, password: null
      })));
    } catch (err) { console.error("[USERS/LIST]", err); res.status(500).json({ message: "DB error" }); }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const data = insertUserSchema.parse(req.body);
      const username = data.username?.trim() || `user_${Date.now()}`;
      const email    = data.email?.trim() || null;

      if (await storage.getUserByUsername(username))
        return res.status(400).json({ message: `Usuário "${username}" já existe` });
      if (email && (await storage.getUserByEmail(email)))
        return res.status(400).json({ message: `Email "${email}" já está em uso` });

      const passwordPlain = (data.password || "").trim() || "temp123";
      const password = await hashPasswordSaltHexColonHash(passwordPlain);

      const newUser = await storage.createUser({
        email, username, password,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        role: data.role || "user",
        permissions: data.permissions || null,
      });

      await logActivity(req, "CREATE_USER", "USER", newUser.id, `Criou usuário ${newUser.username}`);
      res.status(201).json(newUser);
    } catch (err) {
      console.error("[USERS/CREATE]", err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Dados inválidos", errors: err.errors });
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const userId = req.params.id;
      const body   = updateUserSchema.parse(req.body);

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
      Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);

      const updated = await storage.updateUser(userId, patch);
      await logActivity(req, "UPDATE_USER", "USER", userId, `Atualizou usuário ${updated.username}`);
      res.json(updated);
    } catch (err) {
      console.error("[USERS/UPDATE]", err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Dados inválidos", errors: err.errors });
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
    } catch (err) { console.error("[USERS/DELETE]", err); res.status(500).json({ message: "Failed to delete user" }); }
  });

  /* ================= CASES ================= */

  // LIST
  app.get("/api/cases", isAuthenticated, async (req, res) => {
    try {
      const { status, search, limit, orderBy } = req.query as any;

      const params: any[] = [];
      let where = "WHERE 1=1";

      if (status) {
        const norm = normalizeStatusText(status);
        const variants = statusDbVariants(norm).map(v => v.toLowerCase());
        params.push(variants);
        where += ` AND LOWER(c.status) = ANY($${params.length})`;
      }

      if (search) {
        const like = `%${String(search).toLowerCase()}%`;
        params.push(like, like, like, like);
        where += ` AND (LOWER(c.client_name)   LIKE $${params.length - 3}
                    OR LOWER(c.process_number) LIKE $${params.length - 2}
                    OR LOWER(e.name)           LIKE $${params.length - 1}
                    OR LOWER(e.registration)   LIKE $${params.length})`;
      }

      const ord = orderBy === "recent"
        ? "ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC"
        : "ORDER BY c.created_at DESC";
      const lim = Number(limit) > 0 ? `LIMIT ${Number(limit)}` : "LIMIT 500";

      const q = `
        SELECT
          c.*,
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

      const mapped = rows.map((r: any) => {
        const statusNorm = normalizeStatusText(r.status);
        return {
          id: r.id,
          clientName: r.client_name,
          processType: r.process_type,
          processNumber: r.process_number,
          description: r.description,
          dueDate: r.due_date,
          hearingDate: r.hearing_date,
          startDate: r.start_date,
          observacoes: r.observacoes,
          companyId: r.company_id,
          status: statusNorm,           // <- **UI recebe normalizado**
          originalStatus: r.status,     // <- opcional: auditoria
          archived: r.archived,
          deleted: r.deleted,
          createdAt: r.created_at,
          updatedAt: r.updated_at,

          employeeId: r.employee_id,
          employeeName: r.employee_name,
          employeeRegistration: r.employee_registration,

          // aliases esperados pela UI
          matricula: r.employee_registration,
          registration: r.employee_registration,
          employee: { id: r.employee_id, name: r.employee_name, registration: r.employee_registration },
          process:  { number: r.process_number },
        };
      });

      res.json(mapped);
    } catch (error) {
      console.error("GET /api/cases", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  // DETAIL
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
      const statusNorm = normalizeStatusText(r.status);
      res.json({
        id: r.id,
        clientName: r.client_name,
        processType: r.process_type,
        processNumber: r.process_number,
        description: r.description,
        dueDate: r.due_date,
        hearingDate: r.hearing_date,
        startDate: r.start_date,
        observacoes: r.observacoes,
        companyId: r.company_id,
        status: statusNorm,
        originalStatus: r.status,
        archived: r.archived,
        deleted: r.deleted,
        createdAt: r.created_at,
        updatedAt: r.updated_at,

        employeeId: r.employee_id,
        employeeName: r.employee_name,
        employeeRegistration: r.employee_registration,
        matricula: r.employee_registration,
        registration: r.employee_registration,

        employee: { id: r.employee_id, name: r.employee_name, registration: r.employee_registration },
        process:  { number: r.process_number },
      });
    } catch (error) {
      console.error("GET /api/cases/:id", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  // CREATE
  app.post("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== "admin")
        return res.status(403).json({ message: "Insufficient permissions" });

      const body = req.body || {};
      let employeeId = body.employeeId;

      const matricula = body.matricula || body.registration;
      if (!employeeId && matricula) {
        const rs = await pool.query(
          `SELECT id FROM public.employees WHERE registration = $1 LIMIT 1`, [String(matricula)]
        );
        if (rs.rowCount) employeeId = rs.rows[0].id;
      }

      const toDate = (v: any) => (v ? new Date(v) : null);

      const data = {
        ...body,
        employeeId,
        dueDate: toDate(body.dueDate || body.prazoEntrega),
        hearingDate: toDate(body.hearingDate || body.dataAudiencia),
        startDate: toDate(body.startDate || body.dataInicio),
        status: normalizeStatusText(body.status || "pendente"),
        createdById: req.user.id,
      };

      const validated = insertCaseSchema.parse(data);
      const newCase = await storage.createCase(validated);

      await logActivity(req,"CREATE_CASE","CASE",newCase.id,`Criou processo ${newCase.processNumber} - Cliente: ${newCase.clientName}`);
      res.status(201).json(newCase);
    } catch (error: any) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: error.errors });
      console.error("POST /api/cases", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  // UPDATE STATUS
  app.patch("/api/cases/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const statusNorm = normalizeStatusText(req.body?.status);
      if (!["novo","pendente","concluido","atrasado"].includes(statusNorm))
        return res.status(400).json({ message: "Invalid status" });

      const c = await storage.getCaseById(id);
      if (!c) return res.status(404).json({ message: "Case not found" });

      let completedDate = c.completedDate;
      let dataEntrega   = c.dataEntrega;
      if (statusNorm === "concluido" && c.status !== "concluido") {
        completedDate = new Date(); dataEntrega = new Date();
      } else if (statusNorm !== "concluido" && c.status === "concluido") {
        completedDate = null; dataEntrega = null;
      }

      const updated = await storage.updateCaseStatus(id, statusNorm, completedDate, dataEntrega);

      await logActivity(req,"UPDATE_STATUS","CASE",id,`Status ${c.status} -> ${statusNorm}`);
      res.json(updated);
    } catch (err) { console.error("PATCH /api/cases/:id/status", err); res.status(500).json({ message: "Failed to update case status" }); }
  });

  // PATCH (geral)
  app.patch("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const found = await storage.getCaseById(id);
      if (!found) return res.status(404).json({ message: "Case not found" });

      if (req.user?.role !== "admin") {
        const allowed = ["description","dueDate","assignedToId"];
        const bad = Object.keys(req.body).some((k) => !allowed.includes(k));
        if (bad) return res.status(403).json({ message: "Insufficient permissions to edit these fields" });
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
      Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);

      const updated = await storage.updateCase(id, patch);
      await logActivity(req,"UPDATE_CASE","CASE",id,`Editou processo ${found.processNumber}`);
      res.json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
      console.error("PATCH /api/cases/:id", err);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  // DELETE
  app.delete("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Insufficient permissions" });
      const c = await storage.getCaseById(id);
      if (!c) return res.status(404).json({ message: "Case not found" });
      await storage.deleteCase(id);
      await logActivity(req, "DELETE_CASE", "CASE", id, `Excluiu processo ${c.processNumber}`);
      res.status(204).send();
    } catch (err) { console.error("DELETE /api/cases/:id", err); res.status(500).json({ message: "Failed to delete case" }); }
  });

  /* ================= DASHBOARD ================= */

  async function sendStats(res: Response) {
    const base = await computeDashboardStatsFromDB();
    const payload = {
      total: base.total, vencidos: base.vencidos,

      // PT
      novo: base.novo, novos: base.novo,
      pendente: base.pendente, pendentes: base.pendente,
      atrasado: base.atrasado, atrasados: base.atrasado,
      concluido: base.concluido, concluidos: base.concluido,

      // EN aliases (qualquer UI)
      new: base.novo, newCount: base.novo,
      pending: base.pendente, pendingCount: base.pendente,
      open: base.pendente, openCount: base.pendente,
      overdue: base.atrasado, late: base.atrasado,
      completed: base.concluido, done: base.concluido, closed: base.concluido,
    };
    console.log("[DASH/STATS]", payload);
    res.set("Cache-Control", "no-store");
    res.json(payload);
  }

  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try { await sendStats(res); } catch (err) { console.error("GET /api/dashboard/stats", err); res.status(500).json({ message: "Failed to fetch dashboard stats" }); }
  });
  app.get("/api/stats", isAuthenticated, async (_req, res) => {
    try { await sendStats(res); } catch (err) { console.error("GET /api/stats", err); res.status(500).json({ message: "Failed to fetch stats" }); }
  });
  app.get("/api/dashboard", isAuthenticated, async (_req, res) => {
    try { await sendStats(res); } catch (err) { console.error("GET /api/dashboard", err); res.status(500).json({ message: "Failed to fetch dashboard" }); }
  });

  app.get("/api/dashboard/updates", isAuthenticated, async (_req, res) => {
    try {
      const q = `
        select c.id, c.client_name, c.process_number, c.status, c.updated_at,
               e.id as employee_id, e.name as employee_name, e.registration as employee_registration
        from public.cases c
        left join public.employees e on e.id = c.employee_id
        order by c.updated_at desc nulls last, c.created_at desc
        limit 10
      `;
      const { rows } = await pool.query(q);
      const mapped = rows.map((r: any) => ({
        id: r.id,
        clientName: r.client_name,
        processNumber: r.process_number,
        status: normalizeStatusText(r.status),
        originalStatus: r.status,
        updatedAt: r.updated_at,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        employeeRegistration: r.employee_registration,
        matricula: r.employee_registration,
        registration: r.employee_registration,
        employee: { id: r.employee_id, name: r.employee_name, registration: r.employee_registration },
        process: { number: r.process_number },
      }));
      res.json(mapped);
    } catch (err) { console.error("GET /api/dashboard/updates", err); res.status(500).json({ message: "Failed to fetch updates" }); }
  });

  /* ================= ACTIVITY LOG ================= */
  const activityHandler = async (req: any, res: any) => {
    try {
      const { action, date, search, limit, processOnly } = req.query as any;
      const logs = await storage.getActivityLogs({
        action, date, search,
        limit: limit ? Number(limit) : undefined,
        processOnly: processOnly === "true",
      });
      res.json(Array.isArray(logs) ? logs : []);
    } catch (err) { console.error("GET /api/activity-logs", err); res.status(500).json({ message: "Failed to fetch activity logs" }); }
  };
  app.get("/api/activity-logs", isAuthenticated, activityHandler);
  app.get("/api/activity-log",  isAuthenticated, activityHandler); // alias

  /* ================= EMPLOYEES (resumo) ================= */
  app.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const term = String((req.query as any).search || "").toLowerCase();
      let rows;
      if (term) {
        const like = `%${term}%`;
        rows = await db
          .select()
          .from(employeesTable)
          .where(sql`LOWER(${employeesTable.name}) like ${like} OR LOWER(${employeesTable.registration}) like ${like}`)
          .orderBy(employeesTable.name);
      } else {
        rows = await db.select().from(employeesTable).orderBy(employeesTable.name);
      }
      res.json(rows.map((e: any) => ({
        ...e,
        empresa: e.companyId, nome: e.name, matricula: e.registration,
        dataAdmissao: e.admissionDate, dataDemissao: e.terminationDate,
        centroCusto: e.costCenter, cargo: e.role, departamento: e.department,
      })));
    } catch (err) { console.error("GET /api/employees", err); res.status(500).json({ message: "Failed to fetch employees" }); }
  });

  app.post("/api/employees", isAuthenticated, async (req: any, res) => {
    try {
      const b = req.body || {};
      const companyId = b.companyId ?? b.empresa ?? 1;
      const name = b.name ?? b.nome;
      const registration = b.registration ?? b.matricula;
      if (!name || !registration) return res.status(400).json({ message: "Nome e matrícula são obrigatórios" });

      const dup = await db.select({ id: employeesTable.id }).from(employeesTable).where(eq(employeesTable.registration, registration)).limit(1);
      if (dup.length) return res.status(400).json({ message: "Matrícula já existe" });

      const [created] = await db.insert(employeesTable).values({
        id: crypto.randomUUID(),
        companyId, name, registration,
        rg: b.rg ?? null, pis: b.pis ?? null,
        admissionDate: parseBRDate(b.admissionDate ?? b.dataAdmissao) as any,
        terminationDate: parseBRDate(b.terminationDate ?? b.dataDemissao) as any,
        salary: parseBRMoney(b.salary ?? b.salario) as any,
        role: b.role ?? b.cargo ?? null,
        department: b.department ?? b.departamento ?? null,
        costCenter: b.costCenter ?? b.centroCusto ?? null,
      }).returning();

      await logActivity(req,"CREATE_EMPLOYEE","EMPLOYEE",created.id,`Criou funcionário ${created.name} - Matrícula: ${created.registration}`);
      res.status(201).json({
        ...created,
        empresa: created.companyId, nome: created.name, matricula: created.registration,
        dataAdmissao: created.admissionDate, dataDemissao: created.terminationDate,
        centroCusto: created.costCenter, cargo: created.role, departamento: created.department,
      });
    } catch (err) { console.error("POST /api/employees", err); res.status(500).json({ message: "Failed to create employee" }); }
  });

  /* 404 & error */
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(typeof err?.status === "number" ? err.status : 500).json({ message: "Internal server error" });
  });
}
