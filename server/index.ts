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

  // Register routes FIRST before Vite middleware
  const server = await registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // Setup Vite AFTER routes are registered
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Add health check endpoints
  app.get('/health', (_, res) => res.status(200).send('ok'));
  
  // Database health check
  app.get('/health/db', async (_req, res) => {
    try {
      const r = await pool.query('select now() as now');
      res.json({ ok: true, now: r.rows[0].now });
    } catch (err: any) {
      console.error('[HEALTH/DB] error:', err);
      res.status(500).json({ ok: false, error: String(err?.message || err) });
    }
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  const PORT = Number(process.env.PORT) || 10000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server listening on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
})();
