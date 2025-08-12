#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Legal Case Management System...');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');

// Set production environment
process.env.NODE_ENV = 'production';

// Check and log all environment variables
console.log('🔍 Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing');

// Set fallback SESSION_SECRET if not provided
if (!process.env.SESSION_SECRET) {
  console.log('⚠️  Setting fallback SESSION_SECRET');
  process.env.SESSION_SECRET = 'base-facilities-legal-2024-secret-key';
}

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}: ${process.env[varName] || 'undefined'}`);
  });
  console.error('🔧 Please set these variables in your Render dashboard');
  process.exit(1);
}

// Start the server
const serverPath = path.join(__dirname, 'dist', 'index.js');
console.log(`🎯 Starting server from: ${serverPath}`);

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});