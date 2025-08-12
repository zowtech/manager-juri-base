#!/usr/bin/env node

// Script de inicialização para produção no Render - CommonJS
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando aplicação em produção...');
console.log('📍 Porta:', PORT);
console.log('📂 Diretório:', __dirname);

// Iniciar servidor
const serverPath = path.join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env, PORT }
});

server.on('close', (code) => {
  console.log(`Servidor encerrado com código: ${code}`);
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM, encerrando...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Recebido SIGINT, encerrando...');
  server.kill('SIGINT');
});