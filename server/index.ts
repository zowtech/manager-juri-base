// server/index.ts
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db";
import type { Express } from "express";

// se seu arquivo de rotas exporta outra assinatura, ajuste aqui:
import { registerRoutes } from "./routes"; // deve existir algo que receba (app)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NODE_ENV = process.env.NODE_ENV || "development";
const app: Express = express();

console.log("🚀 LEGAL CASE MANAGEMENT - PRODUCTION START");
console.log("🌐 NODE_ENV:", NODE_ENV);

// middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// servir estáticos gerados pelo Vite
const publicDir = path.resolve(process.cwd(), "dist", "public");
app.use(express.static(publicDir));
console.log("📁 Serving static files from:", publicDir);

// rota health básica (HTTP)
app.get("/health", (_req, res) => res.status(200).send("ok"));

// rotas de diagnóstico de DB (sem shell)
app.get("/health/db", async (_req, res) => {
  try {
    const r = await pool.query("select now() as now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e: any) {
    console.error("[HEALTH/DB]", e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/debug/where", async (_req, res) => {
  try {
    const r = await pool.query(`
      select current_database() as db,
             current_user,
             current_schema() as schema,
             inet_server_addr()::text as host,
             inet_server_port() as port
    `);
    res.json({ ok: true, info: r.rows[0] });
  } catch (e: any) {
    console.error("[DEBUG/WHERE]", e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// registrar as rotas da aplicação
try {
  registerRoutes(app);
  console.log("✅ Application routes loaded successfully");
} catch (e) {
  console.error("❌ Failed to load application routes:", e);
}

// fallback para SPA (se necessário)
// descomente se seu front precisar capturar rotas no cliente:
// app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

const PORT = Number(process.env.PORT) || 10000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

// desligamento gracioso
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});