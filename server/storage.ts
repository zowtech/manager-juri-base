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
import { db, pool } from "./db";
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
  private static activityLogs: ActivityLog[] = []; // Static para persistir entre reinicializações
  private static casesCache: CaseWithRelations[] = []; // Static para persistir mudanças de status
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
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
    try {
      // Buscar todos os casos do banco de dados
      let query = `
        SELECT 
          c.id,
          c.client_name, 
          c.process_number,
          c.description,
          c.status,
          c.start_date,
          c.due_date, 
          c.completed_date,
          c.data_entrega,
          c.tipo_processo,
          c.documentos_solicitados,
          c.documentos_anexados, 
          c.observacoes,
          c.assigned_to_id,
          c.created_by_id,
          c.created_at,
          c.updated_at,
          c.employee_id,
          e.nome as employee_name,
          e.matricula
        FROM cases c
        LEFT JOIN employees e ON c.employee_id = e.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      
      // Aplicar filtros
      if (filters?.status && filters.status !== "all") {
        query += ` AND c.status = $${queryParams.length + 1}`;
        queryParams.push(filters.status);
      }
      
      if (filters?.search) {
        query += ` AND (
          LOWER(c.client_name) LIKE $${queryParams.length + 1} OR
          LOWER(c.process_number) LIKE $${queryParams.length + 1} OR
          LOWER(c.description) LIKE $${queryParams.length + 1} OR
          LOWER(e.nome) LIKE $${queryParams.length + 1} OR
          LOWER(e.matricula::text) LIKE $${queryParams.length + 1}
        )`;
        queryParams.push(`%${filters.search.toLowerCase()}%`);
      }

      query += ` ORDER BY c.created_at DESC`;

      const result = await pool.query(query, queryParams);

      const cases = result.rows.map((row: any) => ({
        id: row.id,
        clientName: row.client_name,
        processNumber: row.process_number,
        description: row.description || '',
        status: row.status,
        startDate: row.start_date,
        dueDate: row.due_date,
        completedDate: row.completed_date,
        dataEntrega: row.data_entrega,
        tipoProcesso: row.tipo_processo,
        documentosSolicitados: row.documentos_solicitados,
        documentosAnexados: row.documentos_anexados,
        observacoes: row.observacoes,
        assignedToId: row.assigned_to_id,
        createdById: row.created_by_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        assignedTo: null,
        createdBy: null,
        // Campos específicos do sistema brasileiro
        matricula: row.matricula,
        nome: row.employee_name || row.client_name,
        processo: row.description || '',
        prazoEntrega: row.due_date,
        audiencia: null,
        employeeId: row.employee_id
      }));

      return cases;
    } catch (error) {
      console.error('Erro ao buscar casos:', error);
      throw new Error('Falha ao buscar casos do banco de dados');
    }
  }

  async getCaseById(id: string): Promise<CaseWithRelations | undefined> {
    await this.getCases(); // Garantir que cache está inicializado
    return DatabaseStorage.casesCache.find(c => c.id === id);
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

  async updateCaseStatus(id: string, status: string, completedDate?: Date | null, dataEntrega?: Date | null): Promise<Case> {
    await this.getCases(); // Garantir que cache está inicializado
    const caseIndex = DatabaseStorage.casesCache.findIndex(c => c.id === id);
    
    if (caseIndex === -1) {
      throw new Error("Case not found");
    }
    
    // Atualizar o caso diretamente no cache estático
    DatabaseStorage.casesCache[caseIndex] = {
      ...DatabaseStorage.casesCache[caseIndex],
      status,
      updatedAt: new Date(),
      completedDate: status === 'concluido' ? (completedDate || new Date()) : 
                     status !== 'concluido' ? null : DatabaseStorage.casesCache[caseIndex].completedDate,
      dataEntrega: dataEntrega !== undefined ? dataEntrega : DatabaseStorage.casesCache[caseIndex].dataEntrega
    };
    
    console.log(`📋 STATUS ATUALIZADO: Caso ${id} mudou para "${status}" no cache estático. Data entrega:`, dataEntrega);
    const updatedCase = DatabaseStorage.casesCache[caseIndex];
    
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
    DatabaseStorage.activityLogs.unshift(newLog);
    
    // Manter apenas os últimos 2000 logs para histórico mais extenso
    if (DatabaseStorage.activityLogs.length > 2000) {
      DatabaseStorage.activityLogs = DatabaseStorage.activityLogs.slice(0, 2000);
    }
    
    // Console log detalhado para monitoramento
    console.log(`📋 NOVO LOG CRIADO: [${newLog.action}] ${newLog.resourceType} - ${newLog.description}`);
    console.log(`📋 TOTAL LOGS NO CACHE ESTÁTICO: ${DatabaseStorage.activityLogs.length}`);
    
    return newLog;
  }

  async getActivityLogs(filters?: { action?: string; date?: string; search?: string }): Promise<ActivityLogWithUser[]> {
    const users = await this.getUsers();
    let filteredLogs = [...DatabaseStorage.activityLogs];

    console.log(`🔍 DEBUG: Filtros aplicados: ${JSON.stringify(filters)} - Total logs: ${filteredLogs.length}`);

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

    console.log(`✅ DEBUG: Retornando ${result.length} logs processados para interface`);
    console.log(`📋 DEBUG: Primeiros 3 logs:`, result.slice(0, 3).map(log => ({
      id: log.id,
      action: log.action,
      description: log.description.substring(0, 50) + '...'
    })));
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
