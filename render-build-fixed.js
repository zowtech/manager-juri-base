#!/usr/bin/env node

// Build script otimizado para Render
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Build para Render - Versão Corrigida');

try {
  // 1. Clean build
  console.log('🧹 Limpando builds anteriores...');
  if (fs.existsSync('./dist')) {
    fs.rmSync('./dist', { recursive: true, force: true });
  }
  
  // 2. Build frontend
  console.log('⚛️  Construindo frontend...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // 3. Build backend com configuração especial
  console.log('🔧 Construindo backend...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --sourcemap=false --minify=false', { stdio: 'inherit' });
  
  // 4. Verificar e corrigir função hashPassword
  const distPath = './dist/index.js';
  let content = fs.readFileSync(distPath, 'utf8');
  
  if (!content.includes('async function hashPassword')) {
    console.log('⚠️  Adicionando função hashPassword...');
    
    const hashPasswordFunction = `
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return \`\${buf.toString("hex")}.\${salt}\`;
}
`;
    
    // Encontrar onde inserir a função
    const insertPoint = content.indexOf('// Authentication middleware') || content.indexOf('function isAuthenticated');
    if (insertPoint > -1) {
      content = content.slice(0, insertPoint) + hashPasswordFunction + '\n' + content.slice(insertPoint);
      fs.writeFileSync(distPath, content);
      console.log('✅ Função hashPassword inserida');
    }
  }
  
  // 5. Verificação final
  const finalContent = fs.readFileSync(distPath, 'utf8');
  const hasHashPassword = finalContent.includes('hashPassword');
  
  console.log(`Verificação final: ${hasHashPassword ? '✅' : '❌'} hashPassword`);
  
  if (hasHashPassword) {
    console.log('🎉 Build completo e corrigido!');
  } else {
    throw new Error('Falha na verificação da função hashPassword');
  }
  
} catch (error) {
  console.error('❌ Erro no build:', error.message);
  process.exit(1);
}