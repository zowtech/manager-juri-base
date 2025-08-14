import Database from 'better-sqlite3';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

// Conectar ao SQLite
const sqlite = new Database('./data/legal-system.db');

// Conectar ao Supabase/PostgreSQL
const pool = new Pool({ 
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  try {
    console.log('🚀 Iniciando migração SQLite → Supabase...');

    // 1. Limpar tabelas existentes no Supabase
    console.log('🧹 Limpando tabelas existentes...');
    await pool.query('DROP TABLE IF EXISTS activity_log CASCADE');
    await pool.query('DROP TABLE IF EXISTS cases CASCADE');
    await pool.query('DROP TABLE IF EXISTS employees CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('DROP TABLE IF EXISTS sessions CASCADE');

    // 2. Criar tabelas no Supabase
    console.log('📋 Criando estrutura das tabelas...');
    
    // Tabela users
    await pool.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'editor',
        permissions JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tabela cases
    await pool.query(`
      CREATE TABLE cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "clientName" VARCHAR(255) NOT NULL,
        "employeeId" UUID,
        "processNumber" VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'novo',
        "startDate" TIMESTAMP,
        "dueDate" TIMESTAMP,
        "dataAudiencia" TIMESTAMP,
        "completedDate" TIMESTAMP,
        "dataEntrega" TIMESTAMP,
        matricula VARCHAR(50),
        "tipoProcesso" VARCHAR(255),
        "documentosSolicitados" JSONB,
        observacoes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tabela employees
    await pool.query(`
      CREATE TABLE employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        matricula VARCHAR(50) UNIQUE,
        empresa VARCHAR(255),
        rg VARCHAR(50),
        pis VARCHAR(50),
        "dataAdmissao" DATE,
        "dataDemissao" DATE,
        salario DECIMAL(10,2),
        cargo VARCHAR(255),
        departamento VARCHAR(255),
        "centroCusto" VARCHAR(100),
        telefone VARCHAR(50),
        email VARCHAR(255),
        endereco TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tabela activity_log
    await pool.query(`
      CREATE TABLE activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tabela sessions
    await pool.query(`
      CREATE TABLE sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);

    // 3. Migrar dados do SQLite para Supabase
    console.log('📊 Migrando dados...');

    // Migrar users
    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`👥 Migrando ${users.length} usuários...`);
    
    for (const user of users) {
      await pool.query(`
        INSERT INTO users (email, username, password, first_name, last_name, role, permissions, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        user.email,
        user.username,
        user.password,
        user.first_name,
        user.last_name,
        user.role,
        user.permissions,
        user.created_at,
        user.updated_at
      ]);
    }

    // Migrar employees
    const employees = sqlite.prepare('SELECT * FROM employees').all();
    console.log(`👷 Migrando ${employees.length} funcionários...`);
    
    for (const emp of employees) {
      await pool.query(`
        INSERT INTO employees (nome, matricula, empresa, rg, pis, "dataAdmissao", "dataDemissao", 
                              salario, cargo, departamento, "centroCusto", telefone, email, endereco, 
                              "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        emp.nome,
        emp.matricula,
        emp.empresa,
        emp.rg,
        emp.pis,
        emp.dataAdmissao,
        emp.dataDemissao,
        emp.salario,
        emp.cargo,
        emp.departamento,
        emp.centroCusto,
        emp.telefone,
        emp.email,
        emp.endereco,
        emp.createdAt,
        emp.updatedAt
      ]);
    }

    // Migrar cases
    const cases = sqlite.prepare('SELECT * FROM cases').all();
    console.log(`⚖️ Migrando ${cases.length} casos...`);
    
    for (const case_ of cases) {
      await pool.query(`
        INSERT INTO cases ("clientName", "employeeId", "processNumber", description, status,
                          "startDate", "dueDate", "dataAudiencia", "completedDate", "dataEntrega",
                          matricula, "tipoProcesso", "documentosSolicitados", observacoes,
                          "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        case_.clientName,
        null, // employeeId será null
        case_.processNumber,
        case_.description,
        case_.status,
        case_.startDate,
        case_.dueDate,
        case_.dataAudiencia,
        case_.completedDate,
        case_.dataEntrega,
        case_.matricula,
        case_.tipoProcesso,
        case_.documentosSolicitados,
        case_.observacoes,
        case_.createdAt,
        case_.updatedAt
      ]);
    }

    // Pular activity_log por enquanto para simplificar
    console.log('📋 Pulando logs de atividade por enquanto...');

    console.log('✅ Migração concluída com sucesso!');
    
    // Verificar dados migrados
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const caseCount = await pool.query('SELECT COUNT(*) FROM cases');
    const empCount = await pool.query('SELECT COUNT(*) FROM employees');
    
    console.log(`📊 Dados migrados:`);
    console.log(`   👥 Usuários: ${userCount.rows[0].count}`);
    console.log(`   ⚖️ Casos: ${caseCount.rows[0].count}`);
    console.log(`   👷 Funcionários: ${empCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
    sqlite.close();
  }
}

migrateData();