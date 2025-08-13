#!/usr/bin/env node

// Arquivo para compatibilidade com o nome que você já configurou no Render
// Este arquivo simplesmente chama npm start

const { execSync } = require('child_process');

console.log('🔄 Redirecionando para npm start...');

try {
  execSync('npm start', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Erro no start:', error.message);
  process.exit(1);
}