// server/auth.ts
import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { storage } from "./storage";

const scryptAsync = promisify(crypto.scrypt);

// Aceita "salt:hash" (novo) e "hash.salt" (legado)
async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  if (!stored || typeof stored !== "string") return false;

  if (stored.includes(":")) {
    const [saltHex, hashHex] = stored.split(":");
    const derived = (await scryptAsync(supplied, Buffer.from(saltHex, "hex"), 64)) as Buffer;
    return (
      derived.length === Buffer.from(hashHex, "hex").length &&
      crypto.timingSafeEqual(derived, Buffer.from(hashHex, "hex"))
    );
  }

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
  const isProd = process.env.NODE_ENV === "production";

  // IMPORTANTE no Render/Heroku/etc (proxy HTTPS)
  app.set("trust proxy", 1);

  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      // Se quiser usar MemoryStore com limpeza automática, pode trocar:
      // store: new (require('memorystore')(session))({ checkPeriod: 86400000 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",     // mesmo domínio/origem, LAX é suficiente
        secure: isProd,      // exige HTTPS em produção
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      },
      proxy: true, // ajuda o express-session a respeitar o proxy para secure cookies
      name: "sid", // nome do cookie
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

        // dados mínimos na sessão
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

  // Endpoints de auth
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ ok: false, message: "Invalid credentials" });
      req.logIn(user, (err2) => {
        if (err2) return next(err2);
        // Confirma que a sessão foi gravada antes de responder (evita race)
        req.session.save(() => res.json({ ok: true }));
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie("sid");
        res.json({ ok: true });
      });
    });
  });
}
