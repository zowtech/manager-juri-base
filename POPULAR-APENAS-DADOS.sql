-- POPULAR APENAS OS DADOS QUE FALTAM
-- Execute isso no Supabase SQL Editor

-- 1. INSERIR FUNCIONÁRIOS (ignorar se já existem)
INSERT INTO employees (empresa, nome, matricula, rg, pis, "dataAdmissao", salario, cargo, "centroCusto", departamento, status) VALUES
('33', 'João Silva Santos', '12345', '123456789', '12345678901', '2023-01-15', 5500.00, 'Analista Jurídico', 'Jurídico', 'Departamento Legal', 'ativo'),
('55', 'Maria Oliveira Costa', '67890', '987654321', '98765432109', '2023-03-20', 4800.00, 'Assistente Legal', 'Jurídico', 'Departamento Legal', 'ativo'),
('2', 'Carlos Mendes Silva', '11111', '111111111', '11111111111', '2023-02-10', 6000.00, 'Coordenador Legal', 'Jurídico', 'Departamento Legal', 'ativo'),
('79', 'Ana Paula Ferreira', '22222', '222222222', '22222222222', '2023-04-05', 4500.00, 'Estagiária', 'Jurídico', 'Departamento Legal', 'ativo')
ON CONFLICT (matricula) DO NOTHING;

-- 2. INSERIR CASOS (ignorar se já existem)
INSERT INTO cases ("clientName", matricula, "processNumber", description, status, "dueDate", "dataAudiencia", "tipoProcesso", observacoes) VALUES
('João Silva Santos', '12345', 'TRT-2024-001', 'Reclamação trabalhista - horas extras não pagas', 'pendente', '2024-02-28', '2024-02-25', 'trabalhista', 'Documentos coletados'),
('Maria Oliveira Costa', '67890', 'TRT-2024-002', 'Processo de rescisão indireta por assédio moral', 'novo', '2024-03-15', '2024-03-10', 'rescisao_indireta', 'Testemunhas identificadas'),
('Carlos Mendes Silva', '11111', 'TRT-2024-003', 'Ação de danos morais', 'concluido', '2024-01-30', '2024-01-25', 'dano_moral', 'Processo concluído'),
('Ana Paula Ferreira', '22222', 'TRT-2024-004', 'Equiparação salarial', 'atrasado', '2024-01-15', '2024-01-10', 'equiparacao_salarial', 'URGENTE: Prazo vencido')
ON CONFLICT ("processNumber") DO NOTHING;

-- 3. VERIFICAR RESULTADOS
SELECT 'TOTAL DE DADOS:' as info;
SELECT 'Usuários' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'Funcionários', COUNT(*) FROM employees  
UNION ALL
SELECT 'Casos', COUNT(*) FROM cases;