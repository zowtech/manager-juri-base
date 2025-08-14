import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL is not set');
}

console.log('🔗 Database connection info:', {
  environment: process.env.NODE_ENV,
  hasUrl: !!dbUrl
});

const connectionConfig = {
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 1
};

export const pool = new Pool(connectionConfig);

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