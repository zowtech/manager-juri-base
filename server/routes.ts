// server/routes.ts  — versão completa/estendida
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
  insertUserSchema,
  updateUserSchema,
  insertCaseSchema,
} from "@shared/schema";

const scryptAsync = promisify(crypto.scrypt);
const upload = multer({ dest: "uploads/" });

interface AuthenticatedRequest extends Request {
  user?: any;
}

function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Unauthorized" });
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

export function registerRoutes(app: Express): void {
  /** sanity check */
  app.get("/api/test", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  /** auth + sessão */
  setupAuth(app);

  /** usuário logado */
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

  /* ==================== CASES ==================== */

  app.get("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const { status, search, limit, orderBy } = req.query;
      const list = await storage.getCases({ status, search } as any);
      const sorted =
        orderBy === "recent"
          ? [...list].sort(
              (a: any, b: any) =>
                new Date(b.updatedAt || b.createdAt || 0).getTime() -
                new Date(a.updatedAt || a.createdAt || 0).getTime()
            )
          : list;
      res.json(limit ? sorted.slice(0, Number(limit)) : sorted);
    } catch (err) {
      console.error("Error fetching cases:", err);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get("/api/cases/:id", isAuthenticated, async (req, res) => {
    try {
      const c = await storage.getCaseById(req.params.id);
      if (!c) return res.status(404).json({ message: "Case not found" });
      res.json(c);
    } catch (err) {
      console.error("Error fetching case:", err);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== "admin")
        return res.status(403).json({ message: "Insufficient permissions" });

      const withDates = {
        ...req.body,
        dueDate: parseBRDate(req.body?.dueDate) ?? req.body?.dueDate ?? null,
        hearingDate: parseBRDate(req.body?.hearingDate) ?? req.body?.hearingDate ?? null,
        startDate: parseBRDate(req.body?.startDate) ?? req.body?.startDate ?? null,
        createdById: req.user.id,
      };

      const validated = insertCaseSchema.parse(withDates);
      const created = await storage.createCase(validated);

      await logActivity(
        req,
        "CREATE_CASE",
        "CASE",
        created.id,
        `Criou processo ${created.processNumber} - Cliente: ${created.clientName}`
      );

      res.status(201).json(created);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: err.errors });
      }
      console.error("❌ Error creating case:", err);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  app.patch("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const found = await storage.getCaseById(id);
      if (!found) return res.status(404).json({ message: "Case not found" });

      if (req.user?.role !== "admin") {
        const allowed = ["description", "dueDate", "assignedToId"];
        const bad = Object.keys(req.body).some((k) => !allowed.includes(k));
        if (bad) return res.status(403).json({ message: "Insufficient permissions to edit these fields" });
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

  // ⇩⇩ ROTA DE STATUS (faltava)
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

  app.delete("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Insufficient permissions" });
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

  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      const stats = await storage.getCaseStats();
      res.json(stats);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // ⇩⇩ endpoints de layout (faltavam)
  app.get("/api/dashboard/layout", isAuthenticated, async (req: any, res) => {
    try {
      const layout = await storage.getDashboardLayout(req.user!.id);
      res.json(layout);
    } catch (err) {
      console.error("Error fetching dashboard layout:", err);
      res.status(500).json({ message: "Failed to fetch dashboard layout" });
    }
  });

  app.post("/api/dashboard/layout", isAuthenticated, async (req: any, res) => {
    try {
      const { layout, widgets } = req.body;
      const saved = await storage.saveDashboardLayout(req.user!.id, layout, widgets);
      await logActivity(req, "UPDATE_DASHBOARD", "DASHBOARD", saved.id, "Personalizou layout do dashboard", {
        widgetCount: widgets?.length || 0,
      });
      res.json(saved);
    } catch (err) {
      console.error("Error saving dashboard layout:", err);
      res.status(500).json({ message: "Failed to save dashboard layout" });
    }
  });

  /* ==================== ACTIVITY LOG ==================== */

  app.get("/api/activity-logs", isAuthenticated, async (req, res) => {
    try {
      const { action, date, search, limit, processOnly } = req.query as any;
      const logs = await storage.getActivityLogs({
        action,
        date,
        search,
        limit: limit ? Number(limit) : undefined,
        processOnly: processOnly === "true",
      });
      res.json(logs);
    } catch (err) {
      console.error("❌ Erro ao buscar logs de atividade:", err);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

// Alias para singular: /api/activity-log -> usa o mesmo handler
app.get("/api/activity-log", isAuthenticated, async (req, res) => {
  try {
    const { action, date, search, limit, processOnly } = req.query as any;
    const logs = await storage.getActivityLogs({
      action,
      date,
      search,
      limit: limit ? Number(limit) : undefined,
      processOnly: processOnly === "true",
    });
    res.json(logs);
  } catch (err) {
    console.error("❌ Erro ao buscar logs de atividade (alias):", err);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
});

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

      const [updated] = await db.update(employeesTable).set(patch).where(eq(employeesTable.id, id)).returning();

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

  // ⇩⇩ export (xlsx) — precisa do pacote "xlsx" instalado
  app.get("/api/employees/export", isAuthenticated, async (_req, res) => {
    try {
      // @ts-ignore
      const XLSX = require("xlsx");
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

      await logActivity(_req as any, "EXPORT_EMPLOYEES", "EMPLOYEE", "all", `Exportou ${all.length} funcionários`);
    } catch (err) {
      console.error("Error exporting employees:", err);
      res.status(500).json({ message: "Failed to export employees" });
    }
  });

  // ⇩⇩ import + link-cases (como você tinha)
  app.post("/api/employees/import", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (req.user?.role !== "admin") return res.status(403).json({ message: "Insufficient permissions" });
      if (!req.file) return res.status(400).json({ success: false, error: "Nenhum arquivo enviado" });

      const { importEmployeesFromExcel } = await import("./importEmployees");
      const result = await importEmployeesFromExcel(req.file.path);
      fs.unlinkSync(req.file.path);

      await logActivity(req, "IMPORT_EMPLOYEES", "EMPLOYEE", "bulk", `Importou ${result.imported} funcionários do Excel`);
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

  /* ==================== USERS ==================== */

  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user?.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const result = await pool.query(`
        select id, email, username, first_name, last_name, role, permissions, created_at, updated_at
        from public.users
        order by created_at desc
      `);

      const out = result.rows.map((u: any) => ({
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
      res.json(out);
    } catch (err: any) {
      console.error("[USERS/LIST] DB error:", err);
      res.status(500).json({ message: "DB error" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user?.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const data = insertUserSchema.parse(req.body);
      const password = data.password && data.password.trim() !== "" ? data.password : "temp123";

      const salt = crypto.randomBytes(16);
      const key = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashed = `${salt.toString("hex")}:${key.toString("hex")}`;

      await db.insert(usersTable).values({
        id: crypto.randomUUID(),
        email: data.email || null,
        username: data.username,
        password: hashed,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        role: data.role || "user",
        permissions: data.permissions || null,
      });

      res.status(201).json({ ok: true });
    } catch (err: any) {
      console.error("❌ ERRO COMPLETO AO CRIAR USUÁRIO:", err);
      res.status(500).json({ message: "Falha ao criar usuário" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user?.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const data = updateUserSchema.parse(req.body);
      const patch: any = {
        email: data.email ?? undefined,
        username: data.username ?? undefined,
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        role: data.role ?? undefined,
        permissions: data.permissions ?? undefined,
      };
      Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

      if (data.password && data.password.trim() !== "") {
        const salt = crypto.randomBytes(16);
        const key = (await scryptAsync(data.password, salt, 64)) as Buffer;
        patch.password = `${salt.toString("hex")}:${key.toString("hex")}`;
      }

      await db.update(usersTable).set(patch).where(eq(usersTable.id, req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Error updating user:", err);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user?.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });
    await db.delete(usersTable).where(eq(usersTable.id, req.params.id));
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  /* ===== 404 e error handler ===== */
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(typeof err?.status === "number" ? err.status : 500).json({ message: "Internal server error" });
  });
}
