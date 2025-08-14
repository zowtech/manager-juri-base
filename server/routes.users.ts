// server/routes.users.ts
import { Router } from "express";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { users } from "@shared/schema"; // troque para "../shared/schema" se não usar alias
import { eq } from "drizzle-orm";
import { insertUserSchema, updateUserSchema } from "@shared/schema";

const scryptAsync = promisify(crypto.scrypt);
const router = Router();

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

// GET /api/users
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(users).orderBy(users.createdAt);
    res.json(rows.map((u) => ({ ...u, password: null })));
  } catch (err) {
    console.error("[USERS/LIST] DB error:", err);
    res.status(500).json({ message: "DB error" });
  }
});

// POST /api/users
router.post("/", async (req, res) => {
  try {
    const data = insertUserSchema.parse(req.body);
    const password = data.password && data.password.trim() !== "" ? data.password : "temp123";
    const hashed = await hashPassword(password);

    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: data.email || null,
      username: data.username,
      password: hashed,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      role: data.role || "user",
      permissions: data.permissions || null,
    });

    res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error("[USERS/CREATE] DB error:", err);
    res.status(500).json({ message: "DB error" });
  }
});

// PATCH /api/users/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    const patch: any = {
      email: data.email ?? undefined,
      username: data.username ?? undefined,
      firstName: data.firstName ?? undefined,
      lastName: data.lastName ?? undefined,
      role: data.role ?? undefined,
      permissions: data.permissions ?? undefined,
    };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

    if (data.password && data.password.trim() !== "") {
      patch.password = await hashPassword(data.password);
    }

    await db.update(users).set(patch).where(eq(users.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[USERS/UPDATE] DB error:", err);
    res.status(500).json({ message: "DB error" });
  }
});

export default router;
