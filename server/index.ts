import express from "express";
import path from "path";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// middlewares seguros e leves
app.use(helmet());
app.use(compression());
app.use(morgan("tiny"));
app.use(express.json());

// healthcheck para o Render
app.get("/health", (_req, res) => res.status(200).send("ok"));

// arquivos estáticos do frontend (Vite)
const publicDir = path.join(process.cwd(), "dist", "public");
app.use(express.static(publicDir));

// 👉 suas rotas de API continuam aqui
// registerRoutes(app);  // (o seu arquivo atual que já registra /api/...)

// fallback SPA
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// start único
const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  console.log("✅ Server listening on port", PORT);
});
