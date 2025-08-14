#!/usr/bin/env node

// Production start script with comprehensive error handling
const PORT = process.env.PORT || 5000;

console.log('🚀 LEGAL CASE MANAGEMENT - PRODUCTION START');
console.log(`📍 PORT: ${PORT}`);
console.log(`🌐 NODE_ENV: ${process.env.NODE_ENV || 'production'}`);

// Force production environment
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

console.log('✅ Environment variables set');

// Import required modules
import { createServer } from 'http';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📦 Creating Express application...');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV 
  });
});

// Serve static files
const staticPath = join(__dirname, 'dist', 'public');
console.log(`📁 Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));

// Start server first, then load routes
const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
  
  // Load the full application after server is running
  import('./dist/index.js')
    .then(() => {
      console.log('✅ Application routes loaded successfully');
    })
    .catch((error) => {
      console.error('❌ Failed to load application:', error);
      console.error('Stack:', error.stack);
    });
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📥 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📥 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});