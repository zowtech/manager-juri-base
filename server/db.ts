import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuração específica para Supabase - forçar IPv4
const connectionString = process.env.DATABASE_URL;
console.log('🔗 Conectando ao banco:', connectionString.replace(/:[^:@]*@/, ':****@'));

// Extrair componentes da URL para recriar sem IPv6
const url = new URL(connectionString);
const host = url.hostname;
const port = url.port || '5432';
const database = url.pathname.slice(1);
const username = url.username;
const password = url.password;

console.log(`🔧 Conectando: ${username}@${host}:${port}/${database}`);

export const pool = new Pool({ 
  user: username,
  password: password,
  host: host,
  port: parseInt(port),
  database: database,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000
});

// Teste de conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL/Supabase');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão PostgreSQL:', err);
});

export const db = drizzle({ client: pool, schema });