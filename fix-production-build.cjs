#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Corrigindo build para produção...');

try {
  // Build normal primeiro
  console.log('📦 Executando build...');
  execSync('npm run build', { stdio: 'inherit' });

  // Verificar e corrigir o arquivo compilado
  const distPath = './dist/index.js';
  let content = fs.readFileSync(distPath, 'utf8');
  
  // Verificar se hashPassword existe
  const hasHashPassword = content.includes('function hashPassword');
  console.log(`hashPassword encontrado: ${hasHashPassword}`);
  
  if (!hasHashPassword) {
    console.log('⚠️  Função hashPassword ausente, corrigindo...');
    
    // Adicionar função no início do arquivo após imports
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
    
    // Inserir após as primeiras linhas de import
    const lines = content.split('\n');
    const insertIndex = lines.findIndex(line => line.includes('function isAuthenticated') || line.includes('// Authentication'));
    
    if (insertIndex > -1) {
      lines.splice(insertIndex, 0, hashPasswordCode);
      content = lines.join('\n');
      fs.writeFileSync(distPath, content);
      console.log('✅ Função hashPassword adicionada');
    }
  }
  
  // Verificação final
  const finalContent = fs.readFileSync(distPath, 'utf8');
  const finalCheck = finalContent.includes('hashPassword');
  console.log(`Verificação final: ${finalCheck ? '✅ OK' : '❌ FALHA'}`);
  
  console.log('🎉 Build corrigido com sucesso!');
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}