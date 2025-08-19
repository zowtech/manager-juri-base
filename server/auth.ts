// server/auth.ts (trecho relevante)
// certifique-se que estes imports existem no topo do arquivo:
// import passport from "passport";
// import { Strategy as LocalStrategy } from "passport-local";
// import session from "express-session";
// import MemoryStore from "memorystore";
// import { storage } from "./storage"; // seu storage atual
// import type { Express } from "express";

export function setupAuth(app: Express) {
  // ORDEM IMPORTANTE:
  // 1) body parser
  app.use((await import("express")).json());
  app.use((await import("express")).urlencoded({ extended: true }));

  // 2) sessão
  const MemStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "change-me",
      resave: false,
      saveUninitialized: false,
      store: new MemStore({ checkPeriod: 86400000 }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: true, // Render usa HTTPS -> ok
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      },
    })
  );

  // 3) passport
  app.use(passport.initialize());
  app.use(passport.session());

  // strategy local
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false);

        const ok = await storage.verifyPassword(user.password ?? "", password);
        if (!ok) return done(null, false);
        return done(null, { id: user.id });
      } catch (err) {
        return done(err as any);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user ? { id: user.id } : false);
    } catch (e) {
      done(e as any);
    }
  });

  // ====== ROTA DE LOGIN EM JSON ======
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user) => {
      if (err) {
        console.error("AUTH ERROR:", err);
        return res.status(500).json({ message: "Auth error" });
      }
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      req.logIn(user, async (err2) => {
        if (err2) {
          console.error("LOGIN ERROR:", err2);
          return res.status(500).json({ message: "Login error" });
        }
        // retorna também os dados básicos do usuário atual
        const fullUser = await storage.getUser((user as any).id);
        return res.json({ ok: true, user: fullUser });
      });
    })(req, res, next);
  });

  // rota para obter usuário logado
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });

  // rota de logout
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ ok: true });
    });
  });
}
