-- ✅ SCRIPT COMPLETO - REPLICAR TODO O SISTEMA LOCAL NO SUPABASE
-- Este script contém TUDO: tabelas, dados, logs, funcionários, casos, permissions, etc.

-- 1. LIMPAR TODAS AS TABELAS (caso existam)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS dashboard_layouts CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS tipos_processo CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- 2. CRIAR TABELA DE SESSÕES (para autenticação)
CREATE TABLE sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX idx_session_expire ON sessions(expire);

-- 3. CRIAR TABELA DE USUÁRIOS (sistema de login e permissões)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  username VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url VARCHAR(500),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  permissions JSONB DEFAULT '{
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
      "dashboard": true,
      "cases": true,
      "activityLog": false,
      "users": false
    }
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. CRIAR TABELA DE FUNCIONÁRIOS (com todos os campos do Excel)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa VARCHAR(10),                    -- Códigos: 2, 33, 55, 79, 104, 107, 123, 125, 126, 127, 128, 150
  nome VARCHAR(255),                      -- Nome completo
  matricula VARCHAR(50),                  -- Código do funcionário
  rg VARCHAR(20),                         -- RG
  pis VARCHAR(20),                        -- PIS
  data_admissao DATE,                     -- Data de admissão
  data_demissao DATE,                     -- Data de demissão (opcional)
  salario DECIMAL(10,2),                  -- Salário
  cargo VARCHAR(255),                     -- Cargo/função
  centro_custo VARCHAR(255),              -- Centro de custo
  departamento VARCHAR(255),              -- Departamento
  status VARCHAR(20) NOT NULL DEFAULT 'ativo', -- ativo, inativo, deletado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. CRIAR TABELA DE TIPOS DE PROCESSO (para casos jurídicos)
CREATE TABLE tipos_processo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. CRIAR TABELA DE CASOS JURÍDICOS (processo completo)
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(255) NOT NULL,           -- Nome do cliente/funcionário
  employee_id UUID REFERENCES employees(id),   -- Link para funcionário
  process_number VARCHAR(255) NOT NULL,        -- Número do processo
  description TEXT NOT NULL,                   -- Descrição detalhada
  status VARCHAR(50) NOT NULL DEFAULT 'novo',  -- novo, pendente, concluido, atrasado
  start_date TIMESTAMP,                        -- Data de início
  due_date TIMESTAMP,                          -- Prazo de entrega
  data_audiencia TIMESTAMP,                    -- Data da audiência
  completed_date TIMESTAMP,                    -- Data de conclusão
  data_entrega TIMESTAMP,                      -- Data automática quando concluído
  matricula VARCHAR(50),                       -- Matrícula do funcionário
  tipo_processo VARCHAR(255),                  -- Tipo: trabalhista, rescisao_indireta, etc
  documentos_solicitados JSONB,               -- Lista de documentos necessários
  observacoes TEXT,                           -- Observações gerais
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. CRIAR TABELA DE LOGS DE ATIVIDADE (auditoria completa)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255),                        -- Ação realizada
  description TEXT,                           -- Descrição detalhada
  ip_address VARCHAR(45),                     -- IP do usuário
  user_agent TEXT,                           -- Browser/sistema
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. CRIAR TABELA DE LAYOUTS DO DASHBOARD (personalização)
CREATE TABLE dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  layout JSONB,                              -- Configuração do layout
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. INSERIR USUÁRIO ADMINISTRADOR
INSERT INTO users (email, username, password, first_name, last_name, role, permissions) 
VALUES (
  'admin@legal.com', 
  'admin', 
  'admin123',
  'Administrador', 
  'Sistema', 
  'admin',
  '{
    "matricula": {"view": true, "edit": true},
    "nome": {"view": true, "edit": true},
    "processo": {"view": true, "edit": true},
    "prazoEntrega": {"view": true, "edit": true},
    "audiencia": {"view": true, "edit": true},
    "status": {"view": true, "edit": true},
    "observacao": {"view": true, "edit": true},
    "canCreateCases": true,
    "canDeleteCases": true,
    "pages": {
      "dashboard": true,
      "cases": true,
      "activityLog": true,
      "users": true,
      "employees": true
    }
  }'
);

