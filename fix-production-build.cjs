#!/usr/bin/env node

// Arquivo para compatibilidade com o nome que você já configurou no Render
// Este arquivo simplesmente chama o build-render.cjs

const { execSync } = require('child_process');

console.log('🔄 Redirecionando para build-render.cjs...');

try {
  execSync('node build-render.cjs', { stdio: 'inherit' });
  console.log('✅ Build redirecionado com sucesso!');
} catch (error) {
  console.error('❌ Erro no build:', error.message);
  process.exit(1);
}