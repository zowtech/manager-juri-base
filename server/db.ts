// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema"; // ajuste o caminho se seu schema estiver noutro lugar

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 1, // recomendado para o Transaction Pooler do Supabase (pgbouncer)
});

// fixar o schema para evitar sumiços por search_path diferente
pool.on("connect", (client) => {
  client.query("set search_path to public");
});

export const db = drizzle(pool, { schema });

// log seguro (sem senha)
try {
  const u = new URL(dbUrl);
  console.log("[DB] Using:", `${u.protocol}//${u.hostname}:${u.port}${u.pathname}`);
} catch {}

// smoke test (não bloqueante)
pool
  .query("select now() as now")
  .then((r) => console.log("🎉 Database ready:", r.rows[0].now))
  .catch((e) => console.error("❌ Database test failed:", e.message));
