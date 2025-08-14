// server/routes.users.ts
import { Router } from "express";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { users } from "@shared/schema"; // troque para ../shared/schema se não tiver alias
import { eq } from "drizzle-orm";

const scrypt = promisify(crypto.scrypt);
const router = Router();

/** Lista usuários */
router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(users).orderBy(users.createdAt);
    res.json(rows);
  } catch (err: any) {
    console.error("[USERS/LIST] DB error:", err);
    res.status(500).json({ message: "DB error" });
  }
});

/** Cria usuário (hasheia a senha com scrypt) */
router.post("/", async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, role, permissions } = req.body || {};
    if (!email || !username || !password) {
      return res.status(400).json({ message: "email, username e password são obrigatórios" });
    }

    // unique username
    const exists = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (exists.length) return res.status(409).json({ message: "username já existe" });

    // scrypt: salt:hash (hex)
    const salt = crypto.randomBytes(16);
    const key = (await scrypt(password, salt, 64)) as Buffer;
    const passwordHashed = `${salt.toString("hex")}:${key.toString("hex")}`;

    await db.insert(users).values({
      id: crypto.randomUUID(),
      email,
      username,
      password: passwordHashed,
      firstName: firstName || null,
      lastName: lastName || null,
      role: role || "user",
      permissions: permissions || null,
    });

    res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error("[USERS/CREATE] DB error:", err);
    res.status(500).json({ message: "DB error" });
  }
});

/** Atualiza usuário (troca senha se enviada) */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, firstName, lastName, role, permissions, password } = req.body || {};

    const update: any = { email, username, firstName, lastName, role, permissions };
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    if (password) {
      const salt = crypto.randomBytes(16);
      const key = (await scrypt(password, salt, 64)) as Buffer;
      update.password = `${salt.toString("hex")}:${key.toString("hex")}`;
    }

    await db.update(users).set(update).where(eq(users.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[USERS/UPDATE] DB error:", err);
    res.status(500).json({ message: "DB error" });
  }
});

export default router;
