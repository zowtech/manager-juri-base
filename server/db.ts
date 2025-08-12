import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuração específica para Supabase
const connectionString = process.env.DATABASE_URL;
console.log('🔗 Conectando ao banco:', connectionString.replace(/:[^:@]*@/, ':****@'));

export const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Teste de conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL/Supabase');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão PostgreSQL:', err);
});

export const db = drizzle({ client: pool, schema });