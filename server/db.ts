import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL is not set');
}

// Log database connection info for debugging
try {
  const u = new URL(dbUrl);
  console.log('[DB] Using:', `${u.protocol}//${u.hostname}:${u.port}${u.pathname}`);
} catch (e) {
  console.log('[DB] DATABASE_URL inválida ou ausente');
}

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 1
});

pool.on('connect', (client) => {
  client.query('set search_path to public');
});

// Helper function for raw queries
export async function query<T = any>(text: string, params?: any[]) {
  const res = await pool.query<T>(text, params);
  return res;
}

// Handle connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

export const db = drizzle(pool, { schema });

// Test connection on startup
pool.query('SELECT NOW() as server_time')
  .then(result => {
    console.log('🎉 Database ready! Server time:', result.rows[0].server_time);
  })
  .catch(err => {
    console.error('❌ Database connection test failed:', err.message);
  });