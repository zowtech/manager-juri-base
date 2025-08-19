// server/auth.ts
import type { Express, Request, Response } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

type DBUser = {
  id: string;
  email: string | null;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  permissions?: any;
  password?: string | null; // no DB
};

function sanitizeUser(u: any): DBUser {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
}

// ---- Estratégia Local (usuario/senha) ----
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password", session: true },
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password) {
          return done(null, false);
        }

        // senha no formato <hash_hex>.<salt_hex>
        const [hashHex, salt] = String(user.password).split(".");
        if (!hashHex || !salt) return done(null, false);

        const derived = (await scryptAsync(password, salt, 64)) as Buffer;
        const stored = Buffer.from(hashHex, "hex");

        if (!timingSafeEqual(derived, stored)) {
          return done(null, false);
        }

        return done(null, sanitizeUser(user));
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

// ---- sessão ----
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, sanitizeUser(user));
  } catch (err) {
    done(err as Error);
  }
});

export function setupAuth(app: Express) {
  // IMPORTANTE: garanta que o express-session já foi configurado
  // em server/index.ts antes de chamar setupAuth(app).

  app.use(passport.initialize());
  app.use(passport.session());

  const loginOk = (req: Request, res: Response) => {
    // devolve o usuário “sanitizado” já na sessão
    res.json({ ok: true, user: (req as any).user });
  };

  // Alias das rotas de login — ambas funcionam:
  app.post("/api/login", passport.authenticate("local"), loginOk);
  app.post("/api/auth/login", passport.authenticate("local"), loginOk);

  app.post("/api/logout", (req, res) => {
    (req as any).logout?.(() => {});
    res.json({ ok: true });
  });

  // Quem sou eu (verifica sessão)
  app.get("/api/user", (req: any, res) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });
}

// Middleware simples para proteger rotas (se quiser usar):
export function ensureAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated?.()) return next();
  return res.status(401).json({ message: "Unauthorized" });
}
