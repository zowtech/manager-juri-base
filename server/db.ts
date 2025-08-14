// server/db.ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error("❌ DATABASE_URL não definido");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1, // com pgbouncer
});

export const db = drizzle(pool);

(async () => {
  try {
    const c = await pool.connect();
    await c.query('set search_path to "public";');
    c.release();
    // eslint-disable-next-line no-console
    console.log(`[DB] Using: postgresql://${new URL(DATABASE_URL).hostname}:${new URL(DATABASE_URL).port}/postgres`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("❌ DB init error:", e);
  }
})();
