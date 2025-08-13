import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import * as schema from "../shared/schema-mysql";
import type {
  User,
  NewUser,
  Employee,
  NewEmployee,
  Case,
  NewCase,
  ActivityLog,
  NewActivityLog,
  DashboardLayout,
  NewDashboardLayout,
} from "../shared/schema-mysql";
import { eq, and, desc, count, sql, like, or } from "drizzle-orm";

// Database connection
const connection = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "legal_management",
  port: parseInt(process.env.DB_PORT || "3306"),
});

export const db = drizzle(connection, { schema, mode: "default" });

export interface IStorage {
  // User methods
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: NewUser): Promise<User>;
  updateUser(id: number, user: Partial<NewUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Employee methods
  getEmployees(): Promise<Employee[]>;
  getEmployeeById(id: number): Promise<Employee | null>;
  getEmployeeByMatricula(matricula: string): Promise<Employee | null>;
  createEmployee(employee: NewEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<NewEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  searchEmployees(query: string, type: string): Promise<Employee[]>;

  // Case methods
  getCases(): Promise<Case[]>;
  getCaseById(id: number): Promise<Case | null>;
  createCase(case_: NewCase): Promise<Case>;
  updateCase(id: number, case_: Partial<NewCase>): Promise<Case>;
  deleteCase(id: number): Promise<void>;
  getCasesByStatus(status: string): Promise<Case[]>;

  // Activity log methods
  getActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(log: NewActivityLog): Promise<ActivityLog>;

  // Dashboard layout methods
  getDashboardLayout(userId: number): Promise<DashboardLayout | null>;
  saveDashboardLayout(layout: NewDashboardLayout): Promise<DashboardLayout>;
}

export class MySQLStorage implements IStorage {
  // User methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(schema.users);
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return result[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return result[0] || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return result[0] || null;
  }

  async createUser(user: NewUser): Promise<User> {
    const result = await db.insert(schema.users).values(user);
    const newUser = await this.getUserById(result[0].insertId);
    return newUser!;
  }

  async updateUser(id: number, user: Partial<NewUser>): Promise<User> {
    await db.update(schema.users).set(user).where(eq(schema.users.id, id));
    const updatedUser = await this.getUserById(id);
    return updatedUser!;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }

  // Employee methods
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(schema.employees).orderBy(desc(schema.employees.createdAt));
  }

  async getEmployeeById(id: number): Promise<Employee | null> {
    const result = await db.select().from(schema.employees).where(eq(schema.employees.id, id));
    return result[0] || null;
  }

  async getEmployeeByMatricula(matricula: string): Promise<Employee | null> {
    const result = await db.select().from(schema.employees).where(eq(schema.employees.matricula, matricula));
    return result[0] || null;
  }

  async createEmployee(employee: NewEmployee): Promise<Employee> {
    const result = await db.insert(schema.employees).values(employee);
    const newEmployee = await this.getEmployeeById(result[0].insertId);
    return newEmployee!;
  }

  async updateEmployee(id: number, employee: Partial<NewEmployee>): Promise<Employee> {
    await db.update(schema.employees).set(employee).where(eq(schema.employees.id, id));
    const updatedEmployee = await this.getEmployeeById(id);
    return updatedEmployee!;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.update(schema.employees).set({ status: 'deletado' }).where(eq(schema.employees.id, id));
  }

  async searchEmployees(query: string, type: string): Promise<Employee[]> {
    const searchTerm = `%${query}%`;
    
    switch (type) {
      case "nome":
        return await db.select().from(schema.employees)
          .where(and(
            like(schema.employees.nome, searchTerm),
            eq(schema.employees.status, 'ativo')
          ));
      case "codigo":
        return await db.select().from(schema.employees)
          .where(and(
            like(schema.employees.matricula, searchTerm),
            eq(schema.employees.status, 'ativo')
          ));
      case "rg":
        return await db.select().from(schema.employees)
          .where(and(
            like(schema.employees.rg, searchTerm),
            eq(schema.employees.status, 'ativo')
          ));
      case "pis":
        return await db.select().from(schema.employees)
          .where(and(
            like(schema.employees.pis, searchTerm),
            eq(schema.employees.status, 'ativo')
          ));
      default:
        return await db.select().from(schema.employees)
          .where(and(
            or(
              like(schema.employees.nome, searchTerm),
              like(schema.employees.matricula, searchTerm)
            ),
            eq(schema.employees.status, 'ativo')
          ));
    }
  }

  // Case methods
  async getCases(): Promise<Case[]> {
    return await db.select().from(schema.cases).orderBy(desc(schema.cases.createdAt));
  }

  async getCaseById(id: number): Promise<Case | null> {
    const result = await db.select().from(schema.cases).where(eq(schema.cases.id, id));
    return result[0] || null;
  }

  async createCase(case_: NewCase): Promise<Case> {
    const result = await db.insert(schema.cases).values(case_);
    const newCase = await this.getCaseById(result[0].insertId);
    return newCase!;
  }

  async updateCase(id: number, case_: Partial<NewCase>): Promise<Case> {
    await db.update(schema.cases).set(case_).where(eq(schema.cases.id, id));
    const updatedCase = await this.getCaseById(id);
    return updatedCase!;
  }

  async deleteCase(id: number): Promise<void> {
    await db.delete(schema.cases).where(eq(schema.cases.id, id));
  }

  async getCasesByStatus(status: string): Promise<Case[]> {
    return await db.select().from(schema.cases).where(eq(schema.cases.status, status));
  }

  // Activity log methods
  async getActivityLogs(): Promise<ActivityLog[]> {
    return await db.select().from(schema.activityLog).orderBy(desc(schema.activityLog.createdAt));
  }

  async createActivityLog(log: NewActivityLog): Promise<ActivityLog> {
    const result = await db.insert(schema.activityLog).values(log);
    const newLog = await db.select().from(schema.activityLog).where(eq(schema.activityLog.id, result[0].insertId));
    return newLog[0];
  }

  // Dashboard layout methods
  async getDashboardLayout(userId: number): Promise<DashboardLayout | null> {
    const result = await db.select().from(schema.dashboardLayouts).where(eq(schema.dashboardLayouts.userId, userId));
    return result[0] || null;
  }

  async saveDashboardLayout(layout: NewDashboardLayout): Promise<DashboardLayout> {
    const existing = await this.getDashboardLayout(layout.userId!);
    
    if (existing) {
      await db.update(schema.dashboardLayouts).set(layout).where(eq(schema.dashboardLayouts.userId, layout.userId!));
      return (await this.getDashboardLayout(layout.userId!))!;
    } else {
      const result = await db.insert(schema.dashboardLayouts).values(layout);
      return (await this.getDashboardLayout(layout.userId!))!;
    }
  }
}

// Export instance
export const storage = new MySQLStorage();