-- EXECUTE APENAS ISSO NO SUPABASE - UMA LINHA POR VEZ

-- 1. Funcionários
INSERT INTO employees (empresa, nome, matricula, status) VALUES ('33', 'João Silva', '12345', 'ativo');
INSERT INTO employees (empresa, nome, matricula, status) VALUES ('55', 'Maria Costa', '67890', 'ativo');
INSERT INTO employees (empresa, nome, matricula, status) VALUES ('2', 'Carlos Silva', '11111', 'ativo');
INSERT INTO employees (empresa, nome, matricula, status) VALUES ('79', 'Ana Ferreira', '22222', 'ativo');

-- 2. Casos
INSERT INTO cases ("clientName", matricula, "processNumber", description, status) VALUES ('João Silva', '12345', 'TRT-001', 'Reclamação trabalhista', 'pendente');
INSERT INTO cases ("clientName", matricula, "processNumber", description, status) VALUES ('Maria Costa', '67890', 'TRT-002', 'Rescisão indireta', 'novo');
INSERT INTO cases ("clientName", matricula, "processNumber", description, status) VALUES ('Carlos Silva', '11111', 'TRT-003', 'Danos morais', 'concluido');
INSERT INTO cases ("clientName", matricula, "processNumber", description, status) VALUES ('Ana Ferreira', '22222', 'TRT-004', 'Equiparação salarial', 'atrasado');

-- 3. Verificar
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM cases;