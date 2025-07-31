import * as XLSX from 'xlsx';
import { db } from './db';
import { employees, cases } from '@shared/schema';
import { eq, sql, isNull } from 'drizzle-orm';

export async function importEmployeesFromExcel(filePath: string) {
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
    
    const importedEmployees = [];
    let errors = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      try {
        // Mapear dados da planilha Base Facilities
        // Empresa, Nome do Funcionário, Código do Funcionário, Número do RG, Número do PIS, Data Admissão, Data demissão, SALÁRIO, Descrição do Cargo, Centro de Custo, Descrição do Custo
        const employee = {
          matricula: String(row[2] || '').trim(), // Código do Funcionário
          nome: String(row[1] || '').trim(), // Nome do Funcionário  
          rg: String(row[3] || '').trim() || null, // Número do RG
          departamento: String(row[10] || '').trim() || null, // Descrição do Custo
          cargo: String(row[8] || '').trim() || null, // Descrição do Cargo
          dataAdmissao: row[5] ? new Date(Math.round((row[5] - 25569) * 86400 * 1000)) : null, // Conversão Excel date
          status: row[6] ? 'demitido' : 'ativo' // Se tem data demissão = demitido
        };
        
        // Validar campos obrigatórios
        if (!employee.matricula || !employee.nome) {
          errors.push(`Linha ${i + 2}: Matrícula e nome são obrigatórios`);
          continue;
        }
        
        // Verificar se funcionário já existe
        const existing = await db.select().from(employees).where(eq(employees.matricula, employee.matricula));
        
        if (existing.length > 0) {
          // Atualizar funcionário existente
          await db.update(employees)
            .set({
              ...employee,
              updatedAt: new Date()
            })
            .where(eq(employees.matricula, employee.matricula));
          console.log(`Funcionário atualizado: ${employee.nome} (${employee.matricula})`);
        } else {
          // Inserir novo funcionário
          await db.insert(employees).values(employee);
          console.log(`Funcionário criado: ${employee.nome} (${employee.matricula})`);
        }
        
        importedEmployees.push(employee);
        
      } catch (error) {
        errors.push(`Linha ${i + 2}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      imported: importedEmployees.length,
      errors: errors,
      message: `Importados ${importedEmployees.length} funcionários com ${errors.length} erros`
    };
    
  } catch (error) {
    console.error('Erro ao importar funcionários:', error);
    return {
      success: false,
      error: error.message,
      message: 'Erro ao processar arquivo Excel'
    };
  }
}

// Função para buscar funcionário por nome (busca inteligente)
export async function findEmployeeByName(name: string) {
  const searchTerm = `%${name.toLowerCase()}%`;
  
  const results = await db.select()
    .from(employees)
    .where(sql`LOWER(nome) LIKE ${searchTerm}`)
    .limit(10);
    
  return results;
}

// Função para conectar processos com funcionários
export async function linkCasesToEmployees() {
  try {
    // Buscar todos os casos sem funcionário vinculado
    const cases = await db.select().from(cases).where(isNull(cases.employeeId));
    
    let linked = 0;
    let notFound = [];
    
    for (const case_ of cases) {
      // Tentar encontrar funcionário pelo nome do cliente
      const employeeMatches = await findEmployeeByName(case_.clientName);
      
      if (employeeMatches.length > 0) {
        // Pegar o primeiro match (pode ser melhorado com fuzzy matching)
        const employee = employeeMatches[0];
        
        await db.update(cases)
          .set({ employeeId: employee.id })
          .where(eq(cases.id, case_.id));
          
        console.log(`Processo ${case_.processNumber} vinculado ao funcionário ${employee.nome}`);
        linked++;
      } else {
        notFound.push({
          processNumber: case_.processNumber,
          clientName: case_.clientName
        });
      }
    }
    
    return {
      success: true,
      linked,
      notFound: notFound.length,
      notFoundCases: notFound
    };
    
  } catch (error) {
    console.error('Erro ao vincular processos:', error);
    return {
      success: false,
      error: error.message
    };
  }
}