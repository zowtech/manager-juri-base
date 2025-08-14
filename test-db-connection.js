import { Pool } from 'pg';

// Test with the new Transaction pooler URL
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

console.log('🔍 Testing database connection...');
console.log('📋 Environment:', process.env.NODE_ENV);
console.log('🔗 Database URL exists:', !!databaseUrl);
console.log('🔗 Database URL preview:', databaseUrl ? `${databaseUrl.substring(0, 20)}...` : 'NOT SET');

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  max: 1
});

async function testConnection() {
  try {
    console.log('🔄 Attempting database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    console.log('🔄 Testing query...');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query successful:', result.rows[0]);
    
    client.release();
    await pool.end();
    
    console.log('🎉 Database connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();