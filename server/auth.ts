import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string | null;
      email: string | null;
      role: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes('.')) {
    return false;
  }
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000,
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`🔐 LOGIN ATTEMPT: ${username}`);
        const user = await storage.getUserByUsername(username);
        console.log(`👤 USER FOUND:`, user ? `${user.username} (${user.id})` : 'null');
        
        if (!user) {
          console.log(`❌ USER NOT FOUND: ${username}`);
          return done(null, false);
        }
        
        // Check password
        if (!user.password) {
          console.log(`❌ NO PASSWORD SET FOR USER: ${username}`);
          return done(null, false);
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log(`🔑 PASSWORD CHECK: supplied="${password}" stored="${user.password.substring(0, 10)}..." match=${passwordMatch}`);
        
        if (!passwordMatch) {
          console.log(`❌ INVALID PASSWORD for ${username}`);
          return done(null, false);
        }
        
        console.log(`✅ LOGIN SUCCESS: ${username}`);
        return done(null, {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        });
      } catch (error) {
        console.error(`🚨 LOGIN ERROR:`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username já existe" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já existe" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err: any) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('🔐 LOGIN REQUEST BODY:', req.body);
    passport.authenticate("local", (err: any, user: any, info: any) => {
      console.log('🔐 PASSPORT RESULT:', { err, user: user ? user.username : null, info });
      if (err) {
        console.error('🚨 PASSPORT ERROR:', err);
        return next(err);
      }
      if (!user) {
        console.log('❌ AUTHENTICATION FAILED');
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      req.logIn(user, (err: any) => {
        if (err) {
          console.error('🚨 LOGIN ERROR:', err);
          return next(err);
        }
        console.log('✅ LOGIN SUCCESS:', user.username);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req: any, res, next) => {
    req.logout((err: any) => {
      if (err) return next(err);
      req.session.destroy((destroyErr: any) => {
        if (destroyErr) {
          console.error("Session destruction error:", destroyErr);
        }
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((err: any) => {
      if (err) return next(err);
      req.session.destroy((destroyErr: any) => {
        if (destroyErr) {
          console.error("Session destruction error:", destroyErr);
        }
        res.clearCookie('connect.sid');
        res.redirect("/auth");
      });
    });
  });

  // Remove duplicate user route - it's handled in routes.ts
}

export { hashPassword };