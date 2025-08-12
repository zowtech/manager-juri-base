#!/usr/bin/env node

// Script para testar e corrigir conexão Render -> Supabase
const { Pool } = require('pg');

async function testConnection() {
  console.log('🔧 Testando conexão Render -> Supabase...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL não encontrada');
    process.exit(1);
  }

  console.log('🔗 URL:', connectionString.replace(/:[^:@]*@/, ':****@'));

  // Tentar diferentes configurações
  const configs = [
    {
      name: 'Configuração padrão',
      config: { 
        connectionString,
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Com timeout menor',
      config: { 
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
        query_timeout: 10000
      }
    },
    {
      name: 'Forçando IPv4',
      config: { 
        connectionString,
        ssl: { rejectUnauthorized: false },
        options: '-c default_transaction_isolation=read committed'
      }
    }
  ];

  for (const test of configs) {
    console.log(`\n🧪 Testando: ${test.name}`);
    const pool = new Pool(test.config);
    
    try {
      const start = Date.now();
      const result = await pool.query('SELECT NOW() as current_time, version()');
      const duration = Date.now() - start;
      
      console.log(`✅ SUCESSO em ${duration}ms`);
      console.log(`⏰ Hora servidor: ${result.rows[0].current_time}`);
      console.log(`📊 PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
      
      // Testar consulta nas tabelas
      try {
        const users = await pool.query('SELECT count(*) as total FROM users');
        const cases = await pool.query('SELECT count(*) as total FROM cases'); 
        const employees = await pool.query('SELECT count(*) as total FROM employees');
        
        console.log(`👥 Usuários: ${users.rows[0].total}`);
        console.log(`⚖️ Casos: ${cases.rows[0].total}`);
        console.log(`👔 Funcionários: ${employees.rows[0].total}`);
        
        pool.end();
        console.log('\n🎉 Conexão perfeita! Use esta configuração.');
        break;
        
      } catch (tableErr) {
        console.log('⚠️ Conexão OK, mas erro nas tabelas:', tableErr.message);
      }
      
      pool.end();
      
    } catch (err) {
      console.log(`❌ FALHA: ${err.message}`);
      pool.end();
    }
  }
}

if (require.main === module) {
  testConnection().catch(console.error);
}