// Production start script - simplified for Render
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_cENtFV63LasC@ep-proud-sun-adscjpcc.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'base-facilities-legal-2024-secret-key';

console.log('Starting server...');
import('./dist/index.js');