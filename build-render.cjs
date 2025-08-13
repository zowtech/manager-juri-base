#!/usr/bin/env node

const { build } = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando build para Render...');

// 1. Build do cliente (frontend)
console.log('📦 Building frontend...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Frontend build concluído');
} catch (error) {
  console.error('❌ Erro no build do frontend:', error.message);
  process.exit(1);
}

// 2. Build do servidor (backend)
console.log('🔧 Building backend...');
try {
  // Criar diretório dist se não existir
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // Build do servidor com esbuild
  const result = build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/index.js',
    external: [
      'pg-native',
      'fsevents',
      'encoding'
    ],
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    format: 'esm',
    packages: 'external',
    minify: false,
    sourcemap: false,
    logLevel: 'info'
  });

  console.log('✅ Backend build concluído');
} catch (error) {
  console.error('❌ Erro no build do backend:', error.message);
  process.exit(1);
}

// 3. Copiar arquivos estáticos necessários
console.log('📋 Copiando arquivos necessários...');

// Copiar package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.scripts = {
  start: 'node index.js'
};
fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));

console.log('✅ Build completo! Arquivos prontos em ./dist/');
console.log('🎯 Para testar localmente: cd dist && DATABASE_URL=your_url node index.js');