-- SCRIPT FINAL SUPER SIMPLES
-- Copie e cole no Supabase SQL Editor

-- Funcionários básicos
INSERT INTO employees (empresa, nome, matricula, status) VALUES
('33', 'João Silva Santos', '12345', 'ativo'),
('55', 'Maria Oliveira Costa', '67890', 'ativo'),
('2', 'Carlos Mendes Silva', '11111', 'ativo'),
('79', 'Ana Paula Ferreira', '22222', 'ativo');

-- Casos básicos  
INSERT INTO cases ("clientName", matricula, "processNumber", description, status) VALUES
('João Silva Santos', '12345', 'TRT-2024-001', 'Reclamação trabalhista', 'pendente'),
('Maria Oliveira Costa', '67890', 'TRT-2024-002', 'Rescisão indireta', 'novo'),
('Carlos Mendes Silva', '11111', 'TRT-2024-003', 'Danos morais', 'concluido'),
('Ana Paula Ferreira', '22222', 'TRT-2024-004', 'Equiparação salarial', 'atrasado');

-- Verificar
SELECT COUNT(*) as funcionarios FROM employees;
SELECT COUNT(*) as casos FROM cases;