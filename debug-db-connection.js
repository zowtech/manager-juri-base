// Script para testar conexão com Supabase
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://postgres:BaseF@cilities2025!@db.fhalwugmppeswkvxnljn.supabase.co:5432/postgres";

console.log('🧪 Testando conexão Supabase...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('🔗 Tentando conectar...');
    const client = await pool.connect();
    
    console.log('✅ Conectado com sucesso!');
    
    // Testar query simples
    const result = await client.query('SELECT COUNT(*) as total FROM users');
    console.log(`📊 Usuários cadastrados: ${result.rows[0].total}`);
    
    const employees = await client.query('SELECT COUNT(*) as total FROM employees WHERE status = $1', ['ativo']);
    console.log(`👥 Funcionários ativos: ${employees.rows[0].total}`);
    
    client.release();
    console.log('✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testConnection();