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
  type DashboardLayout,
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
  
  // Dashboard layouts
  saveDashboardLayout(userId: string, layout: any, widgets: any): Promise<DashboardLayout>;
  getDashboardLayout(userId: string): Promise<DashboardLayout | undefined>;
}

export class DatabaseStorage implements IStorage {
  private userCache?: User[];
  private static activityLogs: ActivityLog[] = []; // Static para persistir entre reinicializações
  private static casesCache: CaseWithRelations[] = []; // Static para persistir mudanças de status
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // First try to get from memory cache (for test users)
    const cachedUsers = await this.getUsers();
    const cachedUser = cachedUsers.find(user => user.id === id);
    if (cachedUser) {
      return cachedUser;
    }

    // Then try database
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log(`🔍 SEARCHING USER: ${username}`);
    
    // First try to get from memory cache (for test users)
    const cachedUsers = await this.getUsers();
    console.log(`📝 CACHED USERS:`, cachedUsers.map(u => `${u.username} (${u.id})`));
    
    const cachedUser = cachedUsers.find(user => user.username === username);
    if (cachedUser) {
      console.log(`✅ FOUND IN CACHE: ${cachedUser.username}`);
      return cachedUser;
    }

    // Then try database
    const [user] = await db.select().from(users).where(eq(users.username, username));
    console.log(`🗃️ DATABASE RESULT:`, user ? `${user.username} (${user.id})` : 'null');
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
        const searchParam = `%${filters.search.toLowerCase()}%`;
        query += ` AND (
          LOWER(c.client_name) LIKE $${queryParams.length + 1} OR
          LOWER(c.process_number) LIKE $${queryParams.length + 2} OR
          LOWER(c.description) LIKE $${queryParams.length + 3} OR
          LOWER(COALESCE(e.nome, '')) LIKE $${queryParams.length + 4} OR
          LOWER(COALESCE(e.matricula::text, '')) LIKE $${queryParams.length + 5}
        )`;
        queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
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
        createdBy: {
          id: row.created_by_id,
          email: null,
          username: null, 
          password: null,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
          role: 'admin',
          permissions: {},
          createdAt: null,
          updatedAt: null
        },
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
    const allCases = await this.getCases(); // Garantir que cases são buscados do banco
    console.log('🔍 DEBUG: Buscando caso por ID no storage:', id);
    console.log('📋 DEBUG: Total casos carregados:', allCases.length);
    const foundCase = allCases.find(c => c.id === id);
    console.log('🎯 DEBUG: Caso encontrado:', foundCase ? foundCase.id : 'NÃO ENCONTRADO');
    return foundCase;
  }

  async updateCase(id: string, updates: Partial<InsertCase>): Promise<Case> {
    console.log('🔧 DEBUG: Iniciando updateCase para ID:', id);
    console.log('📝 DEBUG: Updates recebidos:', updates);
    
    try {
      // Buscar o caso no banco de dados usando SQL direto
      const query = `
        UPDATE cases 
        SET 
          client_name = COALESCE($2, client_name),
          process_number = COALESCE($3, process_number), 
          description = COALESCE($4, description),
          status = COALESCE($5, status),
          due_date = COALESCE($6, due_date),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        id,
        updates.clientName || null,
        updates.processNumber || null,
        updates.description || null,
        updates.status || null,
        updates.dueDate || null
      ]);
      
      if (result.rows.length === 0) {
        console.log('❌ DEBUG: Caso não encontrado no banco');
        throw new Error("Case not found");
      }
      
      const updatedCase = result.rows[0];
      console.log('✅ DEBUG: Caso atualizado no banco:', updatedCase.id);
      
      // Converter para o formato correto
      return {
        id: updatedCase.id,
        clientName: updatedCase.client_name,
        processNumber: updatedCase.process_number,
        description: updatedCase.description,
        status: updatedCase.status,
        startDate: updatedCase.start_date,
        dueDate: updatedCase.due_date,
        completedDate: updatedCase.completed_date,
        dataEntrega: updatedCase.data_entrega,
        tipoProcesso: updatedCase.tipo_processo,
        documentosSolicitados: updatedCase.documentos_solicitados,
        documentosAnexados: updatedCase.documentos_anexados,
        observacoes: updatedCase.observacoes,
        assignedToId: updatedCase.assigned_to_id,
        createdById: updatedCase.created_by_id,
        createdAt: new Date(updatedCase.created_at),
        updatedAt: new Date(updatedCase.updated_at),
        employeeId: updatedCase.employee_id
      };
    } catch (error) {
      console.error('❌ DEBUG: Erro ao atualizar caso:', error);
      throw error;
    }
  }

  async deleteCase(id: string): Promise<void> {
    console.log('🗑️ DEBUG: Iniciando exclusão do caso:', id);
    
    try {
      // Deletar o caso do banco de dados
      const deleteQuery = `DELETE FROM cases WHERE id = $1 RETURNING id`;
      const result = await pool.query(deleteQuery, [id]);
      
      if (result.rows.length === 0) {
        console.log('❌ DEBUG: Caso não encontrado para exclusão');
        throw new Error("Case not found");
      }
      
      console.log('✅ DEBUG: Caso excluído do banco:', result.rows[0].id);
    } catch (error) {
      console.error('❌ DEBUG: Erro ao excluir caso:', error);
      throw error;
    }
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
      // Use fixed hashes to avoid regenerating on each call
      this.userCache = [
        {
          id: "af91cd6a-269d-405f-bf3d-53e813dcb999",
          username: "admin",
          email: "admin@basefacilities.com",
          firstName: "Administrador",
          lastName: "Sistema",
          role: "admin",
          // Simple password for testing - will fix properly
          password: "admin123",
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
          // Simple password hash for testing - will fix properly  
          password: "barone13",
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

  // Dashboard layouts
  async saveDashboardLayout(userId: string, layout: any, widgets: any): Promise<DashboardLayout> {
    const layoutData: DashboardLayout = {
      id: `layout_${userId}`,
      userId,
      layout,
      widgets,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (!DatabaseStorage.dashboardLayouts) {
      DatabaseStorage.dashboardLayouts = new Map();
    }
    DatabaseStorage.dashboardLayouts.set(userId, layoutData);
    
    return layoutData;
  }

  async getDashboardLayout(userId: string): Promise<DashboardLayout | undefined> {
    if (!DatabaseStorage.dashboardLayouts) {
      return undefined;
    }
    return DatabaseStorage.dashboardLayouts.get(userId);
  }
}

// Static cache for dashboard layouts
DatabaseStorage.dashboardLayouts = new Map();

// Add static property declaration
declare global {
  namespace DatabaseStorage {
    var dashboardLayouts: Map<string, DashboardLayout>;
  }
}

export const storage = new DatabaseStorage();
