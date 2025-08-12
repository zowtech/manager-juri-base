#!/usr/bin/env node

// Script para corrigir compatibilidade com Render e produção
// Resolve problemas de tipos, campos e build production

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 INICIANDO CORREÇÕES DE COMPATIBILIDADE COM RENDER...\n');

try {
  // 1. Corrigir shared/schema.ts - atualizar schema de casos
  console.log('📝 Corrigindo schema.ts...');
  const schemaContent = fs.readFileSync('shared/schema.ts', 'utf8');
  
  // Atualizar definição da tabela cases
  const updatedSchema = schemaContent.replace(
    /export const cases = pgTable\("cases", \{[^}]+\}\);/s,
    `export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  matricula: varchar("matricula").notNull(),
  clientName: varchar("client_name").notNull(),
  description: text("description").notNull(),
  status: varchar("status").notNull().default("novo"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  audienceDate: timestamp("audience_date", { withTimezone: true }),
  observacoes: text("observacoes"),
  startDate: timestamp("start_date", { withTimezone: true }).defaultNow(),
  completedDate: timestamp("completed_date", { withTimezone: true }),
  dataEntrega: timestamp("data_entrega", { withTimezone: true }),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  employeeId: varchar("employee_id").references(() => employees.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});`
  );
  
  fs.writeFileSync('shared/schema.ts', updatedSchema);
  console.log('✅ Schema atualizado');

  // 2. Corrigir server/storage.ts - importar employees
  console.log('📝 Corrigindo imports no storage.ts...');
  let storageContent = fs.readFileSync('server/storage.ts', 'utf8');
  
  // Adicionar import employees se não existir
  if (!storageContent.includes('employees')) {
    storageContent = storageContent.replace(
      'import { users, cases, activityLogs',
      'import { users, cases, activityLogs, employees'
    );
  }
  
  // Corrigir função updateCase para usar campos corretos
  storageContent = storageContent.replace(
    /process_number = COALESCE\(\$3, process_number\),/,
    '// process_number removido conforme nova estrutura'
  );
  
  fs.writeFileSync('server/storage.ts', storageContent);
  console.log('✅ Storage.ts corrigido');

  // 3. Criar script de build otimizado para Render
  console.log('📝 Criando script de build para Render...');
  const renderBuildScript = `#!/usr/bin/env node

// Script de build otimizado para Render
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
`;

  fs.writeFileSync('render-build.js', renderBuildScript);
  fs.chmodSync('render-build.js', 0o755);
  console.log('✅ Script de build criado');

  // 4. Criar script de start para produção
  console.log('📝 Criando script de start para produção...');
  const startScript = `#!/usr/bin/env node

// Script de inicialização para produção no Render
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando aplicação em produção...');
console.log('📍 Porta:', PORT);
console.log('📂 Diretório:', __dirname);

// Iniciar servidor
const serverPath = path.join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env, PORT }
});

server.on('close', (code) => {
  console.log(\`Servidor encerrado com código: \${code}\`);
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM, encerrando...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Recebido SIGINT, encerrando...');
  server.kill('SIGINT');
});
`;

  fs.writeFileSync('render-start.js', startScript);
  fs.chmodSync('render-start.js', 0o755);
  console.log('✅ Script de start criado');

  // 5. Atualizar package.json com scripts de Render
  console.log('📝 Atualizando package.json...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  packageJson.scripts = {
    ...packageJson.scripts,
    'render-build': 'node render-build.js',
    'render-start': 'node render-start.js',
    'build:production': 'node render-build.js',
    'start:production': 'node render-start.js'
  };
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ Package.json atualizado');

  console.log('\n🎉 CORREÇÕES CONCLUÍDAS COM SUCESSO!');
  console.log('\n📋 PRÓXIMOS PASSOS PARA RENDER:');
  console.log('1. Commit e push para o Git');
  console.log('2. No Render, definir:');
  console.log('   - Build Command: npm run render-build');
  console.log('   - Start Command: npm run render-start');
  console.log('3. Definir DATABASE_URL nas variáveis de ambiente');
  console.log('\n✨ Sistema pronto para deploy no Render!');

} catch (error) {
  console.error('❌ ERRO:', error.message);
  process.exit(1);
}