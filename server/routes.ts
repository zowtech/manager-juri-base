import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertCaseSchema, insertUserSchema, loginUserSchema } from "@shared/schema";
import { z } from "zod";

// Middleware to check authentication
const isAuthenticated = (req: Request, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Auth routes
  app.get('/api/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Activity logging middleware
  const logActivity = async (req: AuthenticatedRequest, action: string, resourceType: string, resourceId: string, description: string) => {
    try {
      await storage.logActivity({
        userId: req.user.id,
        action,
        resourceType,
        resourceId,
        description,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
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
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const validatedData = insertCaseSchema.parse(req.body);
      const newCase = await storage.createCase(validatedData, req.user.claims.sub);
      
      await logActivity(
        req,
        'create',
        'case',
        newCase.id,
        `Criou novo processo para ${newCase.clientName}`
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
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const caseData = await storage.getCaseById(id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Check permissions - admin can edit everything, editor can only edit certain fields
      if (user.role !== 'admin') {
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
        'edit',
        'case',
        id,
        `Editou processo ${caseData.clientName}`
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

      const completedDate = status === 'concluido' ? new Date() : undefined;
      const updatedCase = await storage.updateCaseStatus(id, status, completedDate);
      
      await logActivity(
        req,
        'status_change',
        'case',
        id,
        `Alterou status do processo ${caseData.clientName} para ${status}`
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
      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const caseData = await storage.getCaseById(id);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      await storage.deleteCase(id);
      
      await logActivity(
        req,
        'delete',
        'case',
        id,
        `Excluiu processo ${caseData.clientName}`
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

  // Activity log routes
  app.get('/api/activity-logs', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const { action, date } = req.query;
      const logs = await storage.getActivityLogs({
        action: action as string,
        date: date as string,
      });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
