-- SCRIPT SUPER SIMPLES PARA SUPABASE
-- Execute uma seção de cada vez

-- 1. PRIMEIRO: Inserir admin
INSERT INTO users (email, username, password, first_name, last_name, role) 
VALUES ('admin@legal.com', 'admin', 'admin123', 'Admin', 'Sistema', 'admin');

-- 2. SEGUNDO: Inserir funcionários básicos
INSERT INTO employees (empresa, nome, matricula, status) VALUES
('33', 'João Silva Santos', '12345', 'ativo'),
('55', 'Maria Oliveira Costa', '67890', 'ativo'),
('2', 'Carlos Mendes Silva', '11111', 'ativo'),
('79', 'Ana Paula Ferreira', '22222', 'ativo');

-- 3. TERCEIRO: Inserir casos básicos
INSERT INTO cases ("clientName", matricula, "processNumber", description, status) VALUES
('João Silva Santos', '12345', 'TRT-2024-001', 'Reclamação trabalhista', 'pendente'),
('Maria Oliveira Costa', '67890', 'TRT-2024-002', 'Rescisão indireta', 'novo'),
('Carlos Mendes Silva', '11111', 'TRT-2024-003', 'Danos morais', 'concluido'),
('Ana Paula Ferreira', '22222', 'TRT-2024-004', 'Equiparação salarial', 'atrasado');

-- 4. VERIFICAR
SELECT 'USUÁRIOS:' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'FUNCIONÁRIOS:', COUNT(*) FROM employees  
UNION ALL
SELECT 'CASOS:', COUNT(*) FROM cases;