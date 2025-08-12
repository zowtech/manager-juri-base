#!/usr/bin/env node

// Script de correção para produção no Render
const { execSync } = require('child_process');

console.log('🔧 INICIANDO CORREÇÃO DE PRODUÇÃO RENDER...\n');

try {
  // 1. Verificar environment
  console.log('1. Verificando ambiente de produção...');
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
  console.log(`   Ambiente: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
  
  // 2. Verificar DATABASE_URL
  console.log('2. Verificando conexão com banco...');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL não encontrada!');
  }
  console.log(`   Database: ${dbUrl.includes('supabase') ? 'SUPABASE' : 'OUTRO'}`);

  // 3. Aplicar migrações forçadamente
  console.log('3. Aplicando migrações do schema...');
  try {
    execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
    console.log('   ✅ Schema sincronizado');
  } catch (error) {
    console.log('   ⚠️  Erro no push do schema, continuando...');
  }

  // 4. Build da aplicação
  console.log('4. Construindo aplicação...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('   ✅ Frontend construído');

  // 5. Build do backend
  console.log('5. Construindo backend...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --target=node18', { stdio: 'inherit' });
  console.log('   ✅ Backend construído');

  console.log('\n🎉 CORREÇÃO CONCLUÍDA!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Execute force-production-sync.sql no Supabase');
  console.log('2. Reinicie o serviço no Render');
  console.log('3. Teste login com admin/admin123');

} catch (error) {
  console.error('\n❌ ERRO NA CORREÇÃO:', error.message);
  process.exit(1);
}