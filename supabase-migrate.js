// Script específico para migração Supabase
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import fs from 'fs';
import * as schema from './shared/schema.ts';

const SUPABASE_URL = "postgresql://postgres.kxqyldwhcfzhbnpfdcjl:BaseF@cilities2025!@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

async function migrateToSupabase() {
  try {
    console.log('🚀 Iniciando migração para Supabase...');
    
    // Conectar ao Supabase
    const pool = new Pool({ connectionString: SUPABASE_URL });
    const db = drizzle({ client: pool, schema });
    
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
    
    // Criar tabelas primeiro usando SQL direto
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
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
    `);
    
    console.log('✅ Estrutura das tabelas criada!');
    
    // Inserir dados
    console.log('📥 Inserindo dados...');
    
    // Inserir usuários
    for (const user of backupData.users) {
      try {
        await pool.query(`
          INSERT INTO users (id, username, email, password, first_name, last_name, role, permissions, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (username) DO UPDATE SET
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            permissions = EXCLUDED.permissions,
            updated_at = EXCLUDED.updated_at
        `, [
          user.id, user.username, user.email, user.password,
          user.firstName, user.lastName, user.role,
          JSON.stringify(user.permissions), user.createdAt, user.updatedAt
        ]);
      } catch (error) {
        console.log(`⚠️ Erro ao inserir usuário ${user.username}:`, error.message);
      }
    }
    console.log(`✅ ${backupData.users.length} usuários inseridos`);
    
    // Inserir funcionários
    for (const emp of backupData.employees) {
      try {
        await pool.query(`
          INSERT INTO employees (id, matricula, nome, rg, pis, empresa, data_admissao, data_demissao, salario, cargo, centro_custo, departamento)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (matricula) DO UPDATE SET
            nome = EXCLUDED.nome,
            rg = EXCLUDED.rg,
            pis = EXCLUDED.pis,
            empresa = EXCLUDED.empresa,
            data_admissao = EXCLUDED.data_admissao,
            data_demissao = EXCLUDED.data_demissao,
            salario = EXCLUDED.salario,
            cargo = EXCLUDED.cargo,
            centro_custo = EXCLUDED.centro_custo,
            departamento = EXCLUDED.departamento
        `, [
          emp.id, emp.matricula, emp.nome, emp.rg, emp.pis, emp.empresa,
          emp.dataAdmissao, emp.dataDemissao, emp.salario, emp.cargo,
          emp.centroCusto, emp.departamento
        ]);
      } catch (error) {
        console.log(`⚠️ Erro ao inserir funcionário ${emp.matricula}:`, error.message);
      }
    }
    console.log(`✅ ${backupData.employees.length} funcionários inseridos`);
    
    // Inserir casos
    for (const caso of backupData.cases) {
      try {
        await pool.query(`
          INSERT INTO cases (id, matricula, nome, processo, prazo_entrega, audiencia, status, data_entrega, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            matricula = EXCLUDED.matricula,
            nome = EXCLUDED.nome,
            processo = EXCLUDED.processo,
            prazo_entrega = EXCLUDED.prazo_entrega,
            audiencia = EXCLUDED.audiencia,
            status = EXCLUDED.status,
            data_entrega = EXCLUDED.data_entrega,
            updated_at = EXCLUDED.updated_at
        `, [
          caso.id, caso.matricula, caso.nome, caso.processo,
          caso.prazoEntrega, caso.audiencia, caso.status, caso.dataEntrega,
          caso.createdAt, caso.updatedAt
        ]);
      } catch (error) {
        console.log(`⚠️ Erro ao inserir caso ${caso.id}:`, error.message);
      }
    }
    console.log(`✅ ${backupData.cases.length} casos inseridos`);
    
    // Testar dados inseridos
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const employeeCount = await pool.query('SELECT COUNT(*) FROM employees');
    const caseCount = await pool.query('SELECT COUNT(*) FROM cases');
    
    console.log('\n🎉 Migração completa!');
    console.log('📊 Dados no Supabase:');
    console.log(`   👥 Usuários: ${userCount.rows[0].count}`);
    console.log(`   👨‍💼 Funcionários: ${employeeCount.rows[0].count}`);
    console.log(`   📋 Casos: ${caseCount.rows[0].count}`);
    
    console.log('\n🔗 Próximos passos:');
    console.log('1. Atualize DATABASE_URL no Render para:');
    console.log('   postgresql://postgres.kxqyldwhcfzhbnpfdcjl:BaseF@cilities2025!@aws-0-us-east-1.pooler.supabase.com:6543/postgres');
    console.log('2. Faça deploy no Render');
    console.log('3. Teste o login: admin/admin123');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

migrateToSupabase();