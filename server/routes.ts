import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertCaseSchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { employees } from "@shared/schema";
import { sql } from "drizzle-orm";



// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user: {
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
  app.get('/api/user', (req, res) => {
    console.log('🔍 USER CHECK:', req.isAuthenticated(), req.user);
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

  // Enhanced activity logging middleware
  const logActivity = async (req: AuthenticatedRequest, action: string, resourceType: string, resourceId: string, description: string, metadata?: any) => {
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

  app.patch('/api/cases/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const caseData = await storage.getCaseById(id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Check permissions - admin can edit everything, editor can only edit certain fields
      if (req.user.role !== 'admin') {
        const allowedFields = ['description', 'dueDate', 'assignedToId'];
        const requestedFields = Object.keys(req.body);
        const hasRestrictedFields = requestedFields.some(field => !allowedFields.includes(field));
        
        if (hasRestrictedFields) {
          return res.status(403).json({ message: "Insufficient permissions to edit these fields" });
        }
      }

      const validatedData = insertCaseSchema.partial().parse(req.body);
      const updatedCase = await storage.updateCase(id, validatedData);
      
      await logActivity(
        req,
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

      res.json(updatedCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating case:", error);
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  app.patch('/api/cases/:id/status', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['novo', 'andamento', 'concluido', 'pendente'].includes(status)) {
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
      const { action, date, search } = req.query;
      
      const logs = await storage.getActivityLogs({
        action: action as string,
        date: date as string,
        search: search as string,
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

  app.post('/api/employees/import', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { importEmployeesFromExcel } = await import('./importEmployees');
      const filePath = 'attached_assets/FUNCIONARIOS_1753976833587.xlsx';
      
      const result = await importEmployeesFromExcel(filePath);
      res.json(result);
    } catch (error) {
      console.error("Error importing employees:", error);
      res.status(500).json({ message: "Failed to import employees" });
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
      const currentUser = await storage.getUser(req.user?.id);
      
      // Only admins can create users
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const userData = insertUserSchema.parse(req.body);
      
      // Se a senha estiver vazia ou undefined, gerar uma senha padrão temporária
      const password = userData.password && userData.password.trim() !== "" 
        ? userData.password 
        : "temp123"; // Senha temporária padrão
      
      const hashedPassword = await hashPassword(password);
      
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
        // Garantir que campos opcionais tenham valores padrão apropriados
        email: userData.email || null,
        username: userData.username || `user_${Date.now()}`,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
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
