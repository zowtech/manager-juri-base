import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Force Supabase URL - override any environment variable
const DATABASE_URL = 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

console.log('🔗 Database connection info:', {
  environment: process.env.NODE_ENV,
  hasUrl: !!DATABASE_URL,
  urlPreview: DATABASE_URL.substring(0, 30) + '...'
});

// Simplified configuration for Supabase reliability
const connectionConfig = {
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
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