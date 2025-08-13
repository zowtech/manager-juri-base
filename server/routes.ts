import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}
import { insertCaseSchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import { z } from "zod";
import { db, pool } from "./db";
import { employees } from "@shared/schema";
import { sql, eq } from "drizzle-orm";



// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

// Authentication middleware
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Test route to verify API routing works
  app.get('/api/test', (req, res) => {
    console.log('🟢 TEST ROUTE HIT');
    res.json({ message: 'API routing is working', timestamp: new Date().toISOString() });
  });

  // Auth middleware
  setupAuth(app);

  // Auth routes
  app.get('/api/user', async (req: any, res: any) => {
    console.log('🔍 USER CHECK:', req.isAuthenticated(), req.user);
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Usar storage para buscar o usuário com permissões
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        console.log('❌ USUÁRIO NÃO ENCONTRADO');
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('✅ USUÁRIO CARREGADO:', user.username, 'Permissões:', JSON.stringify(user.permissions, null, 2));
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Enhanced activity logging middleware
  const logActivity = async (req: any, action: string, resourceType: string, resourceId: string, description: string, metadata?: any) => {
    try {
      const timestamp = new Date().toISOString();
      const userInfo = `${req.user.firstName} ${req.user.lastName} (${req.user.username})`;
      const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      const detailedDescription = `[${timestamp}] ${userInfo} executou: ${description}`;
      
      await storage.logActivity({
        userId: req.user.id,
        action,
        resourceType,
        resourceId,
        description: detailedDescription,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      });
      
      console.log(`📋 LOG ATIVIDADE: [${action}] ${resourceType} ${resourceId} - ${description} - Usuário: ${userInfo}`);
    } catch (error) {
      console.error('❌ Falha ao registrar log de atividade:', error);
    }
  };

  // Case routes
  app.get('/api/cases', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { status, search } = req.query;
      const cases = await storage.getCases({
        status: status as string,
        search: search as string,
      });
      
      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get('/api/cases/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const caseData = await storage.getCaseById(id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      res.json(caseData);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post('/api/cases', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const validatedData = insertCaseSchema.parse(req.body);
      const newCase = await storage.createCase(validatedData);
      
      await logActivity(
        req,
        'CREATE_CASE',
        'CASE',
        newCase.id,
        `Criou novo processo ${newCase.processNumber} - Cliente: ${newCase.clientName}`,
        { 
          processNumber: newCase.processNumber,
          clientName: newCase.clientName,
          status: newCase.status,
          dueDate: newCase.dueDate 
        }
      );

      res.status(201).json(newCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  app.patch('/api/cases/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      const { id } = req.params;

      const caseData = await storage.getCaseById(id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Check permissions - admin can edit everything, editor can only edit certain fields
      if (req.user?.role !== 'admin') {
        const allowedFields = ['description', 'dueDate', 'assignedToId'];
        const requestedFields = Object.keys(req.body);
        const hasRestrictedFields = requestedFields.some(field => !allowedFields.includes(field));
        
        if (hasRestrictedFields) {
          return res.status(403).json({ message: "Insufficient permissions to edit these fields" });
        }
      }

      const validatedData = insertCaseSchema.partial().parse(req.body);
      const updatedCase = await storage.updateCase(id, validatedData);
      
      // Log atividade apenas se usuário estiver definido
      if (req.user) {
        await logActivity(
          req as any,
          'UPDATE_CASE',
          'CASE',
          id,
          `Editou processo ${caseData.processNumber} - Cliente: ${caseData.clientName}`,
          { 
            originalData: { processNumber: caseData.processNumber, clientName: caseData.clientName },
            updatedFields: Object.keys(validatedData),
            newData: validatedData
          }
        );
      }

      res.json(updatedCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating case:", error);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  app.patch('/api/cases/:id/status', isAuthenticated, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['novo', 'pendente', 'concluido', 'atrasado'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const caseData = await storage.getCaseById(id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Lógica da dataEntrega automática
      let dataEntrega = caseData.dataEntrega;
      let completedDate = caseData.completedDate;
      
      // Se mudou para "concluido", definir dataEntrega para agora
      if (status === 'concluido' && caseData.status !== 'concluido') {
        dataEntrega = new Date();
        completedDate = new Date();
      }
      // Se mudou de "concluido" para outro status, limpar dataEntrega
      else if (status !== 'concluido' && caseData.status === 'concluido') {
        dataEntrega = null;
        completedDate = null;
      }
      
      const updatedCase = await storage.updateCaseStatus(id, status, completedDate, dataEntrega);
      
      await logActivity(
        req,
        'UPDATE_STATUS',
        'CASE',
        id,
        `Alterou status do processo ${caseData.processNumber} de "${caseData.status}" para "${status}" - Cliente: ${caseData.clientName}`,
        { 
          processNumber: caseData.processNumber,
          clientName: caseData.clientName,
          previousStatus: caseData.status,
          newStatus: status,
          completedDate: completedDate,
          dataEntrega: dataEntrega
        }
      );

      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating case status:", error);
      res.status(500).json({ message: "Failed to update case status" });
    }
  });

  app.delete('/api/cases/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const caseData = await storage.getCaseById(id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      await storage.deleteCase(id);
      
      await logActivity(
        req,
        'DELETE_CASE',
        'CASE',
        id,
        `Excluiu processo ${caseData.processNumber} - Cliente: ${caseData.clientName}`,
        { 
          deletedData: {
            processNumber: caseData.processNumber,
            clientName: caseData.clientName,
            status: caseData.status,
            description: caseData.description
          }
        }
      );

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting case:", error);
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getCaseStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Dashboard layout endpoints
  app.get('/api/dashboard/layout', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const layout = await storage.getDashboardLayout(req.user.id);
      res.json(layout);
    } catch (error) {
      console.error("Error fetching dashboard layout:", error);
      res.status(500).json({ message: "Failed to fetch dashboard layout" });
    }
  });

  app.post('/api/dashboard/layout', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { layout, widgets } = req.body;
      const savedLayout = await storage.saveDashboardLayout(req.user.id, layout, widgets);
      
      await logActivity(
        req,
        'UPDATE_DASHBOARD',
        'DASHBOARD',
        savedLayout.id,
        'Personalizou layout do dashboard',
        { widgetCount: widgets?.length || 0 }
      );

      res.json(savedLayout);
    } catch (error) {
      console.error("Error saving dashboard layout:", error);
      res.status(500).json({ message: "Failed to save dashboard layout" });
    }
  });

  // Activity log routes
  app.get('/api/activity-logs', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { action, date, search, limit } = req.query;
      
      const logs = await storage.getActivityLogs({
        action: action as string,
        date: date as string,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      
      res.json(logs);
    } catch (error) {
      console.error("❌ Erro ao buscar logs de atividade:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Employee routes
  app.get('/api/employees', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { search } = req.query;
      let employeeList;
      
      if (search) {
        const searchTerm = `%${search.toString().toLowerCase()}%`;
        employeeList = await db.select()
          .from(employees)
          .where(sql`LOWER(nome) LIKE ${searchTerm} OR LOWER(matricula) LIKE ${searchTerm}`)
          .limit(50);
      } else {
        employeeList = await db.select().from(employees).orderBy(employees.nome).limit(100);
      }
      
      res.json(employeeList);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Create employee
  app.post('/api/employees', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const employeeData = req.body;
      
      // Validar dados obrigatórios
      if (!employeeData.matricula || !employeeData.nome) {
        return res.status(400).json({ message: "Matrícula e nome são obrigatórios" });
      }

      // Verificar se matrícula já existe
      const existing = await db.select().from(employees).where(sql`matricula = ${employeeData.matricula}`);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Matrícula já existe" });
      }

      const [newEmployee] = await db.insert(employees).values({
        matricula: employeeData.matricula,
        nome: employeeData.nome,
        rg: employeeData.rg || null,
        departamento: employeeData.departamento || null,
        cargo: employeeData.cargo || null,
        dataAdmissao: employeeData.dataAdmissao ? new Date(employeeData.dataAdmissao) : null,
        status: employeeData.status || 'ativo',
        email: employeeData.email || null,
        telefone: employeeData.telefone || null,
        endereco: employeeData.endereco || null,
      }).returning();

      await logActivity(
        req,
        'CREATE_EMPLOYEE',
        'EMPLOYEE',
        newEmployee.id,
        `Criou funcionário ${newEmployee.nome} (${newEmployee.matricula})`
      );

      res.status(201).json(newEmployee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  // Update employee
  app.put('/api/employees/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const employeeData = req.body;

      // Verificar se funcionário existe
      const existing = await db.select().from(employees).where(eq(employees.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ message: "Funcionário não encontrado" });
      }

      const [updatedEmployee] = await db.update(employees)
        .set({
          ...employeeData,
          dataAdmissao: employeeData.dataAdmissao ? new Date(employeeData.dataAdmissao) : null,
          updatedAt: new Date(),
        })
        .where(eq(employees.id, id))
        .returning();

      await logActivity(
        req,
        'UPDATE_EMPLOYEE',
        'EMPLOYEE',
        id,
        `Atualizou funcionário ${updatedEmployee.nome} (${updatedEmployee.matricula})`
      );

      res.json(updatedEmployee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  // Delete employee
  app.delete('/api/employees/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      // Verificar se funcionário existe
      const existing = await db.select().from(employees).where(eq(employees.id, id));
      if (existing.length === 0) {
        return res.status(404).json({ message: "Funcionário não encontrado" });
      }

      const employee = existing[0];
      
      // Soft delete - marcar como deletado em vez de apagar
      await db.update(employees).set({ 
        status: 'deletado',
        updatedAt: new Date()
      }).where(eq(employees.id, id));

      await logActivity(
        req,
        'DELETE_EMPLOYEE',
        'EMPLOYEE',
        id,
        `Marcou funcionário como deletado: ${employee.nome} (${employee.matricula})`
      );

      res.json({ message: "Funcionário marcado como deletado", id });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Export employees
  app.get('/api/employees/export', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const allEmployees = await db.select().from(employees).orderBy(employees.nome);
      
      const XLSX = require('xlsx');
      const workbook = XLSX.utils.book_new();
      
      const worksheetData = [
        ['Empresa', 'Nome do Funcionário', 'Código do Funcionário', 'Número do RG', 'Email', 'Telefone', 'Data Admissão', 'Status', 'Descrição do Cargo', 'Departamento', 'Endereço']
      ];

      allEmployees.forEach(emp => {
        worksheetData.push([
          'BASE FACILITIES',
          emp.nome,
          emp.matricula,
          emp.rg || '',
          emp.email || '',
          emp.telefone || '',
          emp.dataAdmissao ? new Date(emp.dataAdmissao).toLocaleDateString('pt-BR') : '',
          emp.status,
          emp.cargo || '',
          emp.departamento || '',
          emp.endereco || ''
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Funcionários');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', `attachment; filename="funcionarios_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);

      await logActivity(
        req,
        'EXPORT_EMPLOYEES',
        'EMPLOYEE',
        'all',
        `Exportou ${allEmployees.length} funcionários`
      );

    } catch (error) {
      console.error("Error exporting employees:", error);
      res.status(500).json({ message: "Failed to export employees" });
    }
  });

  // Setup multer for file uploads
  const upload = multer({ dest: 'uploads/' });
  app.post('/api/employees/import', isAuthenticated, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      }

      const { importEmployeesFromExcel } = await import('./importEmployees');
      const result = await importEmployeesFromExcel(req.file.path);
      
      // Limpar arquivo temporário
      fs.unlinkSync(req.file.path);
      
      await logActivity(
        req,
        'IMPORT_EMPLOYEES',
        'EMPLOYEE',
        'bulk',
        `Importou ${result.imported} funcionários do Excel`
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error importing employees:", error);
      res.status(500).json({ success: false, error: "Failed to import employees: " + error.message });
    }
  });

  app.post('/api/employees/link-cases', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { linkCasesToEmployees } = await import('./importEmployees');
      const result = await linkCasesToEmployees();
      res.json(result);
    } catch (error) {
      console.error("Error linking cases:", error);
      res.status(500).json({ message: "Failed to link cases" });
    }
  });



  // User management routes
  app.get("/api/users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUser = await storage.getUser(req.user?.id);
      
      // Only admins can manage users
      if (currentUser?.role !== 'admin') {
        await logActivity(req, 'DENIED_ACCESS', 'USER_MANAGEMENT', 'access', `Tentativa de acesso negada ao gerenciamento de usuários`);
        return res.status(403).json({ message: "Access denied" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('🔄 POST /api/users - Criando usuário:', req.body);
      
      const currentUser = await storage.getUser(req.user?.id);
      
      // Only admins can create users
      if (currentUser?.role !== 'admin') {
        console.log('❌ Acesso negado - usuário não é admin:', currentUser?.role);
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userData = insertUserSchema.parse(req.body);
      console.log('✅ Dados validados pelo schema:', userData);
      
      // Verificar duplicatas
      const existingByUsername = await storage.getUserByUsername(userData.username);
      if (existingByUsername) {
        console.log('❌ Username já existe:', userData.username);
        return res.status(400).json({ message: `Usuário "${userData.username}" já existe` });
      }

      if (userData.email) {
        const existingByEmail = await storage.getUserByEmail(userData.email);
        if (existingByEmail) {
          console.log('❌ Email já existe:', userData.email);
          return res.status(400).json({ message: `Email "${userData.email}" já está em uso` });
        }
      }
      
      // Se a senha estiver vazia ou undefined, gerar uma senha padrão temporária
      const password = userData.password && userData.password.trim() !== "" 
        ? userData.password 
        : "temp123"; // Senha temporária padrão
      
      console.log('🔐 Hash da senha...');
      const hashedPassword = await hashPassword(password);
      
      console.log('💾 Criando usuário no banco...');
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        // Garantir que campos opcionais tenham valores padrão apropriados
        email: userData.email || null,
        username: userData.username || `user_${Date.now()}`,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
      });
      
      console.log('✅ Usuário criado com sucesso:', newUser.username);
      
      await logActivity(
        req,
        'CREATE_USER',
        'USER',
        newUser.id,
        `Criou usuário ${newUser.username}`,
        { username: newUser.username, email: newUser.email }
      );
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("❌ ERRO COMPLETO AO CRIAR USUÁRIO:", error);
      
      if (error instanceof z.ZodError) {
        console.log('❌ Erro de validação Zod:', error.errors);
        res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors,
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      } else if (error.message?.includes('já existe')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ 
          message: "Falha ao criar usuário", 
          error: error.message,
          details: "Verifique a conexão com o banco de dados"
        });
      }
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUser = await storage.getUser(req.user?.id);
      
      // Only admins can update users
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userData = updateUserSchema.parse(req.body);
      
      // Se há uma nova senha, hash ela. Caso contrário, não atualizar a senha
      let updateData = { ...userData };
      if (userData.password && userData.password.trim() !== "") {
        updateData.password = await hashPassword(userData.password);
      } else {
        // Remove o campo password para não atualizar
        delete updateData.password;
      }
      
      const updatedUser = await storage.updateUser(req.params.id, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const currentUser = await storage.getUser(req.user?.id);
      
      // Only admins can delete users
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
