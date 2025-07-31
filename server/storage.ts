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
import { hashPassword } from "./auth";

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
  private userCache?: User[];
  private activityLogs: ActivityLog[] = [];
  private casesCache: CaseWithRelations[] = [];
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(user => user.email === email);
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
    // Inicializar cache se vazio
    if (this.casesCache.length === 0) {
      this.casesCache = [
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
    }

    // Aplicar filtros
    let filteredCases = [...this.casesCache];
    
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
    await this.getCases(); // Garantir que cache está inicializado
    return this.casesCache.find(c => c.id === id);
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case> {
    const allCases = await this.getCases();
    const caseToUpdate = allCases.find(c => c.id === id);
    
    if (!caseToUpdate) {
      throw new Error("Case not found");
    }
    
    // Simular atualização
    const updatedCase = {
      ...caseToUpdate,
      ...updates,
      updatedAt: new Date(),
    };
    
    return updatedCase as Case;
  }

  async deleteCase(id: string): Promise<void> {
    const allCases = await this.getCases();
    const caseExists = allCases.find(c => c.id === id);
    
    if (!caseExists) {
      throw new Error("Case not found");
    }
    
    // Para dados de exemplo, apenas simular a exclusão
    console.log(`Caso ${id} seria excluído do banco de dados`);
  }

  async updateCaseStatus(id: string, status: string, completedDate?: Date): Promise<Case> {
    await this.getCases(); // Garantir que cache está inicializado
    const caseIndex = this.casesCache.findIndex(c => c.id === id);
    
    if (caseIndex === -1) {
      throw new Error("Case not found");
    }
    
    // Atualizar o caso diretamente no cache
    this.casesCache[caseIndex] = {
      ...this.casesCache[caseIndex],
      status,
      updatedAt: new Date(),
      completedDate: status === 'concluido' ? (completedDate || new Date()) : 
                     status !== 'concluido' ? null : this.casesCache[caseIndex].completedDate
    };
    
    const updatedCase = this.casesCache[caseIndex];
    
    // Retornar o caso atualizado
    return updatedCase as Case;
  }

  // Enhanced activity log operations
  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...activity,
      ipAddress: activity.ipAddress || null,
      userAgent: activity.userAgent || null,
      metadata: activity.metadata || null,
      createdAt: new Date(),
    };
    
    // Adicionar no início para ter os mais recentes primeiro
    this.activityLogs.unshift(newLog);
    
    // Manter apenas os últimos 2000 logs para histórico mais extenso
    if (this.activityLogs.length > 2000) {
      this.activityLogs = this.activityLogs.slice(0, 2000);
    }
    
    // Console log detalhado para monitoramento
    console.log(`📋 NOVO LOG: [${newLog.action}] ${newLog.resourceType} - ${newLog.description}`);
    
    return newLog;
  }

  async getActivityLogs(filters?: { action?: string; date?: string; search?: string }): Promise<ActivityLogWithUser[]> {
    const users = await this.getUsers();
    let filteredLogs = [...this.activityLogs];

    // console.log(`🔍 Filtros aplicados: ${JSON.stringify(filters)} - Total logs: ${filteredLogs.length}`);

    if (filters?.action && filters.action !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      // console.log(`📊 Após filtro de ação '${filters.action}': ${filteredLogs.length} logs`);
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      filteredLogs = filteredLogs.filter(log => 
        log.createdAt >= date && log.createdAt < nextDay
      );
      // console.log(`📅 Após filtro de data '${filters.date}': ${filteredLogs.length} logs`);
    }

    if (filters?.search) {
      filteredLogs = filteredLogs.filter(log => 
        log.description.toLowerCase().includes(filters.search!.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search!.toLowerCase())
      );
      // console.log(`🔎 Após filtro de busca '${filters.search}': ${filteredLogs.length} logs`);
    }

    const result = filteredLogs.slice(0, 100).map(log => {
      const user = users.find(u => u.id === log.userId);
      return {
        ...log,
        user: user || { 
          id: log.userId, 
          username: 'Usuario Desconhecido', 
          firstName: 'Usuario', 
          lastName: 'Desconhecido' 
        } as User
      };
    });

    // console.log(`✅ Retornando ${result.length} logs processados`);
    return result;
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
    if (!this.userCache) {
      this.userCache = [
        {
          id: "af91cd6a-269d-405f-bf3d-53e813dcb999",
          username: "admin",
          email: "admin@basefacilities.com",
          firstName: "Administrador",
          lastName: "Sistema",
          role: "admin",
          password: await hashPassword("admin123"),
          profileImageUrl: null,
          permissions: {},
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
        },
        {
          id: "f08fed3f-fcb4-419d-852f-720c1fa13201",
          username: "lucas.silva",
          email: "lucas.silva@basefacilities.com",
          firstName: "Lucas",
          lastName: "Silva",
          role: "editor",
          password: await hashPassword("barone13"),
          profileImageUrl: null,
          permissions: {},
          createdAt: new Date("2024-01-20"),
          updatedAt: new Date("2024-01-20"),
        }
      ];
    }
    return this.userCache;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.getUsers();
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
