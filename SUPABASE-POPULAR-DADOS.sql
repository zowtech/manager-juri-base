-- ✅ SCRIPT PARA POPULAR DADOS NO SUPABASE (usando estrutura existente)
-- Execute este script no SQL Editor do Supabase

-- 1. LIMPAR DADOS EXISTENTES
TRUNCATE TABLE activity_log CASCADE;
TRUNCATE TABLE cases CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE tipos_processo CASCADE;

-- 2. INSERIR USUÁRIO ADMIN
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
  }'::jsonb
);

-- 3. INSERIR TIPOS DE PROCESSO
INSERT INTO tipos_processo (id, nome, descricao, ativo) VALUES
('tp_001', 'trabalhista', 'Reclamações e ações trabalhistas', true),
('tp_002', 'rescisao_indireta', 'Processos de rescisão indireta', true),
('tp_003', 'dano_moral', 'Ações de danos morais', true),
('tp_004', 'equiparacao_salarial', 'Processos de equiparação salarial', true),
('tp_005', 'horas_extras', 'Cobrança de horas extras', true);

-- 4. INSERIR FUNCIONÁRIOS COM DADOS REALISTAS
INSERT INTO employees (empresa, nome, matricula, rg, pis, "dataAdmissao", salario, cargo, "centroCusto", departamento, status) VALUES
('2', 'Carlos Mendes Silva', '11111', '111111111', '11111111111', '2023-02-10', 6000.00, 'Coordenador Legal', 'Jurídico', 'Departamento Legal', 'ativo'),
('33', 'João Silva Santos', '12345', '123456789', '12345678901', '2023-01-15', 5500.00, 'Analista Jurídico', 'Jurídico', 'Departamento Legal', 'ativo'),
('55', 'Maria Oliveira Costa', '67890', '987654321', '98765432109', '2023-03-20', 4800.00, 'Assistente Legal', 'Jurídico', 'Departamento Legal', 'ativo'),
('79', 'Ana Paula Ferreira', '22222', '222222222', '22222222222', '2023-04-05', 4500.00, 'Estagiária', 'Jurídico', 'Departamento Legal', 'ativo'),
('104', 'Roberto Silva Nunes', '33333', '333333333', '33333333333', '2023-01-20', 7200.00, 'Gerente Legal', 'Jurídico', 'Departamento Legal', 'ativo'),
('107', 'Carla Rodrigues Lima', '44444', '444444444', '44444444444', '2023-02-15', 6800.00, 'Coordenadora Jurídica', 'Jurídico', 'Departamento Legal', 'ativo'),
('123', 'Ricardo Mendes Costa', '55555', '555555555', '55555555555', '2023-03-01', 5900.00, 'Advogado Sênior', 'Jurídico', 'Departamento Legal', 'ativo'),
('125', 'Juliana Oliveira Santos', '66666', '666666666', '66666666666', '2023-03-10', 5400.00, 'Analista Jurídico', 'Jurídico', 'Departamento Legal', 'ativo'),
('126', 'Marcos Antonio Silva', '77777', '777777777', '77777777777', '2023-04-01', 5100.00, 'Assistente Jurídico', 'Jurídico', 'Departamento Legal', 'ativo'),
('127', 'Patricia Lima Costa', '88888', '888888888', '88888888888', '2023-04-15', 4900.00, 'Assistente Legal', 'Jurídico', 'Departamento Legal', 'ativo'),
('128', 'Gabriel Santos Almeida', '99999', '999999999', '99999999999', '2023-05-01', 4700.00, 'Assistente Administrativo', 'Jurídico', 'Departamento Legal', 'ativo'),
('150', 'Beatriz Costa Silva', '10101', '101010101', '10101010101', '2023-05-15', 4400.00, 'Estagiária', 'Jurídico', 'Departamento Legal', 'ativo');

-- 5. INSERIR CASOS JURÍDICOS
INSERT INTO cases ("clientName", matricula, "processNumber", description, status, "dueDate", "dataAudiencia", "tipoProcesso", observacoes) VALUES
('João Silva Santos', '12345', 'TRT-2024-001', 'Reclamação trabalhista - horas extras não pagas', 'pendente', '2024-02-28', '2024-02-25', 'trabalhista', 'Documentos coletados. Aguardando audiência.'),
('Maria Oliveira Costa', '67890', 'TRT-2024-002', 'Processo de rescisão indireta por assédio moral', 'novo', '2024-03-15', '2024-03-10', 'rescisao_indireta', 'Testemunhas identificadas.'),
('Carlos Mendes Silva', '11111', 'TRT-2024-003', 'Ação de danos morais', 'concluido', '2024-01-30', '2024-01-25', 'dano_moral', 'Processo concluído com acordo.'),
('Ana Paula Ferreira', '22222', 'TRT-2024-004', 'Equiparação salarial', 'atrasado', '2024-01-15', '2024-01-10', 'equiparacao_salarial', 'URGENTE: Prazo vencido.'),
('Roberto Silva Nunes', '33333', 'TRT-2024-005', 'Acidente de trabalho', 'pendente', '2024-03-25', '2024-03-22', 'trabalhista', 'CAT emitida.'),
('Carla Rodrigues Lima', '44444', 'TRT-2024-006', 'Assédio moral', 'novo', '2024-04-15', '2024-04-12', 'dano_moral', 'Relatos coletados.'),
('Ricardo Mendes Costa', '55555', 'TRT-2024-007', 'Horas extras', 'pendente', '2024-03-30', '2024-03-28', 'horas_extras', 'Análise de ponto finalizada.'),
('Juliana Oliveira Santos', '66666', 'TRT-2024-008', 'Adicional de periculosidade', 'novo', '2024-04-20', '2024-04-18', 'trabalhista', 'Vistoria técnica solicitada.');

-- 6. INSERIR LOGS DE ATIVIDADE
INSERT INTO activity_log (user_id, action, description, ip_address, user_agent) 
SELECT 
  u.id,
  'login',
  'Login realizado no sistema',
  '192.168.1.100',
  'Mozilla/5.0 Browser'
FROM users u WHERE u.username = 'admin'
UNION ALL
SELECT 
  u.id,
  'create_employee',
  'Funcionário cadastrado: João Silva Santos',
  '192.168.1.100',
  'Mozilla/5.0 Browser'
FROM users u WHERE u.username = 'admin'
UNION ALL
SELECT 
  u.id,
  'create_case',
  'Caso criado: TRT-2024-001',
  '192.168.1.100',
  'Mozilla/5.0 Browser'  
FROM users u WHERE u.username = 'admin';

-- 7. VERIFICAR RESULTADOS
SELECT 'USUÁRIOS' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'FUNCIONÁRIOS', COUNT(*) FROM employees  
UNION ALL
SELECT 'CASOS', COUNT(*) FROM cases
UNION ALL
SELECT 'TIPOS PROCESSO', COUNT(*) FROM tipos_processo
UNION ALL
SELECT 'LOGS', COUNT(*) FROM activity_log;

-- Mostrar dados inseridos
SELECT 'FUNCIONÁRIOS POR EMPRESA:' as info;
SELECT empresa, COUNT(*) as total FROM employees GROUP BY empresa ORDER BY empresa;

SELECT 'CASOS POR STATUS:' as info;  
SELECT status, COUNT(*) as total FROM cases GROUP BY status;

SELECT '✅ DADOS POPULADOS COM SUCESSO!' as resultado;