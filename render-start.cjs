#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando aplicação em produção...');

// Verificar se o arquivo dist existe
const distPath = path.join(__dirname, 'dist', 'index.js');

try {
  require.resolve(distPath);
  console.log('✅ Arquivo de build encontrado');
} catch (error) {
  console.error('❌ Arquivo de build não encontrado:', distPath);
  console.error('Execute o build primeiro: npm run build');
  process.exit(1);
}

// Configurar variáveis de ambiente para produção
process.env.NODE_ENV = 'production';

// Iniciar o servidor
console.log('🌐 Iniciando servidor...');
const server = spawn('node', [distPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  console.error('❌ Erro ao iniciar servidor:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔚 Servidor encerrado com código: ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Recebido SIGTERM, encerrando servidor...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📡 Recebido SIGINT, encerrando servidor...');
  server.kill('SIGINT');
});