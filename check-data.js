import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

async function checkData() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Checking database data...');
    
    // Check tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('📋 Tables:', tables.rows.map(t => t.table_name));
    
    // Check data counts
    const employees = await pool.query('SELECT COUNT(*) FROM employees');
    console.log('👥 Employees:', employees.rows[0].count);
    
    const cases = await pool.query('SELECT COUNT(*) FROM cases');
    console.log('⚖️ Cases:', cases.rows[0].count);
    
    const users = await pool.query('SELECT COUNT(*) FROM users');
    console.log('👤 Users:', users.rows[0].count);
    
    // Test employee creation
    console.log('🧪 Testing employee creation...');
    try {
      await pool.query(`
        INSERT INTO employees (empresa, nome, matricula, rg, pis, "dataAdmissao", salario, cargo, "centroCusto", departamento)
        VALUES ('2', 'Teste Silva', 'TEST001', '123.456.789-10', '123.45678.90-1', '2025-01-01', 5000, 'Analista', '001', 'TI')
        ON CONFLICT (matricula) DO NOTHING
      `);
      console.log('✅ Employee creation test: SUCCESS');
    } catch (err) {
      console.log('❌ Employee creation test: FAILED', err.message);
    }
    
    // Check recent employees
    const recentEmployees = await pool.query(`
      SELECT empresa, nome, matricula 
      FROM employees 
      ORDER BY "dataAdmissao" DESC 
      LIMIT 5
    `);
    console.log('📋 Recent employees:', recentEmployees.rows);
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await pool.end();
  }
}

checkData();