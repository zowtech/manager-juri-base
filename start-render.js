// Simple production start script for Render
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

import('./dist/index.js');