#!/usr/bin/env node

// Build script para corrigir problemas de produção
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Iniciando build corrigido para produção...');

// Executar build normal
execSync('npm run build', { stdio: 'inherit' });

// Ler o arquivo compilado
const distPath = './dist/index.js';
let content = fs.readFileSync(distPath, 'utf8');

// Verificar se a função hashPassword está presente
const hashPasswordExists = content.includes('async function hashPassword');
console.log(`hashPassword presente: ${hashPasswordExists}`);

// Se não estiver presente, adicionar manualmente
if (!hashPasswordExists) {
  console.log('⚠️  Função hashPassword não encontrada, adicionando...');
  
  const hashPasswordCode = `
// Password hashing function
const crypto = require('crypto');
const util = require('util');
const scryptAsync = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return \`\${buf.toString("hex")}.\${salt}\`;
}
`;
  
  // Inserir no início do arquivo após os imports
  const importEndIndex = content.indexOf('// Authentication middleware') || content.indexOf('function isAuthenticated');
  if (importEndIndex > -1) {
    content = content.slice(0, importEndIndex) + hashPasswordCode + '\n' + content.slice(importEndIndex);
    fs.writeFileSync(distPath, content);
    console.log('✅ Função hashPassword adicionada ao build de produção');
  }
}

// Verificar novamente
const finalContent = fs.readFileSync(distPath, 'utf8');
const finalCheck = finalContent.includes('async function hashPassword');
console.log(`Verificação final - hashPassword presente: ${finalCheck}`);

if (finalCheck) {
  console.log('🎉 Build de produção corrigido com sucesso!');
} else {
  console.log('❌ Falha ao corrigir build de produção');
  process.exit(1);
}