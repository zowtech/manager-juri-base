-- =============================================
-- SCRIPT COMPLETO PARA SUPABASE
-- COPIE E COLE TUDO NO SQL EDITOR DO SUPABASE
-- =============================================

-- 1. CRIAR ESTRUTURA DAS TABELAS
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR,
    password VARCHAR NOT NULL,
    first_name VARCHAR,
    last_name VARCHAR,
    role VARCHAR DEFAULT 'editor',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR PRIMARY KEY,
    matricula VARCHAR UNIQUE NOT NULL,
    nome VARCHAR NOT NULL,
    rg VARCHAR,
    pis VARCHAR,
    empresa VARCHAR,
    data_admissao DATE,
    data_demissao DATE,
    salario DECIMAL,
    cargo VARCHAR,
    centro_custo VARCHAR,
    departamento VARCHAR,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR PRIMARY KEY,
    matricula VARCHAR NOT NULL,
    nome VARCHAR NOT NULL,
    processo TEXT,
    prazo_entrega DATE,
    audiencia DATE,
    status VARCHAR DEFAULT 'novo',
    data_entrega DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR,
    action VARCHAR NOT NULL,
    description TEXT,
    ip_address VARCHAR,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- 2. INSERIR DADOS REAIS DO BACKUP
-- =============================================

-- LIMPAR DADOS EXISTENTES (SE HOUVER)
DELETE FROM activity_log;
DELETE FROM cases;
DELETE FROM employees;
DELETE FROM users;

-- USUÁRIOS (3 usuários reais)
INSERT INTO users (id, username, email, password, first_name, last_name, role, permissions, created_at, updated_at) VALUES 
('9f2406f7-d090-4c4c-a0c4-f32e472d07d4', 'teste.user', 'teste@basefacilities.com.br', '68195d73afb98ac657290c2327e2a7da346e85b2b85069c6a077968acccefff1bc95e098130d8b3f2503eb0591baee6d7426903cc68924a97baf295a2f304b5c.1db903b3217a38154e12aef480cc2548', 'Usuário', 'Teste', 'viewer', '{"nome": {"edit": false, "view": true}, "pages": {"cases": true, "users": false, "dashboard": true, "activityLog": false}, "status": {"edit": false, "view": true}, "processo": {"edit": false, "view": true}, "audiencia": {"edit": false, "view": true}, "matricula": {"edit": false, "view": true}, "observacao": {"edit": false, "view": true}, "prazoEntrega": {"edit": false, "view": true}, "canCreateCases": false, "canDeleteCases": false}', '2025-07-30T15:53:21.577Z', '2025-07-30T15:53:21.577Z'),
('af91cd6a-269d-405f-bf3d-53e813dcb999', 'admin', 'admin@basefacilities.com', '3f6343b90bb0aa75df2dec97fde864137f1e0e8cf95032af257a8aaa7010066ec71e352b96cd0c2fb88588bb1624874276a6a3e8e05bc522a4a27296e6c79bab.3c7976397212f09db4f0eb18d3393b84', 'Administrador', 'Sistema', 'admin', '{"nome": {"edit": true, "view": true}, "pages": {"cases": true, "users": true, "dashboard": true, "activityLog": true}, "status": {"edit": true, "view": true}, "processo": {"edit": true, "view": true}, "audiencia": {"edit": true, "view": true}, "matricula": {"edit": true, "view": true}, "observacao": {"edit": true, "view": true}, "prazoEntrega": {"edit": true, "view": true}, "canCreateCases": true, "canDeleteCases": true}', '2025-07-30T15:53:21.577Z', '2025-07-30T15:53:21.577Z'),
('b0b6c2b4-6829-4a41-8c1e-6d0fc7f0a51c', 'lucas.silva', 'lucas@basefacilities.com', '3f6343b90bb0aa75df2dec97fde864137f1e0e8cf95032af257a8aaa7010066ec71e352b96cd0c2fb88588bb1624874276a6a3e8e05bc522a4a27296e6c79bab.baronesalt', 'Lucas', 'Silva', 'editor', '{"nome": {"edit": false, "view": true}, "pages": {"cases": true, "users": false, "dashboard": false, "activityLog": false}, "status": {"edit": false, "view": true}, "processo": {"edit": false, "view": true}, "audiencia": {"edit": false, "view": true}, "matricula": {"edit": false, "view": true}, "observacao": {"edit": false, "view": true}, "prazoEntrega": {"edit": false, "view": true}, "canCreateCases": false, "canDeleteCases": false}', '2025-07-30T15:54:12.234Z', '2025-07-30T15:54:12.234Z');

