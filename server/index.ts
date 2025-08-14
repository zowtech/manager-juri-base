import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import cors from "cors";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";

const app = express();
// CORS middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Remove this middleware - it may interfere with authentication

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run migrations on boot if enabled
  async function runMigrations() {
    const migDir = './migrations';
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      
      if (!fs.existsSync(migDir)) return;

      const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
      for (const f of files) {
        const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
        console.log('[MIGRATION] applying', f);
        await pool.query(sql);
      }
      console.log('[MIGRATION] done');
    } catch (e) {
      console.log('[MIGRATION] directory not found or migration failed:', e);
    }
  }

  if (process.env.RUN_MIGRATIONS_ON_BOOT === 'true') {
    await runMigrations().catch(e => {
      console.error('[MIGRATION] failed:', e);
      process.exit(1);
    });
  }

  // Debug/health routes (sem shell)
  app.get('/health/db', async (_req, res) => {
    try {
      const r = await pool.query('select now() as now');
      res.json({ ok: true, now: r.rows[0].now });
    } catch (e: any) {
      console.error('[HEALTH/DB]', e);
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.get('/debug/where', async (_req, res) => {
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
      console.error('[DEBUG/WHERE]', e);
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  registerRoutes(app);
  
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
    
    // Garantir único listen - porta do Render
    const PORT = Number(process.env.PORT) || 10000;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server listening on port ${PORT}`);
    });
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
  } else {
    const http = await import('http');
    const server = http.createServer(app);
    const PORT = 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Dev server running on http://localhost:${PORT}`);
    });
    await setupVite(app, server);
  }
})();
