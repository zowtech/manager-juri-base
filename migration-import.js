// Script para importar dados para novo banco
import fs from 'fs';

async function importData(newDatabaseUrl) {
  try {
    console.log('📥 Importando dados para novo banco...');
    
    // Ler backup
    const backupData = JSON.parse(fs.readFileSync('database-backup.json', 'utf8'));
    
    // Configurar conexão com novo banco
    process.env.DATABASE_URL = newDatabaseUrl;
    const { db } = await import('./server/db.js');
    const { users, cases, employees, activityLog } = await import('./shared/schema.js');
    
    // Importar usuários
    if (backupData.users.length > 0) {
      await db.insert(users).values(backupData.users);
      console.log(`✅ ${backupData.users.length} usuários importados`);
    }
    
    // Importar funcionários
    if (backupData.employees.length > 0) {
      await db.insert(employees).values(backupData.employees);
      console.log(`✅ ${backupData.employees.length} funcionários importados`);
    }
    
    // Importar casos
    if (backupData.cases.length > 0) {
      await db.insert(cases).values(backupData.cases);
      console.log(`✅ ${backupData.cases.length} casos importados`);
    }
    
    // Importar logs
    if (backupData.activityLog.length > 0) {
      await db.insert(activityLog).values(backupData.activityLog);
      console.log(`✅ ${backupData.activityLog.length} logs importados`);
    }
    
    console.log('🎉 Import completo!');
    
  } catch (error) {
    console.error('❌ Erro no import:', error);
  }
}

// Usar: node migration-import.js "sua-nova-database-url"
const newUrl = process.argv[2];
if (!newUrl) {
  console.log('❌ Por favor forneça a nova DATABASE_URL:');
  console.log('node migration-import.js "postgresql://user:pass@host/db"');
  process.exit(1);
}

importData(newUrl);