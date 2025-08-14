// server/auth.ts
import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { storage } from "./storage"; // sua camada já integrada ao Postgres

const scryptAsync = promisify(crypto.scrypt);

// Aceita "salt:hash" (novo) e "hash.salt" (legado)
async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  if (!stored || typeof stored !== "string") return false;

  // novo: SALT:HASH (ambos hex)
  if (stored.includes(":")) {
    const [saltHex, hashHex] = stored.split(":");
    const derived = (await scryptAsync(supplied, Buffer.from(saltHex, "hex"), 64)) as Buffer;
    return (
      derived.length === Buffer.from(hashHex, "hex").length &&
      crypto.timingSafeEqual(derived, Buffer.from(hashHex, "hex"))
    );
  }

  // legado: HASH.SALT (salt tratado como string)
  if (stored.includes(".")) {
    const [hashOld, saltOld] = stored.split(".");
    const derived = (await scryptAsync(supplied, saltOld, 64)) as Buffer;
    return (
      derived.length === Buffer.from(hashOld, "hex").length &&
      crypto.timingSafeEqual(derived, Buffer.from(hashOld, "hex"))
    );
  }

  return false;
}

export function setupAuth(app: Express) {
  const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-prod";

  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false);

        const ok = await verifyPassword(password, user.password);
        if (!ok) return done(null, false);

        return done(null, { id: user.id, username: user.username, role: user.role });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) return done(null, false);
      return done(null, { id: user.id, username: user.username, role: user.role });
    } catch (err) {
      return done(err);
    }
  });

  // Rotas básicas de auth
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ ok: true });
    });
  });
}
