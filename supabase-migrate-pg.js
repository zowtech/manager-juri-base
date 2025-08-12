// Migração usando pg padrão
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const SUPABASE_URL = "postgresql://postgres.kxqyldwhcfzhbnpfdcjl:BaseF@cilities2025!@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

async function migrateToSupabase() {
  let pool;
  try {
    console.log('🚀 Iniciando migração para Supabase...');
    
    // Conectar ao Supabase
    pool = new Pool({ 
      connectionString: SUPABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Testar conexão
    console.log('🔗 Testando conexão...');
    await pool.query('SELECT 1');
    console.log('✅ Conexão com Supabase estabelecida!');
    
    // Ler dados do backup
    const backupData = JSON.parse(fs.readFileSync('database-backup.json', 'utf8'));
    console.log('📖 Backup carregado:', {
      users: backupData.users.length,
      cases: backupData.cases.length,
      employees: backupData.employees.length
    });
    
    // Criar tabelas primeiro
    console.log('📋 Criando estrutura das tabelas...');
    
    // Criar tabela users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        username VARCHAR UNIQUE NOT NULL,
        email VARCHAR,
        password VARCHAR NOT NULL,
        first_name VARCHAR,
        last_name VARCHAR,
        role VARCHAR DEFAULT 'editor',
        permissions JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Criar tabela employees
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR PRIMARY KEY,
        matricula VARCHAR UNIQUE NOT NULL,
        nome VARCHAR NOT NULL,
        rg VARCHAR,
        pis VARCHAR,
        empresa VARCHAR,
        data_admissao DATE,
        data_demissao DATE,
        salario DECIMAL,
        cargo VARCHAR,
        centro_custo VARCHAR,
        departamento VARCHAR,
        deleted_at TIMESTAMP
      );
    `);
    
    // Criar tabela cases
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id VARCHAR PRIMARY KEY,
        matricula VARCHAR NOT NULL,
        nome VARCHAR NOT NULL,
        processo TEXT,
        prazo_entrega DATE,
        audiencia DATE,
        status VARCHAR DEFAULT 'novo',
        data_entrega DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Criar tabela activity_log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR,
        action VARCHAR NOT NULL,
        description TEXT,
        ip_address VARCHAR,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Criar tabela sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
    `);
    
    console.log('✅ Estrutura das tabelas criada!');
    
    // Limpar dados existentes
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM employees');
    await pool.query('DELETE FROM cases');
    await pool.query('DELETE FROM activity_log');
    
    // Inserir usuários
    console.log('📥 Inserindo usuários...');
    for (const user of backupData.users) {
      await pool.query(`
        INSERT INTO users (id, username, email, password, first_name, last_name, role, permissions, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        user.id, user.username, user.email, user.password,
        user.firstName, user.lastName, user.role,
        JSON.stringify(user.permissions), user.createdAt, user.updatedAt
      ]);
    }
    console.log(`✅ ${backupData.users.length} usuários inseridos`);
    
    // Inserir funcionários
    console.log('📥 Inserindo funcionários...');
    for (const emp of backupData.employees) {
      await pool.query(`
        INSERT INTO employees (id, matricula, nome, rg, pis, empresa, data_admissao, data_demissao, salario, cargo, centro_custo, departamento)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        emp.id, emp.matricula, emp.nome, emp.rg, emp.pis, emp.empresa,
        emp.dataAdmissao, emp.dataDemissao, emp.salario, emp.cargo,
        emp.centroCusto, emp.departamento
      ]);
    }
    console.log(`✅ ${backupData.employees.length} funcionários inseridos`);
    
    // Inserir casos
    console.log('📥 Inserindo casos...');
    for (const caso of backupData.cases) {
      await pool.query(`
        INSERT INTO cases (id, matricula, nome, processo, prazo_entrega, audiencia, status, data_entrega, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        caso.id, caso.matricula, caso.nome, caso.processo,
        caso.prazoEntrega, caso.audiencia, caso.status, caso.dataEntrega,
        caso.createdAt, caso.updatedAt
      ]);
    }
    console.log(`✅ ${backupData.cases.length} casos inseridos`);
    
    // Verificar dados inseridos
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const employeeCount = await pool.query('SELECT COUNT(*) FROM employees');
    const caseCount = await pool.query('SELECT COUNT(*) FROM cases');
    
    console.log('\n🎉 MIGRAÇÃO COMPLETA!');
    console.log('📊 Dados no Supabase:');
    console.log(`   👥 Usuários: ${userCount.rows[0].count}`);
    console.log(`   👨‍💼 Funcionários: ${employeeCount.rows[0].count}`);
    console.log(`   📋 Casos: ${caseCount.rows[0].count}`);
    
    console.log('\n🔗 PRÓXIMOS PASSOS:');
    console.log('1. Atualize DATABASE_URL no Render');
    console.log('2. Faça deploy no Render');
    console.log('3. Teste: admin/admin123');
    console.log('\n✅ VOCÊ AGORA TEM TOTAL INDEPENDÊNCIA!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    if (pool) await pool.end();
  }
}

migrateToSupabase();