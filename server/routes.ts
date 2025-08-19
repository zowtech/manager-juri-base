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

import {
  users as usersTable,
  employees as employeesTable,
  cases as casesTable,
  insertUserSchema,
  updateUserSchema,
  insertCaseSchema,
} from "@shared/schema";

/* =========================================================
   Helpers locais (para não depender de outros imports)
   ========================================================= */

const scryptAsync = promisify(crypto.scrypt);
const upload = multer({ dest: "uploads/" });

function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Unauthorized" });
}

// senha no formato "saltHex:hashHex"
async function hashPasswordSaltHexColonHash(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

// parse "pt-BR" dd/mm/yyyy para Date
function parseBRDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  if (!s) return null;
  // tenta ISO primeiro
  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) return iso;
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

// parse "R$ 1.234,56" ou "1234,56"
function parseBRMoney(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d\.]/g, "");
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

/* =========================================================
   Logger enriquecido: formata descrição com matrícula/nome
   ========================================================= */
const logActivity = async (
  req: any,
  action: string,
  resourceType: string,
  resourceId: string,
  baseDescription: string,
  metadata?: any
) => {
  try {
    if (!req?.user?.id) return;

    const ipAddress =
      req.headers?.["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      (req as any).connection?.remoteAddress ||
      "Unknown";
    const userAgent = req.get?.("User-Agent") || "Unknown";

    // Quem fez a ação (prefixo na descrição)
    const actor =
      `${req.user?.firstName ?? ""} ${req.user?.lastName ?? ""}`.trim() ||
      req.user?.username ||
      "Usuário";

    // Verbos padrões por ação/recurso (para a descrição “bonita”)
    const verbMap: Record<string, string> = {
      CREATE_EMPLOYEE: "Criou",
      UPDATE_EMPLOYEE: "Atualizou",
      DELETE_EMPLOYEE: "Removeu",

      CREATE_CASE: "Criou",
      UPDATE_CASE: "Editou",
      UPDATE_STATUS: "Alterou status",
      DELETE_CASE: "Excluiu",

      CREATE_USER: "Criou",
      UPDATE_USER: "Atualizou",
      DELETE_USER: "Removeu",
    };
    const verbo = verbMap[action] ?? "Executou";

    let descCore = baseDescription || "";
    let meta: Record<string, any> = { ...(metadata || {}) };

    if (resourceType === "EMPLOYEE" && resourceId) {
      // Sempre busca matrícula/nome para padronizar a descrição
      const empRes = await pool.query(
        `select 
           coalesce(registration, matricula) as matricula,
           coalesce(name, nome)             as nome
         from public.employees
        where id = $1`,
        [resourceId]
      );
      const e = empRes.rows?.[0];
      if (e) {
        descCore = `${verbo} funcionário ${e.matricula ?? "N/A"} - ${e.nome ?? "N/I"}`;
        meta.employeeMatricula = e.matricula ?? null;
        meta.employeeNome = e.nome ?? null;
      }
    } else if (resourceType === "CASE" && resourceId) {
      // Enriquecer com número do processo / cliente e funcionário vinculado (se houver)
      const caseRes = await pool.query(
        `select 
           c.process_number, c.client_name, c.status, c.employee_id,
           e.registration as matricula, e.name as nome
         from public.cases c
         left join public.employees e on e.id = c.employee_id
        where c.id = $1`,
        [resourceId]
      );
      const c = caseRes.rows?.[0];
      if (c) {
        descCore = `${verbo} processo ${c.process_number ?? "s/ nº"} - Cliente: ${c.client_name ?? "N/I"}`;
        if (c.matricula || c.nome) {
          descCore += ` | Funcionário: ${c.matricula ?? "N/A"} - ${c.nome ?? "N/I"}`;
        }
        // Se for mudança de status, acrescenta o delta
        if (action === "UPDATE_STATUS" && (meta.previousStatus || meta.newStatus)) {
          descCore += ` | Status: ${meta.previousStatus ?? "?"} -> ${meta.newStatus ?? "?"}`;
        }
        meta = {
          ...meta,
          processNumber: c.process_number ?? null,
          clientName: c.client_name ?? null,
          employeeMatricula: c.matricula ?? null,
          employeeNome: c.nome ?? null,
        };
      }
    }

    // Fallback
    if (!descCore) descCore = baseDescription || `${verbo} ${resourceType.toLowerCase()}`;

    const finalDescription = `${actor}: ${descCore}`.trim();

    await storage.logActivity({
      userId: req.user.id,
      action,
      resourceType,
      resourceId,
      description: finalDescription,
      ipAddress: String(ipAddress),
      userAgent,
      metadata: Object.keys(meta).length ? JSON.stringify(meta) : undefined,
    });

    // Log no console (útil na Render)
    console.log(`📋 LOG ATIVIDADE: [${action}] ${resourceType} ${resourceId} - ${finalDescription}`);
  } catch (e) {
    console.error("❌ Falha ao registrar log de atividade:", e);
  }
};

/* =========================================================
   Registro de rotas
   ========================================================= */

export function registerRoutes(app: Express): void {
  /* health/test */
  app.get("/api/test", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  /* auth & sessão */
  setupAuth(app);

  /* usuário logado */
  app.get("/api/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  /* ==================== USERS ==================== */

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
      const users = rows.map((u: any) => ({
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
      }));
      res.json(users);
    } catch (err) {
      console.error("[USERS/LIST] error:", err);
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

      if (await storage.getUserByUsername(username)) {
        return res.status(400).json({ message: `Usuário "${username}" já existe` });
      }
      if (email && (await storage.getUserByEmail(email))) {
        return res.status(400).json({ message: `Email "${email}" já está em uso` });
      }

      const passwordPlain = (data.password || "").trim() || "temp123";
      const password = await hashPasswordSaltHexColonHash(passwordPlain);

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
    } catch (err) {
      console.error("[USERS/CREATE] error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const userId = req.params.id;
      const body = updateUserSchema.parse(req.body);

      const patch: any = {
        email: body.email ?? undefined,
        username: body.username ?? undefined,
        firstName: body.firstName ?? undefined,
        lastName: body.lastName ?? undefined,
        role: body.role ?? undefined,
        permissions: body.permissions ?? undefined,
      };
      if (body.password && body.password.trim() !== "") {
        patch.password = await hashPasswordSaltHexColonHash(body.password.trim());
      }
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

      const updated = await storage.updateUser(userId, patch);
      await logActivity(req, "UPDATE_USER", "USER", userId, `Atualizou usuário ${updated.username}`);
      res.json(updated);
    } catch (err) {
      console.error("[USERS/UPDATE] error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: err.errors });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      await storage.deleteUser(req.params.id);
      await logActivity(req, "DELETE_USER", "USER", req.params.id, `Removeu usuário`);
      res.status(204).send();
    } catch (err) {
      console.error("[USERS/DELETE] error:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  /* ==================== CASES (BUCKET SEM SOBREPOSIÇÃO) ==================== */

  // GET /api/cases -> interpreta ?status= como BUCKET (novo | pendente | atrasado | concluido)
  app.get("/api/cases", isAuthenticated, async (req, res) => {
    try {
      const { status, search, limit, orderBy } = req.query as any;
      const bucket = (status || "").toString().toLowerCase().trim();
      const params: any[] = [];

      let where = "WHERE 1=1";
      if (bucket === "concluido") {
        where += " AND c.status = 'concluido'";
      } else if (bucket === "atrasado") {
        where += " AND c.status <> 'concluido' AND c.due_date IS NOT NULL AND c.due_date < now()";
      } else if (bucket === "novo") {
        where += " AND c.status = 'novo'";
      } else if (bucket === "pendente") {
        where += `
          AND c.status <> 'concluido'
          AND (c.due_date IS NULL OR c.due_date >= now())
          AND (c.status IS NULL OR c.status <> 'novo')
        `;
      }

      if (search) {
        const like = `%${String(search).toLowerCase()}%`;
        params.push(like, like, like, like);
        where += ` AND (
          LOWER(c.client_name)    LIKE $${params.length - 3} OR
          LOWER(c.process_number) LIKE $${params.length - 2} OR
          LOWER(e.name)           LIKE $${params.length - 1} OR
          LOWER(e.registration)   LIKE $${params.length}
        )`;
      }

      const ord =
        orderBy === "recent"
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
        const now = new Date();
        const due = r.due_date ? new Date(r.due_date) : null;
        const isOverdue = !!(due && r.status !== "concluido" && due < now);
        const statusForUI = isOverdue ? "atrasado" : (r.status || "pendente");

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

          status: statusForUI,
          bucket: statusForUI,
          isOverdue,

          archived: r.archived,
          deleted: r.deleted,
          createdAt: r.created_at,
          updatedAt: r.updated_at,

          employeeId: r.employee_id,
          employeeName: r.employee_name,
          employeeRegistration: r.employee_registration,

          matricula: r.employee_registration,
          registration: r.employee_registration,

          employee: {
            id: r.employee_id,
            name: r.employee_name,
            registration: r.employee_registration,
          },
          process: {
            number: r.process_number,
          },
        };
      });

      res.json(mapped);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  // detalhe
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
      const now = new Date();
      const due = r.due_date ? new Date(r.due_date) : null;
      const isOverdue = !!(due && r.status !== "concluido" && due < now);
      const statusForUI = isOverdue ? "atrasado" : (r.status || "pendente");

      const caseData = {
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
        status: statusForUI,
        bucket: statusForUI,
        isOverdue,
        archived: r.archived,
        deleted: r.deleted,
        createdAt: r.created_at,
        updatedAt: r.updated_at,

        employeeId: r.employee_id,
        employeeName: r.employee_name,
        employeeRegistration: r.employee_registration,

        matricula: r.employee_registration,
        registration: r.employee_registration,

        employee: {
          id: r.employee_id,
          name: r.employee_name,
          registration: r.employee_registration,
        },
        process: { number: r.process_number },
      };

      res.json(caseData);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  // criar
  app.post("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const body = req.body || {};
      let employeeId = body.employeeId;

      const matricula = body.matricula || body.registration;
      if (!employeeId && matricula) {
        const rs = await pool.query(
          `SELECT id FROM public.employees WHERE registration = $1 LIMIT 1`,
          [String(matricula)]
        );
        if (rs.rowCount) {
          employeeId = rs.rows[0].id;
        }
      }

      const toDate = (v: any) => parseBRDate(v) ?? (v ? new Date(v) : null);

      const data = {
        ...body,
        employeeId,
        dueDate: toDate(body.dueDate || body.prazoEntrega),
        hearingDate: toDate(body.hearingDate || body.dataAudiencia),
        startDate: toDate(body.startDate || body.dataInicio),
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
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("❌ Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  // atualizar status
  app.patch("/api/cases/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const { status } = req.body;
      if (!status || !["novo", "pendente", "concluido", "atrasado"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const c = await storage.getCaseById(id);
      if (!c) return res.status(404).json({ message: "Case not found" });

      let completedDate = c.completedDate;
      let dataEntrega = (c as any).dataEntrega ?? null;
      if (status === "concluido" && c.status !== "concluido") {
        completedDate = new Date();
        dataEntrega = new Date();
      } else if (status !== "concluido" && c.status === "concluido") {
        completedDate = null;
        dataEntrega = null;
      }

      const updated = await storage.updateCaseStatus(id, status, completedDate, dataEntrega);

      await logActivity(
        req,
        "UPDATE_STATUS",
        "CASE",
        id,
        `Alterou status do processo ${c.processNumber} de "${c.status}" para "${status}"`,
        { previousStatus: c.status, newStatus: status }
      );

      res.json(updated);
    } catch (err) {
      console.error("Error updating case status:", err);
      res.status(500).json({ message: "Failed to update case status" });
    }
  });

  // editar
  app.patch("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const found = await storage.getCaseById(id);
      if (!found) return res.status(404).json({ message: "Case not found" });

      if (req.user?.role !== "admin") {
        const allowed = ["description", "dueDate", "assignedToId"];
        const bad = Object.keys(req.body).some((k) => !allowed.includes(k));
        if (bad)
          return res
            .status(403)
            .json({ message: "Insufficient permissions to edit these fields" });
      }

      const patch = {
        clientName: req.body.clientName,
        processNumber: req.body.processNumber,
        description: req.body.description,
        status: req.body.status,
        dueDate: parseBRDate(req.body.dueDate) ?? req.body.dueDate,
        startDate: parseBRDate(req.body.startDate) ?? req.body.startDate,
        observacoes: req.body.observacoes,
        employeeId: req.body.employeeId,
        assignedToId: req.body.assignedToId,
      } as any;

      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

      const updated = await storage.updateCase(id, patch);

      await logActivity(
        req,
        "UPDATE_CASE",
        "CASE",
        id,
        `Editou processo ${found.processNumber} - Cliente: ${found.clientName}`,
        { updatedFields: Object.keys(patch) }
      );

      res.json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: err.errors });
      }
      console.error("Error updating case:", err);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  // deletar
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
    } catch (err) {
      console.error("Error deleting case:", err);
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  /* ==================== DASHBOARD ==================== */

  // Contadores (normalizados) + chaves no singular e plural
  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      const q = `
        with buckets as (
          select case
            when status = 'concluido'                      then 'concluido'
            when due_date is not null and due_date < now() then 'atrasado'
            when status = 'novo'                            then 'novo'
            else 'pendente'
          end as bucket
          from public.cases
        )
        select
          count(*)::int                                   as total,
          sum((bucket='novo')::int)::int                  as novo,
          sum((bucket='pendente')::int)::int              as pendente,
          sum((bucket='atrasado')::int)::int              as atrasado,
          sum((bucket='concluido')::int)::int             as concluido
        from buckets
      `;
      const { rows: [r] } = await pool.query(q);

      const resp = {
        // singular
        total:     r?.total ?? 0,
        novo:      r?.novo ?? 0,
        pendente:  r?.pendente ?? 0,
        atrasado:  r?.atrasado ?? 0,
        concluido: r?.concluido ?? 0,
        // plural (compat UI antiga)
        novos:       r?.novo ?? 0,
        pendentes:   r?.pendente ?? 0,
        atrasados:   r?.atrasado ?? 0,
        concluidos:  r?.concluido ?? 0,
        // agrupado
        cards: {
          novo:       r?.novo ?? 0,
          pendente:   r?.pendente ?? 0,
          atrasado:   r?.atrasado ?? 0,
          concluido:  r?.concluido ?? 0,
        },
      };

      res.json(resp);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Últimas atualizações (para o card de "Últimas Atualizações")
  app.get("/api/dashboard/updates", isAuthenticated, async (_req, res) => {
    try {
      const q = `
        select
          c.id, c.client_name, c.process_number, c.status, c.updated_at, c.due_date,
          e.registration as employee_registration, e.name as employee_name, e.id as employee_id
        from public.cases c
        left join public.employees e on e.id = c.employee_id
        order by c.updated_at desc nulls last, c.created_at desc
        limit 10
      `;
      const { rows } = await pool.query(q);
      const mapped = rows.map((r: any) => {
        const now = new Date();
        const due = r.due_date ? new Date(r.due_date) : null;
        const isOverdue = !!(due && r.status !== "concluido" && due < now);
        const statusForUI = isOverdue ? "atrasado" : (r.status || "pendente");

        return {
          id: r.id,
          clientName: r.client_name,
          processNumber: r.process_number,
          status: statusForUI,
          updatedAt: r.updated_at,
          employeeId: r.employee_id,
          employeeName: r.employee_name,
          employeeRegistration: r.employee_registration,
          matricula: r.employee_registration,
          registration: r.employee_registration,
          employee: { id: r.employee_id, name: r.employee_name, registration: r.employee_registration },
          process: { number: r.process_number },
          isOverdue,
          bucket: statusForUI,
        };
      });
      res.json(mapped);
    } catch (err) {
      console.error("Error fetching dashboard updates:", err);
      res.status(500).json({ message: "Failed to fetch updates" });
    }
  });

  /* ==================== ACTIVITY LOG ==================== */

  const activityHandler = async (req: any, res: any) => {
    try {
      const { action, date, search, limit, processOnly } = req.query as any;
      const logs = await storage.getActivityLogs({
        action,
        date,
        search,
        limit: limit ? Number(limit) : undefined,
        processOnly: processOnly === "true",
      });
      res.json(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error("❌ Erro ao buscar logs de atividade:", err);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  };
  app.get("/api/activity-logs", isAuthenticated, activityHandler);
  app.get("/api/activity-log", isAuthenticated, activityHandler); // alias

  /* ==================== EMPLOYEES ==================== */

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

      const mapped = rows.map((e: any) => ({
        ...e,
        empresa: e.companyId,
        nome: e.name,
        matricula: e.registration,
        dataAdmissao: e.admissionDate,
        dataDemissao: e.terminationDate,
        centroCusto: e.costCenter,
        cargo: e.role,
        departamento: e.department,
      }));

      res.json(mapped);
    } catch (err) {
      console.error("Error fetching employees:", err);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req: any, res) => {
    try {
      const b = req.body || {};
      const companyId = b.companyId ?? b.empresa ?? 1;
      const name = b.name ?? b.nome;
      const registration = b.registration ?? b.matricula;
      const rg = b.rg ?? null;
      const pis = b.pis ?? null;
      const admissionDate = parseBRDate(b.admissionDate ?? b.dataAdmissao);
      const terminationDate = parseBRDate(b.terminationDate ?? b.dataDemissao);
      const salary = parseBRMoney(b.salary ?? b.salario);
      const role = b.role ?? b.cargo ?? null;
      const department = b.department ?? b.departamento ?? null;
      const costCenter = b.costCenter ?? b.centroCusto ?? null;

      if (!name || !registration) {
        return res.status(400).json({ message: "Nome e matrícula são obrigatórios" });
      }

      const dup = await db
        .select({ id: employeesTable.id })
        .from(employeesTable)
        .where(eq(employeesTable.registration, registration))
        .limit(1);
      if (dup.length) return res.status(400).json({ message: "Matrícula já existe" });

      const [created] = await db
        .insert(employeesTable)
        .values({
          id: crypto.randomUUID(),
          companyId,
          name,
          registration,
          rg,
          pis,
          admissionDate: admissionDate as any,
          terminationDate: terminationDate as any,
          salary: salary as any,
          role,
          department,
          costCenter,
        })
        .returning();

      await logActivity(
        req,
        "CREATE_EMPLOYEE",
        "EMPLOYEE",
        created.id,
        `Criou funcionário ${created.registration} - ${created.name}`
      );

      res.status(201).json({
        ...created,
        empresa: created.companyId,
        nome: created.name,
        matricula: created.registration,
        dataAdmissao: created.admissionDate,
        dataDemissao: created.terminationDate,
        centroCusto: created.costCenter,
        cargo: created.role,
        departamento: created.department,
      });
    } catch (err) {
      console.error("[EMPLOYEES/CREATE] DB error:", err);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const cur = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
      if (!cur.length) return res.status(404).json({ message: "Funcionário não encontrado" });

      const b = req.body || {};
      const patch: any = {
        companyId: b.companyId ?? b.empresa,
        name: b.name ?? b.nome,
        registration: b.registration ?? b.matricula,
        rg: b.rg,
        pis: b.pis,
        admissionDate: parseBRDate(b.admissionDate ?? b.dataAdmissao) ?? b.admissionDate,
        terminationDate: parseBRDate(b.terminationDate ?? b.dataDemissao) ?? b.terminationDate,
        salary: parseBRMoney(b.salary ?? b.salario) ?? b.salary,
        role: b.role ?? b.cargo,
        department: b.department ?? b.departamento,
        costCenter: b.costCenter ?? b.centroCusto,
      };
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

      const [updated] = await db
        .update(employeesTable)
        .set(patch)
        .where(eq(employeesTable.id, id))
        .returning();

      await logActivity(
        req,
        "UPDATE_EMPLOYEE",
        "EMPLOYEE",
        id,
        `Atualizou funcionário ${updated.registration} - ${updated.name}`
      );

      res.json({
        ...updated,
        empresa: updated.companyId,
        nome: updated.name,
        matricula: updated.registration,
        dataAdmissao: updated.admissionDate,
        dataDemissao: updated.terminationDate,
        centroCusto: updated.costCenter,
        cargo: updated.role,
        departamento: updated.department,
      });
    } catch (err) {
      console.error("Error updating employee:", err);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const cur = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
      if (!cur.length) return res.status(404).json({ message: "Funcionário não encontrado" });

      await db.delete(employeesTable).where(eq(employeesTable.id, id));

      await logActivity(
        req,
        "DELETE_EMPLOYEE",
        "EMPLOYEE",
        id,
        `Removeu funcionário ${cur[0].registration} - ${cur[0].name}`
      );

      res.json({ ok: true, id });
    } catch (err) {
      console.error("Error deleting employee:", err);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Export XLSX
  app.get("/api/employees/export", isAuthenticated, async (_req, res) => {
    try {
      const mod: any = await import("xlsx");
      const XLSX = mod.default ?? mod;
      const all = await db.select().from(employeesTable).orderBy(employeesTable.name);

      const worksheetData = [
        ["Empresa", "Nome", "Matrícula", "RG", "Data Admissão", "Cargo", "Departamento", "Centro de Custo"],
      ];
      all.forEach((e: any) => {
        worksheetData.push([
          e.companyId,
          e.name,
          e.registration,
          e.rg || "",
          e.admissionDate ? new Date(e.admissionDate).toLocaleDateString("pt-BR") : "",
          e.role || "",
          e.department || "",
          e.costCenter || "",
        ]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(wb, ws, "Funcionarios");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="funcionarios_${new Date().toISOString().split("T")[0]}.xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(buffer);
    } catch (err) {
      console.error("Error exporting employees:", err);
      res.status(500).json({ message: "Failed to export employees" });
    }
  });

  // Import Excel + link-cases
  app.post("/api/employees/import", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Insufficient permissions" });
      if (!req.file) return res.status(400).json({ success: false, error: "Nenhum arquivo enviado" });

      const { importEmployeesFromExcel } = await import("./importEmployees");
      const result = await importEmployeesFromExcel(req.file.path);
      fs.unlinkSync(req.file.path);
      res.json(result);
    } catch (err) {
      console.error("Error importing employees:", err);
      res.status(500).json({ success: false, error: "Failed to import employees" });
    }
  });

  app.post("/api/employees/link-cases", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Insufficient permissions" });
      const { linkCasesToEmployees } = await import("./importEmployees");
      const result = await linkCasesToEmployees();
      res.json(result);
    } catch (err) {
      console.error("Error linking cases:", err);
      res.status(500).json({ message: "Failed to link cases" });
    }
  });

  /* ==================== SEED DE DEMONSTRAÇÃO ==================== */

  app.post("/api/admin/seed-demo", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const check = await pool.query(
        `select count(*)::int as c from public.users where username in ('admin','editor','maria')`
      );
      if (check.rows[0]?.c > 0) {
        return res.json({ ok: true, message: "Seed já aplicado (users já existem)." });
      }

      const mkPass = (plain: string) => {
        const salt = crypto.randomBytes(16);
        const key = crypto.scryptSync(plain, salt, 64);
        return `${salt.toString("hex")}:${key.toString("hex")}`;
      };

      // Users
      const usersData = [
        {
          id: crypto.randomUUID(),
          email: "admin@example.com",
          username: "admin",
          password: mkPass("admin123"),
          first_name: "System",
          last_name: "Admin",
          role: "admin",
          permissions: JSON.stringify({ users: ["create", "update", "delete"] }),
        },
        {
          id: crypto.randomUUID(),
          email: "editor@example.com",
          username: "editor",
          password: mkPass("editor123"),
          first_name: "Erica",
          last_name: "Editor",
          role: "editor",
          permissions: JSON.stringify({ cases: ["create", "update"] }),
        },
        {
          id: crypto.randomUUID(),
          email: "maria@example.com",
          username: "maria",
          password: mkPass("user123"),
          first_name: "Maria",
          last_name: "Silva",
          role: "user",
          permissions: JSON.stringify({}),
        },
      ];
      for (const u of usersData) {
        await pool.query(
          `insert into public.users
            (id,email,username,password,first_name,last_name,role,permissions,created_at,updated_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8, now(), now())
          on conflict (id) do nothing`,
          [u.id, u.email, u.username, u.password, u.first_name, u.last_name, u.role, u.permissions]
        );
      }

      // Employees
      const employeesData = [
        { name: "João Pereira",   registration: "BF-1001", rg: "12.345.678-9", companyId: 1, role: "Analista",   department: "Operações",  costCenter: "CC-01" },
        { name: "Ana Souza",      registration: "BF-1002", rg: "98.765.432-1", companyId: 1, role: "Assistente", department: "Jurídico",   costCenter: "CC-02" },
        { name: "Carlos Lima",    registration: "BF-1003", rg: "11.222.333-4", companyId: 1, role: "Coord.",     department: "RH",         costCenter: "CC-03" },
        { name: "Beatriz Santos", registration: "BF-1004", rg: "55.666.777-8", companyId: 1, role: "Advogada",   department: "Jurídico",   costCenter: "CC-02" },
        { name: "Rafaela Nunes",  registration: "BF-1005", rg: "99.888.777-6", companyId: 1, role: "Analista",   department: "Financeiro", costCenter: "CC-04" },
        { name: "Lucas Almeida",  registration: "BF-1006", rg: "22.333.444-5", companyId: 1, role: "Técnico",    department: "TI",         costCenter: "CC-05" },
      ];
      const employeeIds: string[] = [];
      for (const e of employeesData) {
        const id = crypto.randomUUID();
        employeeIds.push(id);
        await pool.query(
          `insert into public.employees
            (id,company_id,name,registration,rg,pis,admission_date,termination_date,salary,role,department,cost_center,created_at,updated_at)
          values ($1,$2,$3,$4,$5,null, now() - interval '300 days', null, 3500.00, $6, $7, $8, now(), now())
          on conflict (id) do nothing`,
          [id, e.companyId, e.name, e.registration, e.rg, e.role, e.department, e.costCenter]
        );
      }

      // Cases
      const sampleClients = ["Lucas Silva", "Carla Mendes", "Pedro Araujo", "Juliana Costa", "Marcos Dias"];
      const sampleStatuses = ["novo", "pendente", "concluido", "atrasado"];
      for (let i = 1; i <= 10; i++) {
        const id = crypto.randomUUID();
        const empId = employeeIds[(i - 1) % employeeIds.length];
        const status = sampleStatuses[(i - 1) % sampleStatuses.length];
        const clientName = sampleClients[(i - 1) % sampleClients.length];
        const processNumber = `000${i}/2025`;

        await pool.query(
          `insert into public.cases
            (id, employee_id, client_name, process_type, process_number, description,
             due_date, hearing_date, start_date, observacoes, company_id, status, archived, deleted,
             created_at, updated_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now(), now())
          on conflict (id) do nothing`,
          [
            id, empId, clientName,
            i % 2 === 0 ? "Trabalhista" : "Cível",
            processNumber,
            `Processo de ${clientName} (${processNumber})`,
            new Date(Date.now() + i * 86400000),
            new Date(Date.now() + (i + 7) * 86400000),
            new Date(Date.now() - i * 86400000),
            i % 3 === 0 ? "Observação importante." : null,
            1, status, false, false
          ]
        );
      }

      res.json({ ok: true, message: "Seed aplicado." });
    } catch (err) {
      console.error("[SEED-DEMO] error:", err);
      res.status(500).json({ message: "Seed failed", error: String(err) });
    }
  });

  /* ===== 404 & error handler ===== */
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res
      .status(typeof err?.status === "number" ? err.status : 500)
      .json({ message: "Internal server error" });
  });
}
