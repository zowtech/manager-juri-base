import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';
import fs from 'fs';

// Garantir que o diretório data existe
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Caminho do banco SQLite
const dbPath = path.join(dataDir, 'legal-system.db');

// Criar conexão SQLite
const sqlite = new Database(dbPath);

// Habilitar WAL mode para melhor performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('temp_store = memory');
sqlite.pragma('mmap_size = 268435456'); // 256MB

export const db = drizzle(sqlite, { schema });

// Função para inicializar as tabelas
export function initializeDatabase() {
  try {
    // Criar tabela users
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        first_name TEXT,
        last_name TEXT,
        role TEXT NOT NULL DEFAULT 'editor',
        permissions TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela cases
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        clientName TEXT NOT NULL,
        employeeId TEXT,
        processNumber TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'novo',
        startDate DATETIME,
        dueDate DATETIME,
        dataAudiencia DATETIME,
        completedDate DATETIME,
        dataEntrega DATETIME,
        matricula TEXT,
        tipoProcesso TEXT,
        documentosSolicitados TEXT,
        observacoes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela employees
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        nome TEXT NOT NULL,
        matricula TEXT UNIQUE,
        empresa TEXT,
        rg TEXT,
        pis TEXT,
        dataAdmissao DATE,
        dataDemissao DATE,
        salario REAL,
        cargo TEXT,
        departamento TEXT,
        centroCusto TEXT,
        telefone TEXT,
        email TEXT,
        endereco TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela activity_log
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela sessions
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire DATETIME NOT NULL
      )
    `);

    console.log('✅ SQLite database initialized successfully');
    populateInitialData();
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Popular dados iniciais
function populateInitialData() {
  try {
    // Verificar se já existem usuários
    const userCount = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    if (userCount.count === 0) {
      console.log('📋 Populating initial data...');
      
      // Inserir usuários iniciais
      sqlite.exec(`
        INSERT INTO users (id, email, username, password, first_name, last_name, role, permissions) VALUES 
        ('admin-id', 'admin@legal.com', 'admin', 'abf4dcbb4d79e07bf0ad4b896a6b8e47d0b2d0e39fea7b1b3a8faf22dd9e11e6', 'Administrador', 'Sistema', 'admin', 
        '{"nome":{"edit":true,"view":true},"pages":{"cases":true,"users":true,"dashboard":true,"employees":true,"activityLog":true},"status":{"edit":true,"view":true},"processo":{"edit":true,"view":true},"audiencia":{"edit":true,"view":true},"matricula":{"edit":true,"view":true},"observacao":{"edit":true,"view":true},"prazoEntrega":{"edit":true,"view":true},"canCreateCases":true,"canDeleteCases":true}'),
        
        ('lucas-id', 'lucas@legal.com', 'lucas.silva', '74d1b9b6f2c1d57a7b8d2e4f6c9a8b7e3d5c4a9b8c7d6e5f4a3b2c1d8e9f0a1b2', 'Lucas', 'Silva', 'editor', 
        '{"nome":{"edit":true,"view":true},"pages":{"cases":true,"users":false,"dashboard":false,"activityLog":false},"status":{"edit":true,"view":true},"processo":{"edit":true,"view":true},"audiencia":{"edit":true,"view":true},"matricula":{"edit":true,"view":true},"observacao":{"edit":false,"view":true},"prazoEntrega":{"edit":true,"view":true},"canCreateCases":true,"canDeleteCases":false}'),
        
        ('joyce-id', 'joyce@legal.com', 'joyce', 'c8a3b2d1e9f0a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1', 'Joyce', 'Santos', 'editor', 
        '{"nome":{"edit":true,"view":true},"pages":{"cases":true,"users":false,"dashboard":false,"activityLog":false},"status":{"edit":true,"view":true},"processo":{"edit":true,"view":true},"audiencia":{"edit":true,"view":true},"matricula":{"edit":true,"view":true},"observacao":{"edit":false,"view":true},"prazoEntrega":{"edit":true,"view":true},"canCreateCases":true,"canDeleteCases":false}')
      `);

      // Inserir funcionários
      sqlite.exec(`
        INSERT INTO employees (nome, matricula, empresa, rg, pis, dataAdmissao, salario, cargo, departamento, centroCusto) VALUES 
        ('Maria Silva Santos', 'EMP001', 'BASE FACILITIES', '12.345.678-9', '123.45678.90-1', '2023-01-15', 4500.00, 'Advogada Sênior', 'Jurídico', 'CC001'),
        ('João Pedro Oliveira', 'EMP002', 'BASE FACILITIES', '98.765.432-1', '987.65432.10-9', '2023-03-20', 5200.00, 'Coordenador Legal', 'Jurídico', 'CC001'),
        ('Ana Carolina Lima', 'EMP003', 'BASE FACILITIES', '11.222.333-4', '111.22333.44-5', '2023-05-10', 3800.00, 'Assistente Jurídico', 'Jurídico', 'CC001'),
        ('Carlos Eduardo Santos', 'EMP004', 'BASE FACILITIES', '55.666.777-8', '555.66777.88-9', '2023-07-01', 4200.00, 'Analista Legal', 'Jurídico', 'CC001'),
        ('Fernanda Costa Rocha', 'EMP005', 'BASE FACILITIES', '33.444.555-6', '333.44555.66-7', '2023-09-15', 4800.00, 'Advogada Pleno', 'Jurídico', 'CC001')
      `);

      // Inserir casos
      sqlite.exec(`
        INSERT INTO cases (clientName, processNumber, description, status, startDate, dueDate, dataAudiencia, matricula, tipoProcesso, observacoes) VALUES 
        ('Maria Silva Santos', '1001234-56.2024.8.10.0001', 'Ação trabalhista - rescisão contratual', 'novo', '2024-01-15', '2024-12-20', '2024-12-25 14:00:00', 'EMP001', 'Trabalhista', 'Urgente - prazo curto'),
        ('João Pedro Oliveira', '2002345-67.2024.8.10.0002', 'Revisão salarial - equiparação', 'pendente', '2024-02-01', '2024-12-22', '2024-12-28 10:30:00', 'EMP002', 'Trabalhista', 'Aguardando documentos'),
        ('Ana Carolina Lima', '3003456-78.2024.8.10.0003', 'Acidente de trabalho - indenização', 'pendente', '2024-03-10', '2024-12-18', '2024-12-30 15:00:00', 'EMP003', 'Previdenciário', 'Perícia agendada'),
        ('Carlos Eduardo Santos', '4004567-89.2024.8.10.0004', 'Assédio moral - danos morais', 'concluido', '2024-04-05', '2024-07-30', '2024-07-25 09:00:00', 'EMP004', 'Trabalhista', 'Caso finalizado com êxito'),
        ('Fernanda Costa Rocha', '5005678-90.2024.8.10.0005', 'Auxílio-doença - revisão', 'novo', '2024-05-20', '2024-12-25', '2025-01-05 11:00:00', 'EMP005', 'Previdenciário', 'Documentação em análise')
      `);

      console.log('✅ Initial data populated successfully');
    }
  } catch (error) {
    console.error('❌ Error populating initial data:', error);
  }
}

// Exportar instância do sqlite para queries diretas
export { sqlite };

// Inicializar database ao importar
initializeDatabase();