-- 10. INSERIR TIPOS DE PROCESSO JURÍDICO
INSERT INTO tipos_processo (nome, descricao) VALUES
('trabalhista', 'Reclamações e ações trabalhistas'),
('rescisao_indireta', 'Processos de rescisão indireta'),
('dano_moral', 'Ações de danos morais'),
('equiparacao_salarial', 'Processos de equiparação salarial'),
('adicional_insalubridade', 'Adicional de insalubridade'),
('adicional_periculosidade', 'Adicional de periculosidade'),
('horas_extras', 'Cobrança de horas extras'),
('intervalo_intrajornada', 'Intervalo intrajornada não concedido'),
('assedio_moral', 'Casos de assédio moral'),
('acidente_trabalho', 'Acidentes de trabalho');

-- 11. INSERIR FUNCIONÁRIOS COM TODOS OS CÓDIGOS DE EMPRESA
INSERT INTO employees (empresa, nome, matricula, rg, pis, data_admissao, salario, cargo, centro_custo, departamento, status) VALUES
-- Empresa 2
('2', 'Carlos Mendes Silva', '11111', '111111111', '11111111111', '2023-02-10', 6000.00, 'Coordenador Legal', 'Jurídico', 'Departamento Legal', 'ativo'),
('2', 'Fernanda Costa Lima', '11222', '112222222', '11222222222', '2023-03-15', 5800.00, 'Analista Sênior', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 33
('33', 'João Silva Santos', '12345', '123456789', '12345678901', '2023-01-15', 5500.00, 'Analista Jurídico', 'Jurídico', 'Departamento Legal', 'ativo'),
('33', 'Pedro Oliveira Souza', '12346', '123456790', '12345678902', '2023-02-20', 5200.00, 'Advogado Pleno', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 55
('55', 'Maria Oliveira Costa', '67890', '987654321', '98765432109', '2023-03-20', 4800.00, 'Assistente Legal', 'Jurídico', 'Departamento Legal', 'ativo'),
('55', 'Lucia Santos Pereira', '67891', '987654322', '98765432110', '2023-04-10', 4600.00, 'Assistente Administrativo', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 79
('79', 'Ana Paula Ferreira', '22222', '222222222', '22222222222', '2023-04-05', 4500.00, 'Estagiária', 'Jurídico', 'Departamento Legal', 'ativo'),
('79', 'Bruno Almeida Costa', '22223', '222222223', '22222222223', '2023-05-01', 3800.00, 'Estagiário', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 104
('104', 'Roberto Silva Nunes', '33333', '333333333', '33333333333', '2023-01-20', 7200.00, 'Gerente Legal', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 107
('107', 'Carla Rodrigues Lima', '44444', '444444444', '44444444444', '2023-02-15', 6800.00, 'Coordenadora Jurídica', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 123
('123', 'Ricardo Mendes Costa', '55555', '555555555', '55555555555', '2023-03-01', 5900.00, 'Advogado Sênior', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 125
('125', 'Juliana Oliveira Santos', '66666', '666666666', '66666666666', '2023-03-10', 5400.00, 'Analista Jurídico', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 126
('126', 'Marcos Antonio Silva', '77777', '777777777', '77777777777', '2023-04-01', 5100.00, 'Assistente Jurídico', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 127
('127', 'Patricia Lima Costa', '88888', '888888888', '88888888888', '2023-04-15', 4900.00, 'Assistente Legal', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 128
('128', 'Gabriel Santos Almeida', '99999', '999999999', '99999999999', '2023-05-01', 4700.00, 'Assistente Administrativo', 'Jurídico', 'Departamento Legal', 'ativo'),

-- Empresa 150
('150', 'Beatriz Costa Silva', '10101', '101010101', '10101010101', '2023-05-15', 4400.00, 'Estagiária', 'Jurídico', 'Departamento Legal', 'ativo');

-- 12. INSERIR CASOS JURÍDICOS VARIADOS
INSERT INTO cases (client_name, matricula, process_number, description, status, due_date, data_audiencia, tipo_processo, observacoes) VALUES
('João Silva Santos', '12345', 'TRT-2024-001', 'Reclamação trabalhista - horas extras não pagas durante período de 2 anos', 'pendente', '2024-02-28', '2024-02-25', 'trabalhista', 'Documentos já coletados. Aguardando audiência.'),
('Maria Oliveira Costa', '67890', 'TRT-2024-002', 'Processo de rescisão indireta por assédio moral do supervisor direto', 'novo', '2024-03-15', '2024-03-10', 'rescisao_indireta', 'Testemunhas identificadas. Coleta de evidências em andamento.'),
('Carlos Mendes Silva', '11111', 'TRT-2024-003', 'Ação de danos morais - discriminação por idade', 'concluido', '2024-01-30', '2024-01-25', 'dano_moral', 'Processo concluído com acordo. Valor: R$ 15.000'),
('Ana Paula Ferreira', '22222', 'TRT-2024-004', 'Equiparação salarial - função idêntica com salários diferentes', 'atrasado', '2024-01-15', '2024-01-10', 'equiparacao_salarial', 'URGENTE: Prazo vencido. Reagendar audiência.'),
('Pedro Oliveira Souza', '12346', 'TRT-2024-005', 'Adicional de insalubridade não pago', 'pendente', '2024-03-20', '2024-03-18', 'adicional_insalubridade', 'Laudo pericial solicitado.'),
('Lucia Santos Pereira', '67891', 'TRT-2024-006', 'Intervalo intrajornada não concedido', 'novo', '2024-04-10', '2024-04-05', 'intervalo_intrajornada', 'Coleta de cartão ponto em andamento.'),
('Roberto Silva Nunes', '33333', 'TRT-2024-007', 'Acidente de trabalho - indenização', 'pendente', '2024-03-25', '2024-03-22', 'acidente_trabalho', 'CAT emitida. Aguardando perícia médica.'),
('Carla Rodrigues Lima', '44444', 'TRT-2024-008', 'Assédio moral - pressão psicológica', 'novo', '2024-04-15', '2024-04-12', 'assedio_moral', 'Relatos detalhados coletados. Buscar mais testemunhas.'),
('Ricardo Mendes Costa', '55555', 'TRT-2024-009', 'Horas extras - banco de horas irregular', 'pendente', '2024-03-30', '2024-03-28', 'horas_extras', 'Análise de controle de ponto finalizada.'),
('Juliana Oliveira Santos', '66666', 'TRT-2024-010', 'Adicional de periculosidade', 'novo', '2024-04-20', '2024-04-18', 'adicional_periculosidade', 'Solicitação de vistoria técnica no local de trabalho.');

-- 13. INSERIR LOGS DE ATIVIDADE (simulando histórico)
INSERT INTO activity_log (user_id, action, description, ip_address, user_agent) 
SELECT 
  u.id,
  'login',
  'Usuário admin realizou login no sistema',
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users u WHERE u.username = 'admin'
UNION ALL
SELECT 
  u.id,
  'create_employee',
  'Novo funcionário cadastrado: João Silva Santos',
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users u WHERE u.username = 'admin'
UNION ALL
SELECT 
  u.id,
  'create_case',
  'Novo caso criado: TRT-2024-001 - João Silva Santos',
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users u WHERE u.username = 'admin'
UNION ALL
SELECT 
  u.id,
  'update_case',
  'Status do caso TRT-2024-003 alterado para concluído',
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users u WHERE u.username = 'admin'
UNION ALL
SELECT 
  u.id,
  'export_excel',
  'Exportação de relatório de funcionários realizada',
  '192.168.1.100',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM users u WHERE u.username = 'admin';

-- 14. VERIFICAÇÃO FINAL - MOSTRAR TODOS OS DADOS
SELECT '===== RESUMO DO SISTEMA =====' as info;

SELECT 'USUÁRIOS CADASTRADOS:' as categoria, COUNT(*) as total FROM users
UNION ALL
SELECT 'FUNCIONÁRIOS ATIVOS:', COUNT(*) FROM employees WHERE status = 'ativo'
UNION ALL
SELECT 'CASOS JURÍDICOS:', COUNT(*) FROM cases
UNION ALL
SELECT 'TIPOS DE PROCESSO:', COUNT(*) FROM tipos_processo
UNION ALL
SELECT 'LOGS DE ATIVIDADE:', COUNT(*) FROM activity_log;

SELECT '===== FUNCIONÁRIOS POR EMPRESA =====' as info;
SELECT 
  empresa as codigo_empresa,
  COUNT(*) as total_funcionarios,
  STRING_AGG(nome, ', ') as funcionarios
FROM employees 
WHERE status = 'ativo'
GROUP BY empresa 
ORDER BY empresa;

SELECT '===== CASOS POR STATUS =====' as info;
SELECT 
  status,
  COUNT(*) as total_casos,
  STRING_AGG(client_name, ', ') as clientes
FROM cases 
GROUP BY status 
ORDER BY status;

SELECT '✅ SISTEMA COMPLETO CONFIGURADO COM SUCESSO! ✅' as resultado;