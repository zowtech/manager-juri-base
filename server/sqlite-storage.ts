import { sqlite } from "./sqlite-db";
import type { User, InsertUser, Case, InsertCase, Employee, InsertEmployee, ActivityLog, InsertActivityLog } from "@shared/schema";
import { createHash } from "crypto";

// Interface para compatibilidade
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Case methods
  getAllCases(): Promise<Case[]>;
  getCaseById(id: string): Promise<Case | undefined>;
  createCase(data: InsertCase): Promise<Case>;
  updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined>;
  deleteCase(id: string): Promise<boolean>;

  // Employee methods
  getAllEmployees(): Promise<Employee[]>;
  getEmployeeById(id: string): Promise<Employee | undefined>;
  createEmployee(data: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  // Activity log methods
  createActivityLog(data: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(filters?: { limit?: number; processOnly?: boolean }): Promise<Array<ActivityLog & { user?: User }>>;

  // Dashboard methods
  getCaseStatistics(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  }>;
}

export class SQLiteStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM users WHERE id = ?');
      const result = stmt.get(id) as any;
      
      if (!result) return undefined;

      return {
        ...result,
        permissions: typeof result.permissions === 'string' ? JSON.parse(result.permissions) : result.permissions,
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at)
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM users WHERE username = ?');
      const result = stmt.get(username) as any;
      
      if (!result) return undefined;

      return {
        ...result,
        permissions: typeof result.permissions === 'string' ? JSON.parse(result.permissions) : result.permissions,
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at)
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(data: InsertUser): Promise<User> {
    try {
      const id = Math.random().toString(36).substr(2, 16);
      const hashedPassword = data.password ? createHash('sha256').update(data.password).digest('hex') : null;
      
      const stmt = sqlite.prepare(`
        INSERT INTO users (id, email, username, password, first_name, last_name, role, permissions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        data.email,
        data.username,
        hashedPassword,
        data.firstName,
        data.lastName,
        data.role || 'editor',
        JSON.stringify(data.permissions || {})
      );

      const user = await this.getUser(id);
      if (!user) throw new Error('Failed to create user');
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.email) { updates.push('email = ?'); values.push(data.email); }
      if (data.username) { updates.push('username = ?'); values.push(data.username); }
      if (data.firstName) { updates.push('first_name = ?'); values.push(data.firstName); }
      if (data.lastName) { updates.push('last_name = ?'); values.push(data.lastName); }
      if (data.role) { updates.push('role = ?'); values.push(data.role); }
      if (data.permissions) { updates.push('permissions = ?'); values.push(JSON.stringify(data.permissions)); }
      if (data.password) { 
        updates.push('password = ?'); 
        values.push(createHash('sha256').update(data.password).digest('hex')); 
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const stmt = sqlite.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      return await this.getUser(id);
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const stmt = sqlite.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM users ORDER BY created_at DESC');
      const results = stmt.all() as any[];
      
      return results.map(result => ({
        ...result,
        firstName: result.first_name,
        lastName: result.last_name,
        permissions: typeof result.permissions === 'string' ? JSON.parse(result.permissions) : result.permissions,
        createdAt: new Date(result.created_at),
        updatedAt: new Date(result.updated_at)
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Case methods
  async getAllCases(): Promise<Case[]> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM cases ORDER BY dueDate ASC');
      const results = stmt.all() as any[];
      
      return results.map(result => ({
        ...result,
        startDate: result.startDate ? new Date(result.startDate) : null,
        dueDate: result.dueDate ? new Date(result.dueDate) : null,
        dataAudiencia: result.dataAudiencia ? new Date(result.dataAudiencia) : null,
        completedDate: result.completedDate ? new Date(result.completedDate) : null,
        dataEntrega: result.dataEntrega ? new Date(result.dataEntrega) : null,
        documentosSolicitados: result.documentosSolicitados ? JSON.parse(result.documentosSolicitados) : null,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      }));
    } catch (error) {
      console.error('Error getting all cases:', error);
      return [];
    }
  }

  async getCaseById(id: string): Promise<Case | undefined> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM cases WHERE id = ?');
      const result = stmt.get(id) as any;
      
      if (!result) return undefined;

      return {
        ...result,
        startDate: result.startDate ? new Date(result.startDate) : null,
        dueDate: result.dueDate ? new Date(result.dueDate) : null,
        dataAudiencia: result.dataAudiencia ? new Date(result.dataAudiencia) : null,
        completedDate: result.completedDate ? new Date(result.completedDate) : null,
        dataEntrega: result.dataEntrega ? new Date(result.dataEntrega) : null,
        documentosSolicitados: result.documentosSolicitados ? JSON.parse(result.documentosSolicitados) : null,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      };
    } catch (error) {
      console.error('Error getting case by id:', error);
      return undefined;
    }
  }

  async createCase(data: InsertCase): Promise<Case> {
    try {
      const id = Math.random().toString(36).substr(2, 16);
      
      const stmt = sqlite.prepare(`
        INSERT INTO cases (id, clientName, employeeId, processNumber, description, status, 
                          startDate, dueDate, dataAudiencia, matricula, tipoProcesso, 
                          documentosSolicitados, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        data.clientName,
        data.employeeId,
        data.processNumber,
        data.description,
        data.status || 'novo',
        data.startDate?.toISOString(),
        data.dueDate?.toISOString(),
        data.dataAudiencia?.toISOString(),
        data.matricula,
        data.tipoProcesso,
        data.documentosSolicitados ? JSON.stringify(data.documentosSolicitados) : null,
        data.observacoes
      );

      const case_ = await this.getCaseById(id);
      if (!case_) throw new Error('Failed to create case');
      return case_;
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  async updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.clientName) { updates.push('clientName = ?'); values.push(data.clientName); }
      if (data.processNumber) { updates.push('processNumber = ?'); values.push(data.processNumber); }
      if (data.description) { updates.push('description = ?'); values.push(data.description); }
      if (data.status) { updates.push('status = ?'); values.push(data.status); }
      if (data.startDate !== undefined) { updates.push('startDate = ?'); values.push(data.startDate?.toISOString() || null); }
      if (data.dueDate !== undefined) { updates.push('dueDate = ?'); values.push(data.dueDate?.toISOString() || null); }
      if (data.dataAudiencia !== undefined) { updates.push('dataAudiencia = ?'); values.push(data.dataAudiencia?.toISOString() || null); }
      if (data.completedDate !== undefined) { updates.push('completedDate = ?'); values.push(data.completedDate?.toISOString() || null); }
      if (data.dataEntrega !== undefined) { updates.push('dataEntrega = ?'); values.push(data.dataEntrega?.toISOString() || null); }
      if (data.matricula) { updates.push('matricula = ?'); values.push(data.matricula); }
      if (data.tipoProcesso) { updates.push('tipoProcesso = ?'); values.push(data.tipoProcesso); }
      if (data.observacoes !== undefined) { updates.push('observacoes = ?'); values.push(data.observacoes); }

      updates.push('updatedAt = CURRENT_TIMESTAMP');
      values.push(id);

      const stmt = sqlite.prepare(`UPDATE cases SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      return await this.getCaseById(id);
    } catch (error) {
      console.error('Error updating case:', error);
      return undefined;
    }
  }

  async deleteCase(id: string): Promise<boolean> {
    try {
      const stmt = sqlite.prepare('DELETE FROM cases WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting case:', error);
      return false;
    }
  }

  // Employee methods
  async getAllEmployees(): Promise<Employee[]> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM employees ORDER BY nome ASC');
      const results = stmt.all() as any[];
      
      return results.map(result => ({
        ...result,
        dataAdmissao: result.dataAdmissao ? new Date(result.dataAdmissao) : null,
        dataDemissao: result.dataDemissao ? new Date(result.dataDemissao) : null,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      }));
    } catch (error) {
      console.error('Error getting all employees:', error);
      return [];
    }
  }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM employees WHERE id = ?');
      const result = stmt.get(id) as any;
      
      if (!result) return undefined;

      return {
        ...result,
        dataAdmissao: result.dataAdmissao ? new Date(result.dataAdmissao) : null,
        dataDemissao: result.dataDemissao ? new Date(result.dataDemissao) : null,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt)
      };
    } catch (error) {
      console.error('Error getting employee by id:', error);
      return undefined;
    }
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    try {
      const id = Math.random().toString(36).substr(2, 16);
      
      const stmt = sqlite.prepare(`
        INSERT INTO employees (id, nome, matricula, empresa, rg, pis, dataAdmissao, 
                              dataDemissao, salario, cargo, departamento, centroCusto, 
                              telefone, email, endereco)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        data.nome,
        data.matricula,
        data.empresa,
        data.rg,
        data.pis,
        data.dataAdmissao?.toISOString().split('T')[0],
        data.dataDemissao?.toISOString().split('T')[0],
        data.salario,
        data.cargo,
        data.departamento,
        data.centroCusto,
        data.telefone,
        data.email,
        data.endereco
      );

      const employee = await this.getEmployeeById(id);
      if (!employee) throw new Error('Failed to create employee');
      return employee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.nome) { updates.push('nome = ?'); values.push(data.nome); }
      if (data.matricula) { updates.push('matricula = ?'); values.push(data.matricula); }
      if (data.empresa) { updates.push('empresa = ?'); values.push(data.empresa); }
      if (data.rg) { updates.push('rg = ?'); values.push(data.rg); }
      if (data.pis) { updates.push('pis = ?'); values.push(data.pis); }
      if (data.dataAdmissao !== undefined) { updates.push('dataAdmissao = ?'); values.push(data.dataAdmissao?.toISOString().split('T')[0] || null); }
      if (data.dataDemissao !== undefined) { updates.push('dataDemissao = ?'); values.push(data.dataDemissao?.toISOString().split('T')[0] || null); }
      if (data.salario !== undefined) { updates.push('salario = ?'); values.push(data.salario); }
      if (data.cargo) { updates.push('cargo = ?'); values.push(data.cargo); }
      if (data.departamento) { updates.push('departamento = ?'); values.push(data.departamento); }
      if (data.centroCusto) { updates.push('centroCusto = ?'); values.push(data.centroCusto); }
      if (data.telefone) { updates.push('telefone = ?'); values.push(data.telefone); }
      if (data.email) { updates.push('email = ?'); values.push(data.email); }
      if (data.endereco) { updates.push('endereco = ?'); values.push(data.endereco); }

      updates.push('updatedAt = CURRENT_TIMESTAMP');
      values.push(id);

      const stmt = sqlite.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      return await this.getEmployeeById(id);
    } catch (error) {
      console.error('Error updating employee:', error);
      return undefined;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const stmt = sqlite.prepare('DELETE FROM employees WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  }

  // Activity log methods
  async createActivityLog(data: InsertActivityLog): Promise<ActivityLog> {
    try {
      const id = Math.random().toString(36).substr(2, 16);
      
      const stmt = sqlite.prepare(`
        INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        id,
        data.userId,
        data.action,
        data.entityType,
        data.entityId,
        data.details ? JSON.stringify(data.details) : null,
        data.ipAddress,
        data.userAgent
      );

      const stmt2 = sqlite.prepare('SELECT * FROM activity_log WHERE id = ?');
      const result = stmt2.get(id) as any;
      
      return {
        ...result,
        details: result.details ? JSON.parse(result.details) : null,
        createdAt: new Date(result.createdAt)
      };
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  async getActivityLogs(filters?: { limit?: number; processOnly?: boolean }): Promise<Array<ActivityLog & { user?: User }>> {
    try {
      let query = 'SELECT * FROM activity_log';
      const params: any[] = [];

      if (filters?.processOnly) {
        query += ' WHERE action IN (?, ?, ?, ?)';
        params.push('CREATE_CASE', 'UPDATE_CASE', 'DELETE_CASE', 'UPDATE_CASE_STATUS');
      }

      query += ' ORDER BY createdAt DESC';

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const stmt = sqlite.prepare(query);
      const results = stmt.all(...params) as any[];
      
      const logs: Array<ActivityLog & { user?: User }> = [];
      
      for (const result of results) {
        const user = await this.getUser(result.user_id);
        logs.push({
          ...result,
          userId: result.user_id,
          entityType: result.entity_type,
          entityId: result.entity_id,
          ipAddress: result.ip_address,
          userAgent: result.user_agent,
          details: result.details ? JSON.parse(result.details) : null,
          createdAt: new Date(result.createdAt),
          user
        });
      }

      return logs;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return [];
    }
  }

  // Dashboard methods
  async getCaseStatistics(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  }> {
    try {
      const totalStmt = sqlite.prepare('SELECT COUNT(*) as count FROM cases');
      const completedStmt = sqlite.prepare('SELECT COUNT(*) as count FROM cases WHERE status = ?');
      const inProgressStmt = sqlite.prepare('SELECT COUNT(*) as count FROM cases WHERE status IN (?, ?)');
      const overdueStmt = sqlite.prepare('SELECT COUNT(*) as count FROM cases WHERE dueDate < datetime("now") AND status != ?');

      const total = (totalStmt.get() as { count: number }).count;
      const completed = (completedStmt.get('concluido') as { count: number }).count;
      const inProgress = (inProgressStmt.get('novo', 'pendente') as { count: number }).count;
      const overdue = (overdueStmt.get('concluido') as { count: number }).count;

      return { total, completed, inProgress, overdue };
    } catch (error) {
      console.error('Error getting case statistics:', error);
      return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    }
  }
}

export const storage = new SQLiteStorage();