import { Pool } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    console.log('🔍 Verificando dados no banco...');
    
    // Verificar usuários
    const users = await pool.query('SELECT username, email, role FROM users ORDER BY username');
    console.log('\n👥 USUÁRIOS:');
    users.rows.forEach(user => {
      console.log(`   ${user.username} (${user.email}) - ${user.role}`);
    });
    
    // Verificar funcionários
    const employees = await pool.query('SELECT nome, matricula, empresa FROM employees ORDER BY nome');
    console.log('\n👷 FUNCIONÁRIOS:');
    employees.rows.forEach(emp => {
      console.log(`   ${emp.nome} (${emp.matricula}) - ${emp.empresa}`);
    });
    
    // Verificar casos
    const cases = await pool.query('SELECT "clientName", "processNumber", status FROM cases ORDER BY "clientName"');
    console.log('\n⚖️ CASOS:');
    cases.rows.forEach(case_ => {
      console.log(`   ${case_.clientName} - ${case_.processNumber} (${case_.status})`);
    });
    
    console.log('\n✅ Verificação concluída!');
    console.log(`📊 Total: ${users.rows.length} usuários, ${employees.rows.length} funcionários, ${cases.rows.length} casos`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();