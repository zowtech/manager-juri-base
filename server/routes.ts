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

/* ---------------- Helpers ---------------- */
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
      action,
      resourceType,
      resourceId,
      description,
      ipAddress,
      userAgent,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });
  } catch (e) {
    console.error("❌ Falha ao registrar log de atividade:", e);
  }
};

interface AuthenticatedRequest extends Request {
  user?: any;
}

/* ---------------- Rotas ---------------- */
export function registerRoutes(app: Express): void {
  app.get("/api/test", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  setupAuth(app);

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

  /* =========== USERS =========== */
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
      await logActivity(req, "DELETE_USER", "USER", req.params.id, `Excluiu usuário`);
      res.status(204).send();
    } catch (err) {
      console.error("[USERS/DELETE] error:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  /* =========== CASES =========== */

  // LIST
  app.get("/api/cases", isAuthenticated, async (req, res) => {
    try {
      const { status, search, limit, orderBy } = req.query as any;

      const params: any[] = [];
      let where = "WHERE 1=1";

      if (status) {
        params.push(status);
        where += ` AND c.status = $${params.length}`;
      }

      if (search) {
        const like = `%${String(search).toLowerCase()}%`;
        params.push(like, like, like, like);
        where += ` AND (LOWER(c.client_name)   LIKE $${params.length - 3}
                    OR LOWER(c.process_number) LIKE $${params.length - 2}
                    OR LOWER(e.name)           LIKE $${params.length - 1}
                    OR LOWER(e.registration)   LIKE $${params.length})`;
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

      const mapped = rows.map((r: any) => ({
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
        status: r.status,
        archived: r.archived,
        deleted: r.deleted,
        createdAt: r.created_at,
        updatedAt: r.updated_at,

        employeeId: r.employee_id,
        employeeName: r.employee_name,
        employeeRegistration: r.employee_registration,

        // aliases e objetos esperados pela UI
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
      }));

      res.json(mapped);
    } catch (error) {
      console.error("Error fetching cases:", error);
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
        status: r.status,
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

  // CREATE
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

      const toDate = (v: any) => (v ? new Date(v) : null);

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

  // UPDATE STATUS
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
      let dataEntrega = c.dataEntrega;
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

  // PATCH
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

  // DELETE
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

  /* =========== DASHBOARD =========== */

  // --- Cards (robusto a variações de status/acentos) ---
  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      const q = `
        select 
          count(*)::int as total,
          sum( (lower(coalesce(status,'')) like 'novo%')::int )::int      as novo,
          sum( (lower(coalesce(status,'')) like 'pend%')::int )::int     as pendente,
          sum( (lower(coalesce(status,'')) like 'atras%')::int )::int    as atrasado,
          sum( (lower(coalesce(status,'')) like 'conclu%')::int )::int   as concluido,
          sum( (due_date < now() and not (lower(coalesce(status,'')) like 'conclu%'))::int )::int as vencidos
        from public.cases
      `;
      const { rows: [r] } = await pool.query(q);
      const payload = {
        total:     r?.total      ?? 0,
        novo:      r?.novo       ?? 0,
        pendente:  r?.pendente   ?? 0,
        atrasado:  r?.atrasado   ?? 0,
        concluido: r?.concluido  ?? 0,
        vencidos:  r?.vencidos   ?? 0,
      };
      console.log("[DASH/STATS]", payload);
      res.set("Cache-Control", "no-store");
      res.json(payload);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // --- Últimas Atualizações ---
  app.get("/api/dashboard/updates", isAuthenticated, async (_req, res) => {
    try {
      const q = `
        select
          c.id, c.client_name, c.process_number, c.status, c.updated_at,
          e.id as employee_id, e.name as employee_name, e.registration as employee_registration
        from public.cases c
        left join public.employees e on e.id = c.employee_id
        order by c.updated_at desc nulls last, c.created_at desc
        limit 10
      `;
      const { rows } = await pool.query(q);
      res.json(rows.map((r: any) => ({
        id: r.id,
        clientName: r.client_name,
        processNumber: r.process_number,
        status: r.status,
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
      })));
    } catch (err) {
      console.error("Error fetching dashboard updates:", err);
      res.status(500).json({ message: "Failed to fetch updates" });
    }
  });

  /* =========== ACTIVITY LOG =========== */
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

  /* =========== EMPLOYEES =========== */
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
        `Criou funcionário ${created.name} - Matrícula: ${created.registration}`
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

      await logActivity(req, "UPDATE_EMPLOYEE", "EMPLOYEE", id, `Atualizou funcionário ${updated.name}`);

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
      await logActivity(req, "DELETE_EMPLOYEE", "EMPLOYEE", id, `Removeu funcionário ${cur[0].name}`);

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

  /* =========== SEED DEMO =========== */
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

      const usersData = [
        { id: crypto.randomUUID(), email: "admin@example.com",  username: "admin",  password: mkPass("admin123"),  first_name: "System", last_name: "Admin", role: "admin",  permissions: JSON.stringify({ users: ["create","update","delete"] }) },
        { id: crypto.randomUUID(), email: "editor@example.com", username: "editor", password: mkPass("editor123"), first_name: "Erica",  last_name: "Editor", role: "editor", permissions: JSON.stringify({ cases: ["create","update"] }) },
        { id: crypto.randomUUID(), email: "maria@example.com",  username: "maria",  password: mkPass("user123"),   first_name: "Maria",  last_name: "Silva",  role: "user",   permissions: JSON.stringify({}) },
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
            id, empId, clientName, i % 2 === 0 ? "Trabalhista" : "Cível", processNumber,
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

  /* 404 & error */
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res
      .status(typeof err?.status === "number" ? err.status : 500)
      .json({ message: "Internal server error" });
  });
}
