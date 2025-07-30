import {
  users,
  cases,
  activityLog,
  type User,
  type UpsertUser,
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
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
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
      .select()
      .from(cases)
      .leftJoin(users, eq(cases.assignedToId, users.id))
      .innerJoin({ createdBy: users }, eq(cases.createdById, users.id))
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
      ...row.cases,
      assignedTo: row.users,
      createdBy: row.createdBy,
    }));
  }

  async getCaseById(id: string): Promise<CaseWithRelations | undefined> {
    const [result] = await db
      .select()
      .from(cases)
      .leftJoin(users, eq(cases.assignedToId, users.id))
      .innerJoin({ createdBy: users }, eq(cases.createdById, users.id))
      .where(eq(cases.id, id));

    if (!result) return undefined;

    return {
      ...result.cases,
      assignedTo: result.users,
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
      .select()
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
      ...row.activity_log,
      user: row.users,
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
