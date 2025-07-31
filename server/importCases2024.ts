import * as XLSX from 'xlsx';
import { db } from './db';
import { cases, employees } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export async function importCases2024FromExcel(filePath: string, createdById: string) {
  try {
    // Ler arquivo Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Assumir que a primeira linha são os cabeçalhos
    const headers = data[0] as string[];
    const rows = data.slice(1) as any[][];
    
    console.log('Cabeçalhos encontrados:', headers);
    console.log('Total de linhas:', rows.length);
    
    const importedCases = [];
    let errors = [];
    let employeeNotFound = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      try {
        // Mapear dados da planilha com estrutura real identificada:
        // 0: Matricula, 1: Nome, 2: Processo, 3: Prazo da Entrega, 4: Audiencia, 5: Status, 6: Data da entrega, 7: RESULTADO
        const matricula = String(row[0] || '').trim();
        const nome = String(row[1] || '').trim();
        const processo = String(row[2] || '').trim();
        const prazoEntrega = row[3] ? parseExcelDate(row[3]) : null;
        const audiencia = row[4] ? parseExcelDate(row[4]) : null;
        const statusOriginal = String(row[5] || '').trim();
        const dataEntrega = row[6] ? parseExcelDate(row[6]) : null;
        const resultado = String(row[7] || '').trim();
        
        const processData = {
          clientName: nome, // Nome do funcionário
          processNumber: `${matricula}-2024`, // Usar matrícula como identificador único
          description: processo, // Descrição do processo
          status: 'concluido', // Todos os processos de 2024 já estão concluídos
          startDate: new Date('2024-01-01'), // Data início estimada
          dueDate: prazoEntrega, // Prazo de entrega original
          completedDate: dataEntrega || new Date('2024-12-31'), // Data de conclusão
          dataEntrega: dataEntrega || new Date('2024-12-31'), // Data de entrega
          tipoProcesso: 'trabalhista',
          observacoes: resultado ? `Matrícula: ${matricula}. Resultado: ${resultado}` : `Matrícula: ${matricula}`,
          createdById: createdById,
          assignedToId: createdById, // Admin que está importando
        };
        
        // Validar campos obrigatórios
        if (!nome || !matricula) {
          errors.push(`Linha ${i + 2}: Nome e matrícula são obrigatórios`);
          continue;
        }
        
        // Verificar se processo já existe
        const existing = await db.select().from(cases).where(eq(cases.processNumber, processData.processNumber));
        
        if (existing.length > 0) {
          console.log(`Processo já existe: ${processData.processNumber} - pulando`);
          continue;
        }
        
        // Tentar encontrar funcionário pelo nome para vincular
        let employeeId = null;
        try {
          const employeeMatches = await db.select()
            .from(employees)
            .where(sql`LOWER(nome) LIKE ${`%${processData.clientName.toLowerCase()}%`}`)
            .limit(1);
            
          if (employeeMatches.length > 0) {
            employeeId = employeeMatches[0].id;
            console.log(`Funcionário encontrado: ${processData.clientName} -> ${employeeMatches[0].nome}`);
          } else {
            employeeNotFound.push({
              clientName: processData.clientName,
              processNumber: processData.processNumber
            });
          }
        } catch (e) {
          console.log(`Erro ao buscar funcionário para ${processData.clientName}:`, e.message);
        }
        
        // Inserir novo processo
        const [newCase] = await db.insert(cases).values({
          ...processData,
          employeeId
        }).returning();
        
        console.log(`Processo importado: ${processData.processNumber} - ${processData.clientName}`);
        importedCases.push(newCase);
        
      } catch (error) {
        errors.push(`Linha ${i + 2}: ${error.message}`);
        console.error(`Erro na linha ${i + 2}:`, error);
      }
    }
    
    return {
      success: true,
      imported: importedCases.length,
      errors: errors,
      employeeNotFound: employeeNotFound.length,
      employeeNotFoundList: employeeNotFound,
      message: `Importados ${importedCases.length} processos de 2024 com ${errors.length} erros. ${employeeNotFound.length} funcionários não encontrados.`
    };
    
  } catch (error) {
    console.error('Erro ao importar processos 2024:', error);
    return {
      success: false,
      error: error.message,
      message: 'Erro ao processar arquivo Excel de processos 2024'
    };
  }
}

// Função para converter data do Excel para JavaScript Date
function parseExcelDate(excelDate: any): Date | null {
  if (!excelDate) return null;
  
  // Se já é uma data
  if (excelDate instanceof Date) return excelDate;
  
  // Se é um número (serial date do Excel)
  if (typeof excelDate === 'number') {
    // Excel usa 1900-01-01 como base (serial 1), mas precisa de ajustes
    // Para datas do Excel, usar a fórmula: (serial - 25569) * 86400 * 1000
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const excelEpoch = new Date(1970, 0, 1).getTime() - (25569 * millisecondsPerDay);
    return new Date(excelEpoch + (excelDate * millisecondsPerDay));
  }
  
  // Se é string, tentar parsing
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

// Função para buscar processos por status e período
export async function getCases2024Stats() {
  try {
    const cases2024 = await db.select()
      .from(cases)
      .where(sql`EXTRACT(YEAR FROM created_at) = 2024 OR EXTRACT(YEAR FROM completed_date) = 2024`);
    
    const stats = {
      total: cases2024.length,
      concluidos: cases2024.filter(c => c.status === 'concluido').length,
      comFuncionario: cases2024.filter(c => c.employeeId).length,
      semFuncionario: cases2024.filter(c => !c.employeeId).length,
    };
    
    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas 2024:', error);
    return {
      total: 0,
      concluidos: 0,
      comFuncionario: 0,
      semFuncionario: 0
    };
  }
}