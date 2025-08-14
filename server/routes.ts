// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import * as fs from "fs";
import multer from "multer";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { sql, eq } from "drizzle-orm";

import { setupAuth } from "./auth";
import { storage } from "./storage"; // sua camada DB-backed
import { db, pool } from "./db";

// Schemas Drizzle (snake_case no banco, camelCase no código)
import {
  users as usersTable,
  employees as employeesTable,
} from "@shared/schema";

// Se você tiver zod schemas no shared, mantenha estes imports
import { z } from "zod";
import {
  insertCaseSchema,
  insertUserSchema,
  updateUserSchema,
  // User // (se precisar do tipo)
} from "@shared/schema";

// Utilidades para data/moeda (se criadas em server/utils/normalize.ts)
import { parseBRDate, parseBRMoney } from "./utils/normalize";

// ===== helpers =====
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

interface AuthenticatedRequest extends Request {
  user?: any;
}

function isAuthenticated(req: any, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Unauthorized" });
}

// Log de atividade (usa sua camada storage)
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

// =====================================================
// ================ REGISTER ROUTES ====================
// =====================================================
export function registerRoutes(app: Express): void {
  // TEST
  app.get("/api/test", (_req, res) => {
    res.json({ message: "API routing is working", timestamp: new Date().toISOString() });
  });

  // AUTH
  setupAuth(app);

  // ------- Current user -------
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

  // ================= CASES =================
  // (mantidos como estavam, delegando ao storage)
  app.get("/api/cases", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { status, search, limit, orderBy } = req.query as any;
      const cases = await storage.getCases({ status, search });
      let data = cases;
      if (orderBy === "recent") {
        data = cases.sort((a: any, b: any) => {
          const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dbb = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dbb - da;
        });
      }
      res.json(limit ? data.slice(0, Number(limit)) : data);
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

      // normaliza datas se vierem como dd/mm/aaaa
      const withDates = {
        ...req.body,
        dueDate: parseBRDate(req.body?.dueDate) ?? req.body?.dueDate ?? null,
        dataAudiencia: parseBRDate(req.body?.dataAudiencia) ?? req.body?.dataAudiencia ?? null,
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
        `Criou processo ${created.processNumber} - Cliente: ${created.clientName}`,
        { processNumber: created.processNumber, clientName: created.clientName, status: created.status }
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
      };
      Object.keys(patch).forEach((k) => patch[k as keyof typeof patch] === undefined && delete (patch as any)[k]);

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

  // ================= DASHBOARD =================
  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      const stats = await storage.getCaseStats();
      res.json(stats);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

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

  // ================= ACTIVITY LOG =================
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

  // ================= EMPLOYEES =================
  // GET (busca por nome/matrícula). Retorna **tanto** snake_case (inglês) quanto aliases PT.
  app.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const term = (String((req.query as any).search || "") || "").toLowerCase();
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

      // adiciona aliases PT para compatibilidade com o front
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

  // CREATE
  app.post("/api/employees", isAuthenticated, async (req: any, res) => {
    try {
      // aceita tanto camelCase quanto PT no body
      const body = req.body || {};
      const companyId = body.companyId ?? body.empresa ?? 1;
      const name = body.name ?? body.nome;
      const registration = body.registration ?? body.matricula;
      const rg = body.rg ?? null;
      const pis = body.pis ?? null;
      const admissionDate = parseBRDate(body.admissionDate ?? body.dataAdmissao);
      const terminationDate = parseBRDate(body.terminationDate ?? body.dataDemissao);
      const salary = parseBRMoney(body.salary ?? body.salario);
      const role = body.role ?? body.cargo ?? null;
      const department = body.department ?? body.departamento ?? null;
      const costCenter = body.costCenter ?? body.centroCusto ?? null;

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
        // aliases PT
        empresa: created.companyId,
        nome: created.name,
        matricula: created.registration,
        dataAdmissao: created.admissionDate,
        dataDemissao: created.terminationDate,
        centroCusto: created.costCenter,
        cargo: created.role,
        departamento: created.department,
      });
    } catch (err: any) {
      console.error("[EMPLOYEES/CREATE] DB error:", err);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  // UPDATE (PATCH)
  app.patch("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const cur = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
      if (!cur.length) return res.status(404).json({ message: "Funcionário não encontrado" });

      const body = req.body || {};
      const patch: any = {
        companyId: body.companyId ?? body.empresa,
        name: body.name ?? body.nome,
        registration: body.registration ?? body.matricula,
        rg: body.rg,
        pis: body.pis,
        admissionDate: parseBRDate(body.admissionDate ?? body.dataAdmissao) ?? body.admissionDate,
        terminationDate: parseBRDate(body.terminationDate ?? body.dataDemissao) ?? body.terminationDate,
        salary: parseBRMoney(body.salary ?? body.salario) ?? body.salary,
        role: body.role ?? body.cargo,
        department: body.department ?? body.departamento,
        costCenter: body.costCenter ?? body.centroCusto,
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

  // DELETE (hard delete; remova se preferir soft delete)
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

  // IMPORT/EXPORT (mantidos; export usa XLSX se estiver no package.json)
  const upload = multer({ dest: "uploads/" });
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

  app.get("/api/employees/export", isAuthenticated, async (req, res) => {
    try {
      // cuidado: requer "xlsx" no package.json
      // @ts-ignore
      const XLSX = require("xlsx");
      const all = await db.select().from(employeesTable).orderBy(employeesTable.name);

      const worksheetData = [
        [
          "Empresa",
          "Nome do Funcionário",
          "Matrícula",
          "RG",
          "Data Admissão",
          "Cargo",
          "Departamento",
          "Centro de Custo",
        ],
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

      await logActivity(req, "EXPORT_EMPLOYEES", "EMPLOYEE", "all", `Exportou ${all.length} funcionários`);
    } catch (err) {
      console.error("Error exporting employees:", err);
      res.status(500).json({ message: "Failed to export employees" });
    }
  });

  // ================= USERS (gestão via API) =================
  // LIST
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user?.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      // snake_case no banco
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

  // CREATE
  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user?.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const userData = insertUserSchema.parse(req.body);
      // dup checks
      if (userData.username && (await storage.getUserByUsername(userData.username)))
        return res.status(400).json({ message: `Usuário "${userData.username}" já existe` });
      if (userData.email && (await storage.getUserByEmail(userData.email)))
        return res.status(400).json({ message: `Email "${userData.email}" já está em uso` });

      const passwordPlain =
        userData.password && userData.password.trim() !== "" ? userData.password : "temp123";
      const hashed = await hashPassword(passwordPlain);

      const created = await storage.createUser({
        ...userData,
        password: hashed,
        email: userData.email || null,
        username: userData.username || `user_${Date.now()}`,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
      });

      await logActivity(req, "CREATE_USER", "USER", created.id, `Criou usuário ${created.username}`);
      res.status(201).json(created);
    } catch (err: any) {
      console.error("❌ ERRO COMPLETO AO CRIAR USUÁRIO:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: err.errors });
      }
      res.status(500).json({ message: "Falha ao criar usuário" });
    }
  });

  // UPDATE
  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user?.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const userData = updateUserSchema.parse(req.body);
      const patch: any = { ...userData };
      if (userData.password && userData.password.trim() !== "") {
        patch.password = await hashPassword(userData.password);
      } else {
        delete patch.password;
      }

      const updated = await storage.updateUser(req.params.id, patch);
      res.json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: err.errors });
      }
      console.error("Error updating user:", err);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // DELETE
  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const me = await storage.getUser(req.user?.id);
      if (me?.role !== "admin") return res.status(403).json({ message: "Access denied" });
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // 404 e error handler para API
  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(typeof err?.status === "number" ? err.status : 500).json({ message: "Internal server error" });
  });
}
