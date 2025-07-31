const XLSX = require('xlsx');
const path = require('path');

console.log('Testando importação XLSX...');

try {
  const filePath = path.resolve('../attached_assets/processos 2024_1753977488884.xlsx');
  console.log('Arquivo:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('Headers:', data[0]);
  console.log('Total rows:', data.length);
  console.log('Sample data:', data.slice(1, 3));
  
  // Processar algumas linhas de exemplo
  const sampleRows = data.slice(1, 6);
  
  for (let i = 0; i < sampleRows.length; i++) {
    const row = sampleRows[i];
    console.log(`\nLinha ${i + 1}:`);
    console.log('  Matrícula:', row[0]);
    console.log('  Nome:', row[1]);
    console.log('  Processo:', row[2]);
    console.log('  Prazo Entrega:', row[3]);
    console.log('  Audiência:', row[4]);
    console.log('  Status:', row[5]);
    console.log('  Data Entrega:', row[6]);
    console.log('  Resultado:', row[7]);
  }
  
} catch (error) {
  console.error('Erro:', error);
}