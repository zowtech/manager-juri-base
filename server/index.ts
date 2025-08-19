// server/index.ts
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import session from "express-session";
import MemoryStoreFactory from "memorystore";
import { setupAuth } from "./auth";          // garante que /api/login e /api/auth/login existem
import { registerRoutes } from "./routes";   // suas rotas de API
import { pool } from "./db";                 // opcional: para teste rápido de conexão

// ------------------------------------------------------------------
// Ambiente
// ------------------------------------------------------------------
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || "production";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";

// ------------------------------------------------------------------
// App
// ------------------------------------------------------------------
const app: Express = express();

// Render fica atrás de proxy -> cookies/SameSite/secure
app.set("trust proxy", 1);

// compressão + parsers
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ------------------------------------------------------------------
// Sessão (usa memorystore pra não exigir tabela/adapter agora)
// Se quiser usar connect-pg-simple depois, dá pra trocar aqui.
// ------------------------------------------------------------------
const MemoryStore = MemoryStoreFactory(session);
app.use(
  session({
    store: new MemoryStore({ checkPeriod: 1000 * 60 * 60 * 8 }), // limpa a cada 8h
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      // em produção no Render com HTTPS, SameSite=Lax funciona bem
      sameSite: "lax",
      secure: false, // deixe false no Render free; se usar plano com HTTPS direto, pode por true
      maxAge: 1000 * 60 * 60 * 8, // 8h
    },
  })
);

// ------------------------------------------------------------------
// Auth (passport) + Rotas de API
// IMPORTANTE: a ordem aqui garante que /api/login NÃO dá 404
// ------------------------------------------------------------------
setupAuth(app);
registerRoutes(app);

// ------------------------------------------------------------------
// Healthcheck para o Render
// ------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response) => res.status(200).send("ok"));

// ------------------------------------------------------------------
// Static + SPA fallback
// este arquivo é compilado para dist/index.js; logo __dirname = ".../dist"
// e os estáticos ficam em ".../dist/public"
// ------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir, { index: "index.html", maxAge: "1h" }));

// qualquer GET que não comece com /api recebe o index.html do SPA
app.get("*", (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

// ------------------------------------------------------------------
// Error handler básico (evita HTML genérico e ajuda no debug)
// ------------------------------------------------------------------
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ------------------------------------------------------------------
// Start + teste de DB (log informativo)
// ------------------------------------------------------------------
async function start() {
  console.log("🚀 LEGAL CASE MANAGEMENT - START");
  console.log("🌐 NODE_ENV:", NODE_ENV);

  // Log do diretório público
  console.log("📁 Serving static from:", publicDir);

  // Teste rápido do banco (não bloqueia o start)
  try {
    const r = await pool.query("select now() as now");
    console.log("🎉 Database ready:", r.rows?.[0]?.now);
  } catch (e) {
    console.warn("⚠️  DB test failed:", (e as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`✅ Server listening on port ${PORT}`);
  });

  // graceful shutdown
  process.on("SIGTERM", () => {
    console.log("⏹️  Shutting down...");
    try {
      pool.end().catch(() => {});
    } finally {
      process.exit(0);
    }
  });
}

start().catch((e) => {
  console.error("Falha ao iniciar:", e);
  process.exit(1);
});
