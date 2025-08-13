#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testando build local para Render...');

// Verificar se DATABASE_URL está configurado
if (!process.env.DATABASE_URL) {
  console.log('⚠️  DATABASE_URL não configurado para teste');
  console.log('   Defina com: export DATABASE_URL="sua_url_supabase"');
}

try {
  // 1. Executar build
  console.log('🔨 Executando build...');
  execSync('node build-render.cjs', { stdio: 'inherit' });
  
  // 2. Verificar arquivos gerados
  console.log('🔍 Verificando arquivos gerados...');
  
  const distExists = fs.existsSync('dist');
  const indexExists = fs.existsSync('dist/index.js');
  const publicExists = fs.existsSync('dist/public');
  const packageExists = fs.existsSync('dist/package.json');
  
  console.log(`   dist/ existe: ${distExists ? '✅' : '❌'}`);
  console.log(`   dist/index.js existe: ${indexExists ? '✅' : '❌'}`);
  console.log(`   dist/public/ existe: ${publicExists ? '✅' : '❌'}`);
  console.log(`   dist/package.json existe: ${packageExists ? '✅' : '❌'}`);
  
  if (distExists && indexExists && publicExists) {
    console.log('✅ Build completado com sucesso!');
    
    // 3. Testar início do servidor (opcional)
    if (process.env.DATABASE_URL) {
      console.log('🚀 Testando servidor de produção...');
      console.log('   Para testar: cd dist && DATABASE_URL="sua_url" node index.js');
    }
  } else {
    console.log('❌ Build incompleto! Verifique os erros acima.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}