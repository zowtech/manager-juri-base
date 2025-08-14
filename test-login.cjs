const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1',
  ssl: { rejectUnauthorized: false }
});

async function testLogin() {
  try {
    // Verificar usuário admin
    const userRes = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    console.log('👤 User found:', userRes.rows[0]);
    
    if (userRes.rows[0]) {
      const user = userRes.rows[0];
      console.log('📝 User details:');
      console.log('  ID:', user.id);
      console.log('  Username:', user.username);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
      console.log('  Password hash:', user.password?.substring(0, 20) + '...');
      
      // Test password
      const testPassword = 'admin123';
      const expectedHash = crypto.createHash('sha256').update(testPassword).digest('hex');
      console.log('🔐 Password test:');
      console.log('  Input:', testPassword);
      console.log('  Expected hash:', expectedHash);
      console.log('  Stored hash:', user.password);
      console.log('  Match:', user.password === expectedHash);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testLogin();