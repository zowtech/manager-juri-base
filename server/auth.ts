// server/auth.ts
import type { Express, Request } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "crypto";
import { promisify } from "util";
// Tipos opcionais, ajuste se quiser
import type { Pool } from "pg";

// Armazenamento da sua aplicação (precisa expor getUser, getUserByUsername)
import { storage } from "./storage";

// Sessão no Postgres
import connectPgSimple from "connect-pg-simple";
// @ts-ignore - assinatura do connect-pg-simple pede chamada como função
const PgSession = connectPgSimple(session);

const scryptAsync = promisify(crypto.scrypt);

// ---------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------

function safeUser(u: any) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

/**
 * Valida senha no formato "hashHex.saltHex" usando scrypt(…, 64)
 */
async function verifyScryptPassword(
  suppliedPassword: string,
  stored: string
): Promise<boolean> {
  try {
    if (!stored || !stored.includes(".")) return false;

    const [hashHex, saltHex] = stored.split(".");
    if (!hashHex || !saltHex) return false;

    const salt = Buffer.from(saltHex, "hex");
    const suppliedBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;

    const storedBuf = Buffer.from(hashHex, "hex");

    if (storedBuf.length !== suppliedBuf.length) return false;
    return crypto.timingSafeEqual(storedBuf, suppliedBuf);
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------------
// Passport strategy
// ---------------------------------------------------------------------------------
passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
      passReqToCallback: false,
    },
    async (username, password, done) => {
      try {
        console.log("🔐 LOGIN ATTEMPT:", username);

        const user = await storage.getUserByUsername(username);
        console.log("👤 USER FOUND:", user ? `${user.username} (${user.id})` : null);

        if (!user || !user.password) {
          console.warn("❌ USER NOT FOUND or password missing:", username);
          return done(null, false);
        }

        const ok = await verifyScryptPassword(password, user.password);
        console.log(
          `🔑 PASSWORD CHECK: supplied="${password.slice(0, 3)}***" stored="${String(
            user.password
          ).slice(0, 10)}..." match=${ok}`
        );

        if (!ok) return done(null, false);

        return done(null, safeUser(user));
      } catch (err) {
        console.error("Auth error:", err);
        return done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, safeUser(user));
  } catch (err) {
    done(err);
  }
});

// ---------------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------------
export function setupAuth(app: Express) {
  // Render usa proxy -> necessário p/ cookies "secure"
  app.set("trust proxy", 1);

  const isProd = process.env.NODE_ENV === "production";
  const sessionSecret =
    process.env.SESSION_SECRET || "dev-change-me-session-secret";

  // Store de sessão no Postgres
  const pgStore = new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    schemaName: "public",
    tableName: "session",
  });

  app.use(
    session({
      store: pgStore,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: "sid",
      cookie: {
        httpOnly: true,
        secure: isProd, // true em produção no Render (HTTPS)
        sameSite: isProd ? "lax" : "lax",
        maxAge: 1000 * 60 * 60 * 8, // 8h
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // ---------------------------------------------
  // Rotas de autenticação
  // ---------------------------------------------

  // Login
  app.post("/api/login", (req, res, next) => {
    console.log("🟦 API REQUEST: POST /api/login with data");
    passport.authenticate("local", (err, user) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Erro interno" });
      }
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      req.logIn(user, (err2) => {
        if (err2) {
          console.error("Login session error:", err2);
          return res.status(500).json({ message: "Erro de sessão" });
        }
        return res.json(safeUser(user));
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/logout", (req: Request, res) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json({ ok: true });
    }
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Erro ao sair" });
      }
      // destruir a sessão no store
      req.session.destroy((e) => {
        if (e) console.error("Session destroy error:", e);
        res.clearCookie("sid");
        return res.json({ ok: true });
      });
    });
  });

  // Opcional: rota rápida p/ checar sessão
  app.get("/api/auth/status", (req, res) => {
    res.json({
      authenticated: req.isAuthenticated(),
      user: req.isAuthenticated() ? safeUser((req as any).user) : null,
    });
  });
}
