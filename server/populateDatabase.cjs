const XLSX = require('xlsx');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require('ws');

// Configurar Neon
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

// Conectar ao banco
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

function convertExcelDate(excelDate) {
  if (!excelDate || typeof excelDate !== 'number') {
    return new Date();
  }
  
  // Excel date serial number to JavaScript date
  const utc_days = Math.floor(excelDate - 25569);
  const utc_value = utc_days * 86400; 
  const date_info = new Date(utc_value * 1000);
  return date_info;
}

async function populateDatabase() {
  try {
    console.log('🗄️ Iniciando população do banco de dados...');
    
    // Ler arquivo Excel
    const filePath = path.resolve('../attached_assets/processos 2024_1753982611583.xlsx');
    console.log('📄 Lendo arquivo:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('📊 Total de linhas no Excel:', data.length);
    console.log('📋 Headers:', data[0]);
    
    // Remover header
    const rows = data.slice(1).filter(row => row.length > 0 && row[0]);
    
    console.log('📝 Linhas válidas para processar:', rows.length);
    
    // Limpar tabela de casos existentes de 2024
    console.log('🧹 Limpando casos existentes de 2024...');
    await db.execute('DELETE FROM cases WHERE "process_number" LIKE \'%-2024\' OR "observacoes" LIKE \'%Processo 2024%\'');
    
    let imported = 0;
    let errors = 0;
    
    // Processar cada linha
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const matricula = row[0]?.toString();
        const nome = row[1];
        const processo = row[2];
        const prazoEntrega = row[3] ? convertExcelDate(row[3]) : null;
        const audiencia = row[4] ? convertExcelDate(row[4]) : null;
        const dataEntrega = row[6] ? convertExcelDate(row[6]) : new Date();
        const resultado = row[7] || '';
        
        if (!matricula || !nome || !processo) {
          console.log(`⚠️ Linha ${i + 1}: Dados obrigatórios ausentes - pulando`);
          continue;
        }
        
        // Criar número do processo único
        const numeroProcesso = `${matricula}-2024`;
        
        // Buscar funcionário por nome
        const employeeResult = await db.execute(
          `SELECT id FROM employees WHERE UPPER(TRIM(nome)) = UPPER(TRIM('${nome.replace(/'/g, "''")}')) LIMIT 1`
        );
        
        const employeeId = employeeResult.rows[0]?.id || null;
        
        // Inserir caso usando template string
        await db.execute(`
          INSERT INTO cases (
            client_name, 
            process_number, 
            description,
            due_date, 
            status, 
            data_entrega,
            observacoes,
            employee_id,
            created_by_id,
            created_at,
            updated_at
          ) VALUES (
            '${nome.replace(/'/g, "''")}',
            '${numeroProcesso}',
            '${processo.replace(/'/g, "''")}',
            '${prazoEntrega ? prazoEntrega.toISOString() : null}',
            'concluido',
            '${dataEntrega.toISOString()}',
            'Matrícula: ${matricula} - Resultado: ${resultado.replace(/'/g, "''")}',
            ${employeeId ? `'${employeeId}'` : 'NULL'},
            'af91cd6a-269d-405f-bf3d-53e813dcb999',
            NOW(),
            NOW()
          )
        `);
        
        imported++;
        
        if (imported % 50 === 0) {
          console.log(`✅ Processados: ${imported}/${rows.length}`);
        }
        
      } catch (error) {
        errors++;
        console.log(`❌ Erro na linha ${i + 1}:`, error.message);
      }
    }
    
    console.log('🎉 População concluída!');
    console.log(`✅ Casos importados: ${imported}`);
    console.log(`❌ Erros: ${errors}`);
    console.log('📋 Status: Todos marcados como "concluído"');
    console.log('📅 Data da entrega: Definida automaticamente');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  } finally {
    await pool.end();
  }
}

// Executar
populateDatabase();