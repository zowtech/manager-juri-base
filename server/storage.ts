import { db } from "./db";
import { eq } from "drizzle-orm";
import type { User, InsertUser, Case, InsertCase, Employee, InsertEmployee, ActivityLog, InsertActivityLog } from "@shared/schema";
import { users, cases, employees, activityLog } from "@shared/schema";
import { createHash } from "crypto";

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

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(data: InsertUser): Promise<User> {
    try {
      const hashedPassword = data.password ? createHash('sha256').update(data.password).digest('hex') : null;
      
      const [user] = await db
        .insert(users)
        .values({
          ...data,
          password: hashedPassword
        })
        .returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const updateData: any = { ...data };
      if (data.password) {
        updateData.password = createHash('sha256').update(data.password).digest('hex');
      }
      
      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users);
      return allUsers;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getAllCases(): Promise<Case[]> {
    try {
      const allCases = await db.select().from(cases);
      return allCases;
    } catch (error) {
      console.error('Error getting all cases:', error);
      return [];
    }
  }

  async getCaseById(id: string): Promise<Case | undefined> {
    try {
      const [case_] = await db.select().from(cases).where(eq(cases.id, id));
      return case_ || undefined;
    } catch (error) {
      console.error('Error getting case by id:', error);
      return undefined;
    }
  }

  async createCase(data: InsertCase): Promise<Case> {
    try {
      const [case_] = await db.insert(cases).values(data).returning();
      return case_;
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  }

  async updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined> {
    try {
      const [case_] = await db
        .update(cases)
        .set(data)
        .where(eq(cases.id, id))
        .returning();
      return case_ || undefined;
    } catch (error) {
      console.error('Error updating case:', error);
      return undefined;
    }
  }

  async deleteCase(id: string): Promise<boolean> {
    try {
      const result = await db.delete(cases).where(eq(cases.id, id));
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error('Error deleting case:', error);
      return false;
    }
  }

  async getAllEmployees(): Promise<Employee[]> {
    try {
      const allEmployees = await db.select().from(employees);
      return allEmployees;
    } catch (error) {
      console.error('Error getting all employees:', error);
      return [];
    }
  }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    try {
      const [employee] = await db.select().from(employees).where(eq(employees.id, id));
      return employee || undefined;
    } catch (error) {
      console.error('Error getting employee by id:', error);
      return undefined;
    }
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    try {
      const [employee] = await db.insert(employees).values(data).returning();
      return employee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    try {
      const [employee] = await db
        .update(employees)
        .set(data)
        .where(eq(employees.id, id))
        .returning();
      return employee || undefined;
    } catch (error) {
      console.error('Error updating employee:', error);
      return undefined;
    }
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const result = await db.delete(employees).where(eq(employees.id, id));
      return (result as any).rowCount > 0;
    } catch (error) {
      console.error('Error deleting employee:', error);
      return false;
    }
  }

  async createActivityLog(data: InsertActivityLog): Promise<ActivityLog> {
    try {
      const [log] = await db.insert(activityLog).values(data).returning();
      return log;
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  async getActivityLogs(filters?: { limit?: number; processOnly?: boolean }): Promise<Array<ActivityLog & { user?: User }>> {
    try {
      let query = db.select().from(activityLog);
      
      if (filters?.processOnly) {
        query = query.where(eq(activityLog.action, 'UPDATE_CASE'));
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const logs = await query;
      
      // Get users for each log
      const logsWithUsers = await Promise.all(
        logs.map(async (log) => {
          const user = await this.getUser(log.userId);
          return { ...log, user };
        })
      );
      
      return logsWithUsers;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return [];
    }
  }

  async getCaseStatistics(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  }> {
    try {
      const allCases = await this.getAllCases();
      const now = new Date();
      
      const total = allCases.length;
      const completed = allCases.filter(c => c.status === 'concluido').length;
      const inProgress = allCases.filter(c => ['novo', 'pendente'].includes(c.status)).length;
      const overdue = allCases.filter(c => 
        c.dueDate && new Date(c.dueDate) < now && c.status !== 'concluido'
      ).length;
      
      return { total, completed, inProgress, overdue };
    } catch (error) {
      console.error('Error getting case statistics:', error);
      return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    }
  }
}

export const storage = new DatabaseStorage();