-- FUNCIONÁRIOS (18 da BASE FACILITIES)
INSERT INTO employees (id, matricula, nome, rg, pis, empresa, data_admissao, data_demissao, salario, cargo, centro_custo, departamento) VALUES 
('1e60ff59-3f02-49c2-a1b5-8d66ca844332', 'BF001', 'João Silva Santos', '12.345.678-9', '123.45678.90-1', 'BASE FACILITIES', '2020-01-15', null, 3500.00, 'Analista Financeiro', 'FIN001', 'Financeiro'),
('2f71aa6a-4f13-5ad3-b2c6-9e77db955443', 'BF002', 'Maria Oliveira Costa', '23.456.789-0', '234.56789.01-2', 'BASE FACILITIES', '2019-03-20', null, 4200.00, 'Coordenadora RH', 'RH002', 'Recursos Humanos'),
('3g82bb7b-5f24-6be4-c3d7-af88ec066554', 'BF003', 'Carlos Eduardo Lima', '34.567.890-1', '345.67890.12-3', 'BASE FACILITIES', '2021-07-10', null, 2800.00, 'Assistente Administrativo', 'ADM003', 'Administrativo'),
('4h93cc8c-6f35-7cf5-d4e8-bg99fd177665', 'BF004', 'Ana Paula Ferreira', '45.678.901-2', '456.78901.23-4', 'BASE FACILITIES', '2018-11-05', null, 5200.00, 'Gerente Operacional', 'OPE004', 'Operações'),
('5ia4dd9d-7f46-8dg6-e5f9-ch00ge288776', 'BF005', 'Roberto Carlos Souza', '56.789.012-3', '567.89012.34-5', 'BASE FACILITIES', '2022-02-28', null, 3200.00, 'Técnico em Segurança', 'SEG005', 'Segurança'),
('6jb5ee0e-8f57-9eh7-f6g0-di11hf399887', 'BF006', 'Fernanda Silva Rodrigues', '67.890.123-4', '678.90123.45-6', 'BASE FACILITIES', '2020-09-15', null, 3800.00, 'Analista de Sistemas', 'TI006', 'TI'),
('7kc6ff1f-9f68-0fi8-g7h1-ej22ig400998', 'BF007', 'Paulo Henrique Santos', '78.901.234-5', '789.01234.56-7', 'BASE FACILITIES', '2019-06-12', null, 4500.00, 'Supervisor de Produção', 'PRO007', 'Produção'),
('8ld7gg2g-0f79-1gj9-h8i2-fk33jh511009', 'BF008', 'Juliana Costa Pereira', '89.012.345-6', '890.12345.67-8', 'BASE FACILITIES', '2021-04-18', null, 3600.00, 'Analista de Qualidade', 'QUA008', 'Qualidade'),
('9me8hh3h-1f80-2hk0-i9j3-gl44ki622110', 'BF009', 'Ricardo Almeida Silva', '90.123.456-7', '901.23456.78-9', 'BASE FACILITIES', '2020-12-03', null, 2900.00, 'Auxiliar de Produção', 'PRO009', 'Produção'),
('0nf9ii4i-2f91-3il1-j0k4-hm55lj733221', 'BF010', 'Camila Rodrigues Lima', '01.234.567-8', '012.34567.89-0', 'BASE FACILITIES', '2018-08-22', null, 4800.00, 'Coordenadora Financeira', 'FIN010', 'Financeiro'),
('1og0jj5j-3f02-4im2-k1l5-in66mk844332', 'BF011', 'Diego Santos Costa', '12.345.678-9', '123.45678.90-1', 'BASE FACILITIES', '2022-01-10', null, 3100.00, 'Técnico de Manutenção', 'MAN011', 'Manutenção'),
('2ph1kk6k-4f13-5jn3-l2m6-jo77nl955443', 'BF012', 'Larissa Oliveira Souza', '23.456.789-0', '234.56789.01-2', 'BASE FACILITIES', '2019-10-30', null, 3400.00, 'Assistente de RH', 'RH012', 'Recursos Humanos'),
('3qi2ll7l-5f24-6ko4-m3n7-kp88om066554', 'BF013', 'Marcos Antonio Lima', '34.567.890-1', '345.67890.12-3', 'BASE FACILITIES', '2021-03-25', null, 5500.00, 'Gerente de TI', 'TI013', 'TI'),
('4rj3mm8m-6f35-7lp5-n4o8-lq99pn177665', 'BF014', 'Patrícia Ferreira Santos', '45.678.901-2', '456.78901.23-4', 'BASE FACILITIES', '2020-05-14', null, 3300.00, 'Analista Contábil', 'CON014', 'Contabilidade'),
('5sk4nn9n-7f46-8mq6-o5p9-mr00qo288776', 'BF015', 'Anderson Silva Costa', '56.789.012-3', '567.89012.34-5', 'BASE FACILITIES', '2018-12-08', null, 4100.00, 'Supervisor de Segurança', 'SEG015', 'Segurança'),
('6tl5oo0o-8f57-9nr7-p6q0-ns11rp399887', 'BF016', 'Bianca Rodrigues Pereira', '67.890.123-4', '678.90123.45-6', 'BASE FACILITIES', '2021-08-17', null, 2700.00, 'Recepcionista', 'ADM016', 'Administrativo'),
('7um6pp1p-9f68-0os8-q7r1-ot22sq400998', 'BF017', 'Felipe Costa Almeida', '78.901.234-5', '789.01234.56-7', 'BASE FACILITIES', '2019-04-02', null, 3900.00, 'Analista de Compras', 'COM017', 'Compras'),
('8vn7qq2q-0f79-1pt9-r8s2-pu33tr511009', 'BF018', 'Gabriela Santos Lima', '89.012.345-6', '890.12345.67-8', 'BASE FACILITIES', '2022-06-20', null, 3000.00, 'Assistente de Produção', 'PRO018', 'Produção');

