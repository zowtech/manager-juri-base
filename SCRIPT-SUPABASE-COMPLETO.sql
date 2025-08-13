-- ✅ SCRIPT COMPLETO PARA SUPABASE
-- Copie este código e cole no SQL Editor do Supabase

-- 1. Inserir usuário admin (se não existir)
INSERT INTO users (id, email, username, password, first_name, last_name, role, permissions) 
VALUES (
  gen_random_uuid(),
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
) ON CONFLICT (username) DO UPDATE SET
  role = 'admin',
  permissions = '{
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
  }'::jsonb;

-- 2. Limpar e inserir funcionários
DELETE FROM employees;
INSERT INTO employees (id, empresa, nome, matricula, rg, pis, data_admissao, salario, cargo, centro_custo, departamento, status, created_at, updated_at) VALUES
(gen_random_uuid(), '33', 'João Silva Santos', '12345', '123456789', '12345678901', '2023-01-15', 5500.00, 'Analista Jurídico', 'Jurídico', 'Departamento Legal', 'ativo', NOW(), NOW()),
(gen_random_uuid(), '55', 'Maria Oliveira Costa', '67890', '987654321', '98765432109', '2023-03-20', 4800.00, 'Assistente Legal', 'Jurídico', 'Departamento Legal', 'ativo', NOW(), NOW()),
(gen_random_uuid(), '2', 'Carlos Mendes Silva', '11111', '111111111', '11111111111', '2023-02-10', 6000.00, 'Coordenador Legal', 'Jurídico', 'Departamento Legal', 'ativo', NOW(), NOW()),
(gen_random_uuid(), '79', 'Ana Paula Ferreira', '22222', '222222222', '22222222222', '2023-04-05', 4500.00, 'Estagiária', 'Jurídico', 'Departamento Legal', 'ativo', NOW(), NOW());

-- 3. Limpar e inserir casos
DELETE FROM cases;
INSERT INTO cases (id, client_name, matricula, process_number, description, status, due_date, data_audiencia, tipo_processo, created_at, updated_at) VALUES
(gen_random_uuid(), 'João Silva Santos', '12345', 'TRT-2024-001', 'Reclamação trabalhista - horas extras não pagas', 'pendente', '2024-02-28', '2024-02-25', 'trabalhista', NOW(), NOW()),
(gen_random_uuid(), 'Maria Oliveira Costa', '67890', 'TRT-2024-002', 'Processo de rescisão indireta por assédio moral', 'novo', '2024-03-15', '2024-03-10', 'rescisao_indireta', NOW(), NOW()),
(gen_random_uuid(), 'Carlos Mendes Silva', '11111', 'TRT-2024-003', 'Ação de danos morais', 'concluido', '2024-01-30', '2024-01-25', 'dano_moral', NOW(), NOW()),
(gen_random_uuid(), 'Ana Paula Ferreira', '22222', 'TRT-2024-004', 'Equiparação salarial', 'atrasado', '2024-01-15', '2024-01-10', 'equiparacao_salarial', NOW(), NOW());

-- 4. Verificar dados inseridos
SELECT 'USUÁRIOS:' as tabela, COUNT(*) as total FROM users;
SELECT 'FUNCIONÁRIOS:' as tabela, COUNT(*) as total FROM employees;
SELECT 'CASOS:' as tabela, COUNT(*) as total FROM cases;

-- 5. Mostrar dados para conferência
SELECT 'FUNCIONÁRIOS CADASTRADOS:' as info;
SELECT empresa, nome, matricula, cargo FROM employees ORDER BY empresa;

SELECT 'CASOS CADASTRADOS:' as info;
SELECT client_name, matricula, status, due_date FROM cases ORDER BY created_at;