#!/usr/bin/env node

// Script de build otimizado para Render - CommonJS
const { execSync } = require('child_process');

console.log('🏗️  Iniciando build para Render...');

try {
  console.log('1. Instalando dependências...');
  execSync('npm ci', { stdio: 'inherit' });

  console.log('2. Building frontend...');
  execSync('npx vite build', { stdio: 'inherit' });

  console.log('3. Building backend com esbuild...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=node18 --sourcemap', { stdio: 'inherit' });

  console.log('4. Copiando assets necessários...');
  execSync('cp -r dist/public/* dist/ 2>/dev/null || true', { stdio: 'inherit' });

  console.log('✅ Build concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro no build:', error.message);
  process.exit(1);
}