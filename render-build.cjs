#!/usr/bin/env node

// Script de build otimizado para Render com correções - CommonJS
const { execSync } = require('child_process');

console.log('🏗️  Iniciando build para Render...');

try {
  console.log('1. Instalando dependências...');
  execSync('npm ci', { stdio: 'inherit' });

  console.log('2. Aplicando migrações de schema...');
  try {
    execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
    console.log('   ✅ Schema sincronizado');
  } catch (schemaError) {
    console.log('   ⚠️  Schema skip - continuando build...');
  }

  console.log('3. Building frontend...');
  execSync('npx vite build', { stdio: 'inherit' });

  console.log('4. Building backend com esbuild...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=node18 --sourcemap', { stdio: 'inherit' });

  console.log('5. Copiando assets necessários...');
  execSync('cp -r dist/public/* dist/ 2>/dev/null || true', { stdio: 'inherit' });

  console.log('✅ Build concluído com sucesso!');
  console.log('📝 Lembre-se: Execute force-production-sync.sql no Supabase após deploy');
} catch (error) {
  console.error('❌ Erro no build:', error.message);
  process.exit(1);
}