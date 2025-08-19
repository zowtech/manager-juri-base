// server/auth.ts
import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "crypto";
import { pool } from "./db";

// --------- helpers ----------
function mask(s: string, keep = 6) {
  if (!s) return "";
  return s.length <= keep ? "***" : s.slice(0, keep) + "...";
}

async function scryptHex(password: string, salt: string): Promise<string> {
  return await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err);
      resolve(derived.toString("hex"));
    });
  });
}

/**
 * Verifica senha com suporte a:
 *  - scrypt: "hashHex.salt"  (recomendado)
 *  - sha256 legado: "hex" (64 hex sem ponto)
 *  - PLAINTEXT::senha  (DEV/APENAS EMERGÊNCIA)
 */
async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  // DEV/EMERGÊNCIA (permitir login rápido durante ajustes)
  if (stored.startsWith("PLAINTEXT::")) {
    return plain === stored.slice("PLAINTEXT::".length);
  }

  // scrypt "hash.salt"
  if (stored.includes(".")) {
    const [hashHex, salt] = stored.split(".");
    if (!hashHex || !salt) return false;
    const calc = await scryptHex(plain, salt);
    return crypto.timingSafeEqual(Buffer.from(calc, "hex"), Buffer.from(hashHex, "hex"));
  }

  // SHA-256 legado (64 hex)
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    const sha = crypto.createHash("sha256").update(plain).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sha, "hex"), Buffer.from(stored, "hex"));
  }

  // Comportamento antigo desconhecido -> falha
  return false;
}

// --------- consulta de usuário ----------
type DbUser = {
  id: string;
  email: string | null;
  username: string;
  password: string;
  role: string | null;
  permissions: any | null;
  firstName: string | null;
  lastName: string | null;
};

async function getUserByUsername(username: string): Promise<DbUser | null> {
  // mapeia snake_case -> camelCase
  const sql = `
    SELECT
      id,
      email,
      username,
      password,
      role,
      permissions,
      "first_name"  AS "firstName",
      "last_name"   AS "lastName"
    FROM public.users
    WHERE LOWER(username) = LOWER($1)
    LIMIT 1
  `;
  const r = await pool.query(sql, [username]);
  if (!r.rows?.length) return null;
  return r.rows[0] as DbUser;
}

// --------- passport local ----------
passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req: Request, username: string, password: string, done) => {
      try {
        console.log("🔐 LOGIN ATTEMPT:", username);

        const user = await getUserByUsername(username);
        if (!user) {
          console.log("❌ USER NOT FOUND:", username);
          return done(null, false);
        }

        const ok = await verifyPassword(password, user.password || "");
        console.log(
          "🔑 PASSWORD CHECK:",
          `supplied="${mask(password)}" stored="${mask(user.password || "")}" match=${ok}`
        );

        if (!ok) return done(null, false);

        // usuário mínimo na sessão
        const safeUser = {
          id: user.id,
          username: user.username,
          role: user.role || "user",
          firstName: user.firstName,
          lastName: user.lastName,
          permissions: user.permissions,
        };
        return done(null, safeUser);
      } catch (err) {
        console.error("❌ LOGIN ERROR:", err);
        return done(err as any);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((obj: any, done) => done(null, obj));

// --------- rotas ----------
export function setupAuth(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  // login
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    console.log("🛎️  API REQUEST: POST /api/login with data");
    passport.authenticate("local", (err, user) => {
      if (err) {
        console.error("❌ AUTH ERROR:", err);
        return res.status(500).json({ message: "Auth error" });
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("❌ LOGIN SESSION ERROR:", err);
          return res.status(500).json({ message: "Session error" });
        }
        return res.json({ ok: true, user });
      });
    })(req, res, next);
  });

  // user atual
  app.get("/api/user", (req: any, res: Response) => {
    console.log("🔎 /api/user ->", req.isAuthenticated?.(), req.user);
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

  // logout
  app.post("/api/logout", (req: any, res: Response) => {
    req.logout?.((err: any) => {
      if (err) {
        console.error("❌ LOGOUT ERROR:", err);
        return res.status(500).json({ message: "Logout error" });
      }
      req.session?.destroy?.(() => res.json({ ok: true }));
    });
  });
}
