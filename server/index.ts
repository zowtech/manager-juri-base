// server/index.ts
import express from "express";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable("x-powered-by");

// JSON body
app.use(express.json({ limit: "2mb" }));

// compressão
app.use(compression());

// Rotas de API
registerRoutes(app);

// Static do front (Vite -> dist/public)
const publicDir = path.resolve(__dirname, "public");
app.use(express.static(publicDir, { etag: true, maxAge: "1h" }));

// Healthcheck para Render
app.get("/health", (_req, res) => res.type("text").send("ok"));

// SPA fallback: qualquer rota que NÃO comece com /api devolve index.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

// Start
const port = Number(process.env.PORT || 10000);
app.listen(port, () => {
  console.log("✅ Server listening on port", port);
});
