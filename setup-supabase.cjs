const { Pool } = require('pg');

// Seu Supabase
const supabaseUrl = 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';

const pool = new Pool({
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function setupSupabase() {
  try {
    console.log('🔄 Conectando ao SEU Supabase...');
    
    // Criar tabelas
    console.log('📋 Criando tabelas...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        password TEXT,
        "firstName" VARCHAR(255),
        "lastName" VARCHAR(255),
        role VARCHAR(50) DEFAULT 'editor',
        permissions JSONB DEFAULT '{}',
        "profileImageUrl" TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        matricula VARCHAR(100),
        nome VARCHAR(255) NOT NULL,
        processo TEXT,
        status VARCHAR(50) DEFAULT 'novo',
        "prazoEntrega" TIMESTAMP,
        audiencia TIMESTAMP,
        "dueDate" TIMESTAMP,
        observacao TEXT,
        "dataEntrega" TIMESTAMP,
        "assignedTo" UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa VARCHAR(10) DEFAULT '2',
        nome VARCHAR(255) NOT NULL,
        matricula VARCHAR(100) UNIQUE,
        rg VARCHAR(50),
        pis VARCHAR(50),
        "dataAdmissao" TIMESTAMP,
        "dataDemissao" TIMESTAMP,
        salario DECIMAL(10,2),
        cargo VARCHAR(255),
        departamento VARCHAR(255),
        "centroCusto" VARCHAR(255),
        email VARCHAR(255),
        telefone VARCHAR(50),
        endereco TEXT,
        status VARCHAR(50) DEFAULT 'ativo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        "resourceType" VARCHAR(100),
        "resourceId" VARCHAR(255),
        description TEXT,
        metadata JSONB DEFAULT '{}',
        "ipAddress" VARCHAR(45),
        "userAgent" TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tabelas criadas com sucesso!');
    
    // Inserir usuário admin
    console.log('👤 Criando usuário admin...');
    
    const adminPassword = 'abf4dcbb4d3321558df18aa60b7fc90dd0e17634949da3a47cfd2202938b5f4b4164d323772842d56d18a8ffa3f4955df0d5b31e32c3a349be930b58e91ceb3b.054755060135b94caaeea4f9ae9a1b0b'; // admin123 hash
    
    await pool.query(`
      INSERT INTO users (id, username, email, password, "firstName", "lastName", role, permissions)
      VALUES (
        '88daa6c3-c28e-4c3c-b7e6-2f009fa667f1',
        'admin',
        'admin@legal.com',
        $1,
        'Administrador',
        'Sistema',
        'admin',
        $2
      )
      ON CONFLICT (username) DO UPDATE SET
        password = $1,
        permissions = $2;
    `, [adminPassword, JSON.stringify({
      "nome": {"edit": true, "view": true},
      "pages": {"cases": true, "users": true, "dashboard": true, "employees": true, "activityLog": true},
      "status": {"edit": true, "view": true},
      "processo": {"edit": true, "view": true},
      "audiencia": {"edit": true, "view": true},
      "matricula": {"edit": true, "view": true},
      "observacao": {"edit": true, "view": true},
      "prazoEntrega": {"edit": true, "view": true},
      "canCreateCases": true,
      "canDeleteCases": true
    })]);
    
    console.log('✅ Usuário admin criado: admin/admin123');
    
    // Verificar dados
    const users = await pool.query('SELECT username, email, role FROM users');
    const cases = await pool.query('SELECT COUNT(*) FROM cases');
    const employees = await pool.query('SELECT COUNT(*) FROM employees');
    
    console.log('📊 Dados no SEU Supabase:');
    console.log('  👥 Usuários:', users.rows);
    console.log('  📋 Casos:', cases.rows[0].count);
    console.log('  👨‍💼 Funcionários:', employees.rows[0].count);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

setupSupabase();