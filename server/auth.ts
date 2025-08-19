// server/auth.ts
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "crypto";
import { promisify } from "util";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db"; // se usar storage, pode trocar por storage.getUser*

const PgSession = connectPgSimple(session);
const scryptAsync = promisify(crypto.scrypt);

// -------- Helpers --------
function safeUser(u: any) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}
function isHex(s: string) {
  return /^[0-9a-f]+$/i.test(s) && s.length % 2 === 0;
}
function mask(s: string, keep = 3) {
  if (!s) return "";
  return s.slice(0, keep) + "***";
}

// Verifica scrypt suportando DUAS variantes de salt:
//  (A) salt como STRING ASCII ("a1b2...")  -> scrypt(password, "a1b2...", 64)
//  (B) salt como BYTES via hex             -> scrypt(password, Buffer.from("a1b2...", "hex"), 64)
// Também aceita SHA-256 legado (64 hex) e "PLAINTEXT::senha" para emergência.
async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  // Emergência DEV
  if (stored.startsWith("PLAINTEXT::")) {
    return plain === stored.slice("PLAINTEXT::".length);
  }

  // scrypt: "hashHex.saltThing"
  if (stored.includes(".")) {
    const [hashHex, saltThing] = stored.split(".");
    if (!hashHex || !saltThing) return false;

    // (A) salt como STRING
    try {
      const a = (await scryptAsync(plain, saltThing, 64)) as Buffer;
      const storedBuf = Buffer.from(hashHex, "hex");
      if (storedBuf.length === a.length && crypto.timingSafeEqual(storedBuf, a)) {
        return true;
      }
    } catch (_) {}

    // (B) salt como BYTES (hex)
    if (isHex(saltThing)) {
      try {
        const b = (await scryptAsync(plain, Buffer.from(saltThing, "hex"), 64)) as Buffer;
        const storedBuf = Buffer.from(hashHex, "hex");
        if (storedBuf.length === b.length && crypto.timingSafeEqual(storedBuf, b)) {
          return true;
        }
      } catch (_) {}
    }

    return false;
  }

  // SHA-256 legado (64 hex)
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    const sha = crypto.createHash("sha256").update(plain).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sha, "hex"), Buffer.from(stored, "hex"));
  }

  return false;
}

// -------- Consulta usuário direta (ajuste se tiver "storage") --------
type DbUser = {
  id: string;
  email: string | null;
  username: string;
  password: string | null;
  role: string | null;
  permissions: any | null;
  first_name: string | null;
  last_name: string | null;
};

async function getUserByUsername(username: string): Promise<DbUser | null> {
  const sql = `
    select id, email, username, password, role, permissions, first_name, last_name
    from public.users
    where lower(username) = lower($1)
    limit 1
  `;
  const r = await pool.query(sql, [username]);
  return r.rows?.[0] || null;
}

async function getUserById(id: string): Promise<DbUser | null> {
  const sql = `
    select id, email, username, password, role, permissions, first_name, last_name
    from public.users
    where id = $1
    limit 1
  `;
  const r = await pool.query(sql, [id]);
  return r.rows?.[0] || null;
}

// -------- Passport --------
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        console.log("🔐 LOGIN ATTEMPT:", username);
        const user = await getUserByUsername(username);
        console.log("👤 USER FOUND:", user ? `${user.username} (${user.id})` : null);
        if (!user || !user.password) return done(null, false);

        const ok = await verifyPassword(password, user.password);
        console.log(
          `🔑 PASSWORD CHECK: supplied="${mask(password)}" stored="${mask(user.password)}" match=${ok}`
        );
        if (!ok) return done(null, false);

        return done(null, safeUser(user));
      } catch (err) {
        console.error("❌ AUTH ERROR:", err);
        return done(err as any);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await getUserById(id);
    done(null, safeUser(user));
  } catch (e) {
    done(e as any);
  }
});

// -------- Setup --------
export function setupAuth(app: Express) {
  // sessão no Postgres (evita MemoryStore em prod)
  app.set("trust proxy", 1);
  const isProd = process.env.NODE_ENV === "production";
  const SESSION_SECRET = process.env.SESSION_SECRET || "dev-change-me";

  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        schemaName: "public",
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: "sid",
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd, // no Render (https) pode ser true
        maxAge: 1000 * 60 * 60 * 8, // 8h
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // ---- Rotas de auth ----
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    console.log("🟦 API REQUEST: POST /api/login with data");
    passport.authenticate("local", (err, user) => {
      if (err) {
        console.error("❌ AUTH ERROR:", err);
        return res.status(500).json({ message: "Auth error" });
      }
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      req.logIn(user, (err2) => {
        if (err2) {
          console.error("❌ LOGIN SESSION ERROR:", err2);
          return res.status(500).json({ message: "Session error" });
        }
        return res.json({ ok: true, user });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: any, res: Response) => {
    req.logout?.((err: any) => {
      if (err) {
        console.error("❌ LOGOUT ERROR:", err);
        return res.status(500).json({ message: "Logout error" });
      }
      req.session?.destroy?.(() => {
        res.clearCookie("sid");
        res.json({ ok: true });
      });
    });
  });

  app.get("/api/user", (req: any, res: Response) => {
    if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });
}
