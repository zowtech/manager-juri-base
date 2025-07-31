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

async function populate2025Database() {
  try {
    console.log('🗄️ Iniciando população do banco com processos 2025...');
    
    // Ler arquivo Excel de 2025
    const filePath = path.resolve('../attached_assets/processos 2025_1753984240985.xlsx');
    console.log('📄 Lendo arquivo:', filePath);
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('📊 Total de linhas no Excel 2025:', data.length);
    console.log('📋 Headers:', data[0]);
    
    // Remover header
    const rows = data.slice(1).filter(row => row.length > 0 && row[0]);
    
    console.log('📝 Linhas válidas para processar:', rows.length);
    
    let imported = 0;
    let errors = 0;
    
    // Processar cada linha
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Estrutura do Excel 2025: Processo, Prazo da Entrega, Data da entrega, Audiencia, Status, Observação
        const processo = row[0];
        const prazoEntrega = row[1] ? convertExcelDate(row[1]) : null;
        const dataEntrega = row[2] ? convertExcelDate(row[2]) : null;
        const audiencia = row[3] ? convertExcelDate(row[3]) : null;
        const status = row[4] || 'novo';
        const observacao = row[5] || '';
        
        if (!processo || typeof processo !== 'string') {
          console.log(`⚠️ Linha ${i + 1}: Processo ausente ou inválido - pulando`);
          continue;
        }
        
        // Gerar nome genérico para 2025
        const nome = `Processo ${i + 1}`;
        const matricula = i + 1;
        
        // Criar número do processo único para 2025
        const numeroProcesso = `${matricula}-2025`;
        
        // Verificar se já existe
        const existingResult = await db.execute(
          `SELECT id FROM cases WHERE process_number = '${numeroProcesso}' LIMIT 1`
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`🔄 Processo já existe: ${numeroProcesso} - pulando`);
          continue;
        }
        
        // Para 2025, não temos funcionários específicos
        const employeeId = null;
        
        // Definir status com base no Excel
        let finalStatus = 'novo';
        let finalDataEntrega = null;
        
        if (status === 'OK' || dataEntrega) {
          finalStatus = 'concluido';
          finalDataEntrega = dataEntrega || new Date();
        }
        
        // Inserir caso de 2025
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
            '${(processo || '').replace(/'/g, "''")}',
            ${prazoEntrega ? `'${prazoEntrega.toISOString()}'` : 'NULL'},
            '${finalStatus}',
            ${finalDataEntrega ? `'${finalDataEntrega.toISOString()}'` : 'NULL'},
            'Processo 2025 - Observação: ${observacao.replace(/'/g, "''")}',
            ${employeeId ? `'${employeeId}'` : 'NULL'},
            'af91cd6a-269d-405f-bf3d-53e813dcb999',
            NOW(),
            NOW()
          )
        `);
        
        imported++;
        
        if (imported % 25 === 0) {
          console.log(`✅ Processados 2025: ${imported}/${rows.length}`);
        }
        
      } catch (error) {
        errors++;
        console.log(`❌ Erro na linha ${i + 1}:`, error.message);
      }
    }
    
    console.log('🎉 População 2025 concluída!');
    console.log(`✅ Casos 2025 importados: ${imported}`);
    console.log(`❌ Erros: ${errors}`);
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  } finally {
    await pool.end();
  }
}

// Executar
populate2025Database();