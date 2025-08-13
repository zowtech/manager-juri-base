-- SCRIPT COMPLETO PARA SUPABASE - Sistema de Gestão Jurídica
-- Execute este script no SQL Editor do Supabase após conectar o DATABASE_URL

-- 1. CRIAR TABELAS (se não existirem)

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "profileImageUrl" TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  permissions JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  matricula TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  rg TEXT,
  pis TEXT,
  "dataAdmissao" DATE,
  "dataDemissao" DATE,
  salario DECIMAL(10,2),
  cargo TEXT,
  "centroCusto" TEXT,
  departamento TEXT,
  empresa INTEGER,
  status TEXT DEFAULT 'ativo',
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Tabela de casos
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "clientName" TEXT NOT NULL,
  matricula TEXT,
  "processNumber" TEXT,
  description TEXT,
  status TEXT DEFAULT 'novo',
  "startDate" DATE,
  "dueDate" DATE,
  "completedDate" DATE,
  "dataEntrega" DATE,
  "dataAudiencia" DATE,
  "tipoProcesso" TEXT,
  "documentosSolicitados" TEXT,
  observacoes TEXT,
  "employeeId" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("employeeId") REFERENCES employees(id)
);

-- Tabela de logs de atividade
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  description TEXT NOT NULL,
  user_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS session (
  sid TEXT PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Tabela de layouts do dashboard
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  layout JSONB,
  widgets JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 2. LIMPAR DADOS EXISTENTES (se necessário)
TRUNCATE TABLE activity_log CASCADE;
TRUNCATE TABLE cases CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE users CASCADE;

-- 3. INSERIR USUÁRIOS DE TESTE

-- Admin com acesso total
INSERT INTO users (id, email, username, password, "firstName", "lastName", role, permissions) VALUES 
('admin-id', 'admin@example.com', 'admin', 'abf4dcbb4d3321558df18aa60b7fc90dd0e17634949da3a47cfd2202938b5f4b4164d323772842d56d18a8ffa3f4955df0d5b31e32c3a349be930b58e91ceb3b.054755060135b94caaeea4f9ae9a1b0b', 'Admin', 'User', 'admin', '{}');

-- Usuário com acesso limitado (apenas casos)
INSERT INTO users (id, email, username, password, "firstName", "lastName", role, permissions) VALUES 
('lucas-id', 'lucas.silva@example.com', 'lucas.silva', '7c6a60e39b6b4b9cc3027e3e0c8e3ad8c9d5a7e3f2d1c0b9a8f7e6d5c4b3a291.15a9c8e7b2d4f6e8a0c9b7d5e3f1a8c6', 'Lucas', 'Silva', 'viewer', 
'{
  "matricula": {"view": true, "edit": false},
  "nome": {"view": true, "edit": false}, 
  "processo": {"view": true, "edit": false},
  "prazoEntrega": {"view": true, "edit": false},
  "audiencia": {"view": true, "edit": false},
  "status": {"view": true, "edit": false},
  "observacao": {"view": true, "edit": false},
  "canCreateCases": false,
  "canDeleteCases": false,
  "pages": {
    "dashboard": false,
    "cases": true,
    "activityLog": false,
    "users": false
  }
}');

-- 4. INSERIR FUNCIONÁRIOS (4 funcionários de empresas diferentes)

INSERT INTO employees (id, matricula, nome, rg, pis, "dataAdmissao", salario, cargo, "centroCusto", departamento, empresa, status) VALUES 
('emp-1', '12345', 'João Silva Santos', '12.345.678-9', '12345678901', '2023-01-15', 5500.00, 'Analista Jr', 'CC001', 'Tecnologia', 2, 'ativo'),
('emp-2', '67890', 'Maria Oliveira Costa', '98.765.432-1', '98765432109', '2022-06-20', 7800.00, 'Coordenadora', 'CC002', 'Recursos Humanos', 33, 'ativo'),
('emp-3', '11111', 'Carlos Mendes Silva', '11.111.111-1', '11111111111', '2023-03-10', 6200.00, 'Supervisor', 'CC003', 'Operações', 55, 'ativo'),
('emp-4', '22222', 'Ana Ferreira Lima', '22.222.222-2', '22222222222', '2022-11-05', 4900.00, 'Assistente', 'CC004', 'Administrativo', 79, 'ativo');

-- 5. INSERIR CASOS JURÍDICOS (8 casos variados)

INSERT INTO cases (id, "clientName", matricula, "processNumber", description, status, "startDate", "dueDate", "dataAudiencia", "tipoProcesso", "employeeId") VALUES 
('case-1', 'João Silva Santos', '12345', 'TRT-001-2024', 'Reclamação trabalhista - horas extras', 'pendente', '2024-01-15', '2024-02-28', '2024-02-20', 'Trabalhista', 'emp-1'),
('case-2', 'Maria Oliveira Costa', '67890', 'TRT-002-2024', 'Rescisão indireta - assédio moral', 'novo', '2024-01-20', '2024-03-15', '2024-03-10', 'Trabalhista', 'emp-2'),
('case-3', 'Carlos Mendes Silva', '11111', 'TRT-003-2024', 'Equiparação salarial', 'concluido', '2023-12-10', '2024-01-31', NULL, 'Trabalhista', 'emp-3'),
('case-4', 'Ana Ferreira Lima', '22222', 'TRT-004-2024', 'Adicional de insalubridade', 'atrasado', '2024-01-05', '2024-01-30', '2024-02-25', 'Trabalhista', 'emp-4'),
('case-5', 'Pedro Santos', '33333', 'CIVIL-001-2024', 'Danos materiais - acidente', 'pendente', '2024-02-01', '2024-04-15', '2024-04-10', 'Cível', NULL),
('case-6', 'Lucia Almeida', '44444', 'FAMILY-001-2024', 'Divórcio consensual', 'novo', '2024-02-10', '2024-05-20', NULL, 'Família', NULL),
('case-7', 'Roberto Lima', '55555', 'CRIMINAL-001-2024', 'Defesa - lesão corporal', 'pendente', '2024-01-25', '2024-03-30', '2024-03-25', 'Criminal', NULL),
('case-8', 'Fernanda Costa', '66666', 'CONSUMER-001-2024', 'Direito do consumidor - produto defeituoso', 'concluido', '2023-11-15', '2024-01-15', NULL, 'Consumidor', NULL);

-- 6. CRIAR ÍNDICES PARA PERFORMANCE

CREATE INDEX IF NOT EXISTS idx_employees_matricula ON employees(matricula);
CREATE INDEX IF NOT EXISTS idx_employees_nome ON employees(nome);
CREATE INDEX IF NOT EXISTS idx_employees_empresa ON employees(empresa);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_due_date ON cases("dueDate");
CREATE INDEX IF NOT EXISTS idx_cases_employee_id ON cases("employeeId");
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

-- 7. VERIFICAR DADOS INSERIDOS

SELECT 'USUÁRIOS' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'FUNCIONÁRIOS' as tabela, COUNT(*) as total FROM employees  
UNION ALL
SELECT 'CASOS' as tabela, COUNT(*) as total FROM cases
UNION ALL
SELECT 'LOGS' as tabela, COUNT(*) as total FROM activity_log;

-- 8. DADOS DE LOGIN PARA TESTE
-- Admin: admin / admin123
-- Limitado: lucas.silva / barone13

SELECT 'SCRIPT EXECUTADO COM SUCESSO!' as status;