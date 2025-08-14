import { Pool } from "pg";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Simple interface compatible with user's Supabase
const pool = new Pool({
  connectionString: 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1',
  ssl: { rejectUnauthorized: false }
});

export interface IStorage {
  getUser(id: string): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(data: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<any[]>;
  getAllCases(): Promise<any[]>;
  getCaseById(id: string): Promise<any>;
  createCase(data: any): Promise<any>;
  updateCase(id: string, data: any): Promise<any>;
  deleteCase(id: string): Promise<boolean>;
  getAllEmployees(): Promise<any[]>;
  getEmployeeById(id: string): Promise<any>;
  createEmployee(data: any): Promise<any>;
  updateEmployee(id: string, data: any): Promise<any>;
  deleteEmployee(id: string): Promise<boolean>;
  getCases(filters?: any): Promise<any[]>;
  createActivityLog(data: any): Promise<any>;
  getActivityLogs(filters?: any): Promise<any[]>;
  getCaseStatistics(): Promise<any>;
}

export class SupabaseStorage implements IStorage {
  async getUser(id: string) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      return res.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }

  async createUser(data: any) {
    try {
      const hashedPassword = data.password ? await this.hashPassword(data.password) : null;
      
      const res = await pool.query(`
        INSERT INTO users (username, email, password, "firstName", "lastName", role, permissions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        data.username,
        data.email,
        hashedPassword,
        data.firstName,
        data.lastName,
        data.role || 'editor',
        JSON.stringify(data.permissions || {})
      ]);
      
      return res.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, data: any) {
    try {
      const updateData: any = { ...data };
      if (data.password) {
        updateData.password = await this.hashPassword(data.password);
      }
      
      const fields = Object.keys(updateData).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
      const values = Object.values(updateData);
      
      const res = await pool.query(`
        UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, ...values]);
      
      return res.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(id: string) {
    try {
      const res = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return res.rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getAllUsers() {
    try {
      const res = await pool.query('SELECT * FROM users ORDER BY username');
      return res.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getAllCases() {
    try {
      const res = await pool.query('SELECT * FROM cases ORDER BY "prazoEntrega" ASC');
      return res.rows;
    } catch (error) {
      console.error('Error getting all cases:', error);
      return [];
    }
  }

  async getCaseById(id: string) {
    try {
      const res = await pool.query('SELECT * FROM cases WHERE id = $1', [id]);
      return res.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting case by id:', error);
      return undefined;
    }
  }

  async createCase(data: any) {
    try {
      const res = await pool.query(`
        INSERT INTO cases (matricula, nome, processo, status, "prazoEntrega", audiencia, "dueDate", observacao, "assignedTo")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        data.matricula,
        data.nome,
        data.processo,
        data.status || 'novo',
        data.prazoEntrega,
        data.audiencia,
        data.dueDate,
        data.observacao,
        data.assignedTo
      ]);
      
      return res.rows[0];
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  async updateCase(id: string, data: any) {
    try {
      const fields = Object.keys(data).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
      const values = Object.values(data);
      
      const res = await pool.query(`
        UPDATE cases SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, ...values]);
      
      return res.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating case:', error);
      return undefined;
    }
  }

  async deleteCase(id: string) {
    try {
      const res = await pool.query('DELETE FROM cases WHERE id = $1', [id]);
      return res.rowCount > 0;
    } catch (error) {
      console.error('Error deleting case:', error);
      return false;
    }
  }

  async getAllEmployees() {
    try {
      const res = await pool.query('SELECT * FROM employees ORDER BY nome');
      return res.rows;
    } catch (error) {
      console.error('Error getting all employees:', error);
      return [];
    }
  }

  async getEmployeeById(id: string) {
    try {
      const res = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
      return res.rows[0] || undefined;
    } catch (error) {
      console.error('Error getting employee by id:', error);
      return undefined;
    }
  }

  async createEmployee(data: any) {
    try {
      const res = await pool.query(`
        INSERT INTO employees (empresa, nome, matricula, rg, pis, "dataAdmissao", "dataDemissao", salario, cargo, departamento, "centroCusto", email, telefone, endereco, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        data.empresa || '2',
        data.nome,
        data.matricula,
        data.rg,
        data.pis,
        data.dataAdmissao,
        data.dataDemissao,
        data.salario,
        data.cargo,
        data.departamento,
        data.centroCusto,
        data.email,
        data.telefone,
        data.endereco,
        data.status || 'ativo'
      ]);
      
      return res.rows[0];
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateEmployee(id: string, data: any) {
    try {
      const fields = Object.keys(data).map((key, i) => `"${key}" = $${i + 2}`).join(', ');
      const values = Object.values(data);
      
      const res = await pool.query(`
        UPDATE employees SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, ...values]);
      
      return res.rows[0] || undefined;
    } catch (error) {
      console.error('Error updating employee:', error);
      return undefined;
    }
  }

  async deleteEmployee(id: string) {
    try {
      const res = await pool.query('DELETE FROM employees WHERE id = $1', [id]);
      return res.rowCount > 0;
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  }

  async createActivityLog(data: any) {
    try {
      const res = await pool.query(`
        INSERT INTO activity_log ("userId", action, "resourceType", "resourceId", description, metadata, "ipAddress", "userAgent")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        data.userId,
        data.action,
        data.resourceType,
        data.resourceId,
        data.description,
        JSON.stringify(data.metadata || {}),
        data.ipAddress,
        data.userAgent
      ]);
      
      return res.rows[0];
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  async getActivityLogs(filters: any = {}) {
    try {
      let query = 'SELECT * FROM activity_log ORDER BY created_at DESC';
      let params: any[] = [];
      
      if (filters.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }
      
      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return [];
    }
  }

  async getCases(filters: any = {}) {
    try {
      const res = await pool.query('SELECT * FROM cases ORDER BY "prazoEntrega" ASC');
      return res.rows;
    } catch (error) {
      console.error('Error getting cases:', error);
      return [];
    }
  }

  async getCaseStatistics() {
    try {
      const res = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'concluido' THEN 1 END) as completed,
          COUNT(CASE WHEN status IN ('novo', 'pendente') THEN 1 END) as inProgress,
          COUNT(CASE WHEN "prazoEntrega" < CURRENT_TIMESTAMP AND status != 'concluido' THEN 1 END) as overdue
        FROM cases
      `);
      
      const stats = res.rows[0];
      return {
        total: parseInt(stats.total),
        completed: parseInt(stats.completed),
        inProgress: parseInt(stats.inprogress),
        overdue: parseInt(stats.overdue)
      };
    } catch (error) {
      console.error('Error getting case statistics:', error);
      return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    }
  }
}

export const storage = new SupabaseStorage();