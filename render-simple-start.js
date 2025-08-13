#!/usr/bin/env node

// Simple start script for Render deployment
console.log('🚀 Starting Legal Case Management System...');

// Ensure production environment
process.env.NODE_ENV = 'production';

// Set fallback values for missing environment variables
if (!process.env.DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not found, setting from backup...');
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_cENtFV63LasC@ep-proud-sun-adscjpcc.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
}

if (!process.env.SESSION_SECRET) {
  console.log('⚠️  SESSION_SECRET not found, setting fallback...');
  process.env.SESSION_SECRET = 'base-facilities-legal-2024-secret-key-render-deployment';
}

console.log('✅ Environment configured:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗');
console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? 'Set ✓' : 'Missing ✗');

// Start the application
console.log('🎯 Starting server...');

import('./dist/index.js')
  .then(() => {
    console.log('✅ Server started successfully!');
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });