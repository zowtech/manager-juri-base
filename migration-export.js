// Script para exportar todos os dados do banco atual
import { db } from './server/db.js';
import { users, cases, employees, activityLog } from './shared/schema.js';
import fs from 'fs';

async function exportData() {
  try {
    console.log('📤 Exportando dados do banco atual...');
    
    // Exportar usuários
    const usersData = await db.select().from(users);
    console.log(`✅ ${usersData.length} usuários exportados`);
    
    // Exportar casos
    const casesData = await db.select().from(cases);
    console.log(`✅ ${casesData.length} casos exportados`);
    
    // Exportar funcionários
    const employeesData = await db.select().from(employees);
    console.log(`✅ ${employeesData.length} funcionários exportados`);
    
    // Exportar logs de atividade
    const logsData = await db.select().from(activityLog);
    console.log(`✅ ${logsData.length} logs exportados`);
    
    // Salvar em arquivo JSON
    const exportData = {
      users: usersData,
      cases: casesData,
      employees: employeesData,
      activityLog: logsData,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    fs.writeFileSync('database-backup.json', JSON.stringify(exportData, null, 2));
    console.log('💾 Backup salvo em database-backup.json');
    
    // Criar SQL também
    let sqlScript = '-- Backup do banco de dados\n\n';
    
    // SQL para usuários
    sqlScript += '-- USUÁRIOS\n';
    usersData.forEach(user => {
      sqlScript += `INSERT INTO users (id, username, email, password, first_name, last_name, role, permissions, created_at) VALUES ('${user.id}', '${user.username}', ${user.email ? `'${user.email}'` : 'NULL'}, '${user.password}', ${user.firstName ? `'${user.firstName}'` : 'NULL'}, ${user.lastName ? `'${user.lastName}'` : 'NULL'}, '${user.role}', '${JSON.stringify(user.permissions).replace(/'/g, "''")}', '${user.createdAt}');\n`;
    });
    
    sqlScript += '\n-- FUNCIONÁRIOS\n';
    employeesData.forEach(emp => {
      sqlScript += `INSERT INTO employees (id, matricula, nome, rg, pis, empresa, data_admissao, data_demissao, salario, cargo, centro_custo, departamento) VALUES ('${emp.id}', '${emp.matricula}', '${emp.nome}', ${emp.rg ? `'${emp.rg}'` : 'NULL'}, ${emp.pis ? `'${emp.pis}'` : 'NULL'}, ${emp.empresa ? `'${emp.empresa}'` : 'NULL'}, ${emp.dataAdmissao ? `'${emp.dataAdmissao}'` : 'NULL'}, ${emp.dataDemissao ? `'${emp.dataDemissao}'` : 'NULL'}, ${emp.salario ? `'${emp.salario}'` : 'NULL'}, ${emp.cargo ? `'${emp.cargo}'` : 'NULL'}, ${emp.centroCusto ? `'${emp.centroCusto}'` : 'NULL'}, ${emp.departamento ? `'${emp.departamento}'` : 'NULL'});\n`;
    });
    
    fs.writeFileSync('database-backup.sql', sqlScript);
    console.log('💾 SQL backup salvo em database-backup.sql');
    
    console.log('\n🎉 Export completo! Arquivos criados:');
    console.log('  - database-backup.json (formato JSON)');
    console.log('  - database-backup.sql (formato SQL)');
    
  } catch (error) {
    console.error('❌ Erro no export:', error);
  }
}

exportData();