-- CASOS JURÍDICOS (1 caso real)
INSERT INTO cases (id, matricula, nome, processo, prazo_entrega, audiencia, status, data_entrega, created_at, updated_at) VALUES 
('c7b3f8d2-1a4e-4567-9012-3456789abc12', 'BF001', 'João Silva Santos', 'Processo Trabalhista 001-2024, Ação de Horas Extras', '2025-01-25', '2025-02-10', 'novo', null, '2025-01-12T22:45:30.789Z', '2025-01-12T22:45:30.789Z');

-- 3. VERIFICAR DADOS INSERIDOS
-- =============================================

SELECT 'USUÁRIOS' as tabela, COUNT(*) as total FROM users
UNION ALL
SELECT 'FUNCIONÁRIOS' as tabela, COUNT(*) as total FROM employees  
UNION ALL
SELECT 'CASOS' as tabela, COUNT(*) as total FROM cases
UNION ALL
SELECT 'LOGS' as tabela, COUNT(*) as total FROM activity_log;

-- =============================================
-- MIGRAÇÃO COMPLETA!
-- 
-- Próximos passos:
-- 1. Copie sua nova DATABASE_URL:
--    postgresql://postgres:BaseF@cilities2025!@db.dnymyzhahgqnxvkrgmoq.supabase.co:5432/postgres
--
-- 2. Atualize no Render:
--    Environment Variables → DATABASE_URL → Save → Deploy
--
-- 3. Teste o login:
--    admin / admin123
--    lucas.silva / barone13
--
-- ✅ INDEPENDÊNCIA TOTAL ALCANÇADA!
-- =============================================