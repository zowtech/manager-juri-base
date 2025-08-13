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
  updateCaseStatus(id: string, status: string, completedDate?: Date | null, dataEntrega?: Date | null): Promise<Case>;
  
  // Activity log operations
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(filters?: { action?: string; date?: string; search?: string; limit?: number; processOnly?: boolean }): Promise<ActivityLogWithUser[]>;
  
  // Dashboard statistics
  getCaseStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    averageResponseTime: number;
    novos?: number;
    pendentes?: number;
    concluidos?: number;
    atrasados?: number;
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
  private static userCache: User[] = [
    {
      id: 'admin-id',
      email: 'admin@example.com',
      username: 'admin',
      password: 'abf4dcbb4d3321558df18aa60b7fc90dd0e17634949da3a47cfd2202938b5f4b4164d323772842d56d18a8ffa3f4955df0d5b31e32c3a349be930b58e91ceb3b.054755060135b94caaeea4f9ae9a1b0b', // admin123
      firstName: 'Admin',
      lastName: 'User',
      profileImageUrl: null,
      role: 'admin',
      permissions: {
        matricula: { view: true, edit: true },
        nome: { view: true, edit: true },
        processo: { view: true, edit: true },
        prazoEntrega: { view: true, edit: true },
        audiencia: { view: true, edit: true },
        status: { view: true, edit: true },
        observacao: { view: true, edit: true },
        canCreateCases: true,
        canDeleteCases: true,
        pages: {
          dashboard: true,
          cases: true,
          activityLog: true,
          users: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lucas-id',
      email: 'lucas.silva@example.com',
      username: 'lucas.silva',
      password: 'b26c557fb2496df8b5d770d4a009d086b4b1e6c8a72faa5cac4173363f0aa0c508f013d163991b56a1cf845a14cd73edc85a79a2da4694112e85235cae889408.e7c922b279c802dac9d8e7f51209b9af', // barone13
      firstName: 'Lucas',
      lastName: 'Silva',
      profileImageUrl: null,
      role: 'viewer',
      permissions: {
        matricula: { view: true, edit: false },
        nome: { view: true, edit: false },
        processo: { view: true, edit: false },
        prazoEntrega: { view: true, edit: false },
        audiencia: { view: true, edit: false },
        status: { view: true, edit: false },
        observacao: { view: true, edit: false },
        canCreateCases: false,
        canDeleteCases: false,
        pages: {
          dashboard: false,
          cases: true,
          activityLog: false,
          users: false
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  private static activityLogs: ActivityLog[] = []; // Static para persistir entre reinicializações
  private static casesCache: CaseWithRelations[] = []; // Static para persistir mudanças de status
  private static dashboardLayouts: DashboardLayout[] = [];
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    console.log(`🔍 BUSCANDO USUÁRIO: ${id}`);
    
    const user = DatabaseStorage.userCache.find(user => user.id === id);
    if (user) {
      console.log(`✅ USUÁRIO ENCONTRADO: ${user.username} com permissões:`, JSON.stringify(user.permissions, null, 2));
      return user;
    }
    
    console.log(`❌ USUÁRIO NÃO ENCONTRADO: ${id}`);
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log(`🔍 SEARCHING USER: ${username}`);
    
    const user = DatabaseStorage.userCache.find(user => user.username === username);
    console.log(`✅ FOUND USER:`, user ? `${user.username} (${user.id})` : 'null');
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return DatabaseStorage.userCache.find(user => user.email === email);
  }

  async createUser(userData: InsertUser): Promise<User> {
    console.log('🔄 Tentando criar usuário:', userData.username);
    
    // Verificar se usuário já existe
    const existingUser = await this.getUserByUsername(userData.username || '');
    if (existingUser) {
      console.log('❌ Usuário já existe:', userData.username);
      throw new Error(`Usuário ${userData.username} já existe`);
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: userData.email || null,
      username: userData.username || null,
      password: userData.password || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'viewer',
      permissions: userData.permissions || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    DatabaseStorage.userCache.push(newUser);
    console.log('✅ Usuário criado com sucesso:', newUser.username);
    return newUser;
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

      // Ordenar por prazo de entrega (mais urgente primeiro), depois por data de criação
      query += ` ORDER BY 
        CASE 
          WHEN c.due_date IS NULL THEN 1 
          ELSE 0 
        END,
        c.due_date ASC, 
        c.created_at DESC`;

      const result = await pool.query(query, queryParams);

      const today = new Date();
      const cases = result.rows.map((row: any) => {
        const dueDate = row.due_date ? new Date(row.due_date) : null;
        const isOverdue = dueDate && dueDate < today && row.status !== 'concluido';
        const isNearDue = dueDate && !isOverdue && row.status !== 'concluido' ? 
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 3 : false; // 3 dias ou menos
        
        // Calcular cor de alerta
        let alertColor = '';
        if (isOverdue) {
          alertColor = 'red'; // Atrasado
        } else if (isNearDue) {
          alertColor = 'yellow'; // Próximo do prazo
        } else {
          alertColor = 'green'; // Normal
        }
        
        return {
          id: row.id,
          clientName: row.client_name,
          processNumber: row.process_number,
          description: row.description || '',
          status: isOverdue ? 'atrasado' : row.status, // Atualizar status automaticamente
          startDate: row.start_date,
          dueDate: row.due_date,
          completedDate: row.completed_date,
          dataEntrega: row.data_entrega,
          dataAudiencia: row.data_audiencia,
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
          employeeId: row.employee_id,
          // Campos para alertas visuais
          alertColor,
          isOverdue,
          isNearDue
        };
      });

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
          start_date = COALESCE($7, start_date),
          observacoes = COALESCE($8, observacoes),
          employee_id = COALESCE($9, employee_id),
          assigned_to_id = COALESCE($10, assigned_to_id),
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
        updates.dueDate || null,
        updates.startDate || null,
        updates.observacoes || null,
        updates.employeeId || null,
        updates.assignedToId || null
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
        employeeId: updatedCase.employee_id,
        matricula: updatedCase.matricula,
        dataAudiencia: updatedCase.data_audiencia
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
    console.log('🔧 DEBUG: Atualizando status do caso:', id, 'para:', status);
    
    try {
      // Primeiro verificar se o caso existe
      const checkQuery = `SELECT id FROM cases WHERE id = $1`;
      const checkResult = await pool.query(checkQuery, [id]);
      console.log('🔍 DEBUG: Verificando existência do caso:', checkResult.rows.length > 0 ? 'EXISTE' : 'NÃO EXISTE');
      
      if (checkResult.rows.length === 0) {
        console.log('❌ DEBUG: Caso não existe no banco de dados');
        throw new Error("Case not found in database");
      }
      
      // Atualizar status primeiro
      const updateStatusQuery = `UPDATE cases SET status = $2, updated_at = NOW() WHERE id = $1`;
      await pool.query(updateStatusQuery, [id, status]);
      
      // Se status for "concluído", atualizar datas
      if (status === 'concluido') {
        const updateDatesQuery = `
          UPDATE cases 
          SET 
            completed_date = COALESCE($2, NOW()),
            data_entrega = COALESCE($3, NOW())
          WHERE id = $1
        `;
        await pool.query(updateDatesQuery, [id, completedDate, dataEntrega]);
      }
      
      // Buscar o caso atualizado
      const selectQuery = `SELECT * FROM cases WHERE id = $1`;
      const result = await pool.query(selectQuery, [id]);
      
      if (result.rows.length === 0) {
        console.log('❌ DEBUG: Caso não encontrado no banco para atualização');
        throw new Error("Case not found");
      }
      
      const updatedCase = result.rows[0];
      console.log('✅ DEBUG: Status do caso atualizado no banco:', updatedCase.id, '->', updatedCase.status);
      
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
        employeeId: updatedCase.employee_id,
        matricula: updatedCase.matricula,
        dataAudiencia: updatedCase.data_audiencia
      };
    } catch (error) {
      console.error('❌ DEBUG: Erro ao atualizar status do caso:', error);
      throw error;
    }
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

  async getActivityLogs(filters?: { action?: string; date?: string; search?: string; limit?: number; processOnly?: boolean }): Promise<ActivityLogWithUser[]> {
    const users = await this.getUsers();
    let filteredLogs = [...DatabaseStorage.activityLogs];

    console.log(`🔍 DEBUG: Filtros aplicados: ${JSON.stringify(filters)} - Total logs: ${filteredLogs.length}`);

    // Filter for process-only activities if requested
    if (filters?.processOnly) {
      const processActions = ['CREATE_CASE', 'UPDATE_CASE', 'DELETE_CASE', 'UPDATE_CASE_STATUS'];
      filteredLogs = filteredLogs.filter(log => processActions.includes(log.action));
    }

    if (filters?.action && filters.action !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }

    if (filters?.date) {
      const date = new Date(filters.date);
      const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      filteredLogs = filteredLogs.filter(log => 
        log.createdAt && log.createdAt >= date && log.createdAt < nextDay
      );
    }

    if (filters?.search) {
      filteredLogs = filteredLogs.filter(log => 
        log.description.toLowerCase().includes(filters.search!.toLowerCase()) ||
        log.action.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    // Apply limit if specified
    const limit = filters?.limit || 100;
    filteredLogs = filteredLogs.slice(0, limit);

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
    novos: number;
    pendentes: number;
    concluidos: number;
    atrasados: number;
    averageResponseTime: number;
  }> {
    try {
      console.log('📊 DEBUG: Iniciando cálculo de estatísticas do dashboard');
      
      const allCases = await this.getCases();
      console.log(`📋 DEBUG: Total de casos carregados: ${allCases.length}`);
      
      const today = new Date();
      
      // Contar por status real dos casos
      const total = allCases.length;
      const novos = allCases.filter(c => c.status === 'novo').length;
      const pendentes = allCases.filter(c => c.status === 'pendente').length;
      const concluidos = allCases.filter(c => c.status === 'concluido').length;
      
      // Calcular atrasados: casos com prazo vencido que não estão concluídos
      const atrasados = allCases.filter(c => {
        if (c.status === 'concluido') return false;
        if (!c.dueDate) return false;
        const dueDate = new Date(c.dueDate);
        return dueDate < today;
      }).length;
      
      console.log(`📊 DEBUG: Estatísticas calculadas:`, {
        total, novos, pendentes, concluidos, atrasados
      });
      
      // Calcular tempo médio de resposta baseado em casos concluídos
      const completedCases = allCases.filter(c => 
        c.status === 'concluido' && c.createdAt && (c.completedDate || c.dataEntrega)
      );
      
      let averageResponseTime = 0;
      
      if (completedCases.length > 0) {
        const totalDays = completedCases.reduce((sum, c) => {
          const created = new Date(c.createdAt!);
          const completed = new Date(c.completedDate || c.dataEntrega || c.updatedAt!);
          const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.max(days, 0); // Evitar valores negativos
        }, 0);
        averageResponseTime = Math.round(totalDays / completedCases.length);
      }
      
      const stats = {
        total,
        novos,
        pendentes,
        concluidos,
        atrasados,
        averageResponseTime,
      };
      
      console.log('✅ DEBUG: Estatísticas finais retornadas:', stats);
      return stats;
      
    } catch (error) {
      console.error('❌ ERRO ao calcular estatísticas do dashboard:', error);
      
      // Retornar valores padrão em caso de erro
      return {
        total: 0,
        novos: 0,
        pendentes: 0,
        concluidos: 0,
        atrasados: 0,
        averageResponseTime: 0,
      };
    }
  }

  // Get users for assignment
  async getUsers(): Promise<User[]> {
    return DatabaseStorage.userCache;
  }

  async getAllUsers(): Promise<User[]> {
    return DatabaseStorage.userCache;
  }

  async updateUser(id: string, data: any): Promise<User> {
    const userIndex = DatabaseStorage.userCache.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found');
    
    DatabaseStorage.userCache[userIndex] = {
      ...DatabaseStorage.userCache[userIndex],
      ...data,
      updatedAt: new Date()
    };
    
    return DatabaseStorage.userCache[userIndex];
  }

  async deleteUser(id: string): Promise<void> {
    const userIndex = DatabaseStorage.userCache.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found');
    
    DatabaseStorage.userCache.splice(userIndex, 1);
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
    
    const existingIndex = DatabaseStorage.dashboardLayouts.findIndex(l => l.userId === userId);
    if (existingIndex >= 0) {
      DatabaseStorage.dashboardLayouts[existingIndex] = layoutData;
    } else {
      DatabaseStorage.dashboardLayouts.push(layoutData);
    }
    
    return layoutData;
  }

  async getDashboardLayout(userId: string): Promise<DashboardLayout | undefined> {
    return DatabaseStorage.dashboardLayouts.find(l => l.userId === userId);
  }
}

export const storage = new DatabaseStorage();
