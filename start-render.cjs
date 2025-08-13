#!/usr/bin/env node

console.log('🚀 Iniciando aplicação no Render...');
console.log('📊 Configurações:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurado ✅' : 'Não configurado ❌'}`);
console.log(`   PORT: ${process.env.PORT || 5000}`);

// Verificar se DATABASE_URL está configurado
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurado! Configure a variável de ambiente.');
  process.exit(1);
}

// Verificar se o arquivo principal existe
const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'index.js');
if (!fs.existsSync(mainFile)) {
  console.error('❌ Arquivo index.js não encontrado! Execute o build primeiro.');
  process.exit(1);
}

console.log('✅ Iniciando servidor...');

// Iniciar o servidor
require('./index.js');