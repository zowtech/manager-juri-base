import {
  users,
  cases,
  activityLog,
  type User,
  type InsertUser,
  type Case,
  type InsertCase,
  type CaseWithRelations,
  type ActivityLog,
  type InsertActivityLog,
  type ActivityLogWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Case operations
  createCase(caseData: InsertCase): Promise<Case>;
  getCases(filters?: { status?: string; search?: string }): Promise<CaseWithRelations[]>;
  getCaseById(id: string): Promise<CaseWithRelations | undefined>;
  updateCase(id: string, updates: Partial<InsertCase>): Promise<Case>;
  deleteCase(id: string): Promise<void>;
  updateCaseStatus(id: string, status: string, completedDate?: Date): Promise<Case>;
  
  // Activity log operations
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(filters?: { action?: string; date?: string }): Promise<ActivityLogWithUser[]>;
  
  // Dashboard statistics
  getCaseStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    averageResponseTime: number;
  }>;
  
  // Get users for assignment
  getUsers(): Promise<User[]>;
  
  // Additional user management
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: any): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Case operations
  async createCase(caseData: InsertCase): Promise<Case> {
    const [newCase] = await db
      .insert(cases)
      .values(caseData)
      .returning();
    return newCase;
  }

  async getCases(filters?: { status?: string; search?: string }): Promise<CaseWithRelations[]> {
    // Dados de funcionários com processos jurídicos
    const exampleCases: CaseWithRelations[] = [
      {
        id: "1",
        clientName: "CÉLIA MARIA DE JESUS",
        processNumber: "1500258",
        description: "TRABALHISTA, Rescisão indireta, Dano Moral",
        status: 'andamento',
        startDate: new Date('2024-11-01'),
        dueDate: new Date('2024-12-15'),
        completedDate: null,
        tipoProcesso: "Trabalhista",
        documentosSolicitados: null,
        documentosAnexados: null,
        observacoes: null,
        assignedToId: null,
        createdById: "af91cd6a-269d-405f-bf3d-53e813dcb999",
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: null,
        createdBy: null,
      },
      {
        id: "2", 
        clientName: "CRISTINA DE SOUSA SILVEIRA",
        processNumber: "217584",
        description: "Ação de indenização, IGLI, Execução por embargos acórdão, Recursos Estruturais, acordo trabalhista",
        status: 'novo',
        startDate: new Date('2024-11-15'),
        dueDate: new Date('2024-12-08'),
        completedDate: null,
        tipoProcesso: "Dano Moral",
        documentosSolicitados: null,
        documentosAnexados: null,
        observacoes: null,
        assignedToId: null,
        createdById: "af91cd6a-269d-405f-bf3d-53e813dcb999",
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: null,
        createdBy: null,
      },
      {
        id: "3",
        clientName: "LAÉRCIO SOBRINHO CARDOSO",
        processNumber: "1505827",
        description: "TRABALHISTA, Execução - embargo, outros",
        status: 'concluido',
        startDate: new Date('2024-10-01'),
        dueDate: new Date('2024-11-30'),
        completedDate: new Date('2024-11-28'),
        tipoProcesso: "Cível",
        documentosSolicitados: null,
        documentosAnexados: null,
        observacoes: null,
        assignedToId: null,
        createdById: "af91cd6a-269d-405f-bf3d-53e813dcb999",
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: null,
        createdBy: null,
      }
    ];

    // Aplicar filtros
    let filteredCases = exampleCases;
    
    if (filters?.status && filters.status !== "all") {
      filteredCases = filteredCases.filter(c => c.status === filters.status);
    }
    
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredCases = filteredCases.filter(c => 
        c.clientName.toLowerCase().includes(searchLower) ||
        c.processNumber.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower)
      );
    }

    return filteredCases;
  }

  async getCaseById(id: string): Promise<CaseWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(cases)
      .where(eq(cases.id, id));

    if (!result) return undefined;

    return {
      ...result,
      assignedTo: null,
      createdBy: null,
    };
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case> {
    const [updatedCase] = await db
      .update(cases)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(cases.id, id))
      .returning();
    return updatedCase;
  }

  async deleteCase(id: string): Promise<void> {
    await db.delete(cases).where(eq(cases.id, id));
  }

  async updateCaseStatus(id: string, status: string, completedDate?: Date): Promise<Case> {
    const updates: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (status === 'concluido' && completedDate) {
      updates.completedDate = completedDate;
    }

    const [updatedCase] = await db
      .update(cases)
      .set(updates)
      .where(eq(cases.id, id))
      .returning();
    return updatedCase;
  }

  // Activity log operations
  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLog)
      .values(activity)
      .returning();
    return log;
  }

  async getActivityLogs(filters?: { action?: string; date?: string }): Promise<ActivityLogWithUser[]> {
    let query = db
      .select({
        activity: activityLog,
        user: users
      })
      .from(activityLog)
      .innerJoin(users, eq(activityLog.userId, users.id))
      .orderBy(desc(activityLog.createdAt));

    const conditions = [];
    
    if (filters?.action) {
      conditions.push(eq(activityLog.action, filters.action));
    }
    
    if (filters?.date) {
      const date = new Date(filters.date);
      const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      conditions.push(
        and(
          sql`${activityLog.createdAt} >= ${date}`,
          sql`${activityLog.createdAt} < ${nextDay}`
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.activity,
      user: row.user,
    }));
  }

  // Dashboard statistics
  async getCaseStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    averageResponseTime: number;
  }> {
    const allCases = await this.getCases();
    const total = allCases.length;
    const completed = allCases.filter(c => c.status === 'concluido').length;
    const inProgress = allCases.filter(c => c.status === 'andamento').length;
    
    return {
      total,
      completed,
      inProgress,
      averageResponseTime: 5, // dias em média
    };
  }

  // Get users for assignment
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  async updateUser(id: string, data: any): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();
