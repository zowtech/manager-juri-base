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
  createCase(caseData: InsertCase, createdById: string): Promise<Case>;
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
  async createCase(caseData: InsertCase, createdById: string): Promise<Case> {
    const [newCase] = await db
      .insert(cases)
      .values({
        ...caseData,
        createdById,
      })
      .returning();
    return newCase;
  }

  async getCases(filters?: { status?: string; search?: string }): Promise<CaseWithRelations[]> {
    let query = db
      .select({
        case: cases,
        assignedTo: users,
        createdBy: { 
          id: users.id, 
          firstName: users.firstName, 
          lastName: users.lastName, 
          email: users.email,
          username: users.username,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          password: users.password,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(cases)
      .leftJoin(users, eq(cases.assignedToId, users.id))
      .innerJoin({ createdByUser: users }, eq(cases.createdById, users.id))
      .orderBy(
        sql`CASE 
          WHEN ${cases.status} = 'concluido' THEN 2 
          ELSE 1 
        END`,
        desc(cases.updatedAt)
      );

    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(cases.status, filters.status));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(cases.clientName, `%${filters.search}%`),
          ilike(cases.description, `%${filters.search}%`),
          ilike(cases.processNumber, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;
    
    return result.map(row => ({
      ...row.case,
      assignedTo: row.assignedTo,
      createdBy: row.createdBy,
    }));
  }

  async getCaseById(id: string): Promise<CaseWithRelations | undefined> {
    const [result] = await db
      .select({
        case: cases,
        assignedTo: users,
        createdBy: { 
          id: users.id, 
          firstName: users.firstName, 
          lastName: users.lastName, 
          email: users.email,
          username: users.username,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          password: users.password,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(cases)
      .leftJoin(users, eq(cases.assignedToId, users.id))
      .innerJoin({ createdByUser: users }, eq(cases.createdById, users.id))
      .where(eq(cases.id, id));

    if (!result) return undefined;

    return {
      ...result.case,
      assignedTo: result.assignedTo,
      createdBy: result.createdBy,
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
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where status = 'concluido')`,
        inProgress: sql<number>`count(*) filter (where status = 'andamento')`,
        averageResponseTime: sql<number>`
          coalesce(
            avg(
              extract(day from (
                coalesce(completed_date, now()) - start_date
              ))
            )::integer, 
            0
          )
        `,
      })
      .from(cases);

    return stats;
  }

  // Get users for assignment
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }
}

export const storage = new DatabaseStorage();
