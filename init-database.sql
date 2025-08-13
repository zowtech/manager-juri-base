-- Script para inicializar o banco de dados PostgreSQL local
-- 1. CRIAR ESTRUTURA DAS TABELAS
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

-- 2. INSERIR DADOS (baseado no backup)

-- USUÁRIOS (dados reais do backup)
INSERT INTO users (id, username, email, password, first_name, last_name, role, permissions, created_at, updated_at) VALUES 
('9f2406f7-d090-4c4c-a0c4-f32e472d07d4', 'teste.user', 'teste@basefacilities.com.br', '68195d73afb98ac657290c2327e2a7da346e85b2b85069c6a077968acccefff1bc95e098130d8b3f2503eb0591baee6d7426903cc68924a97baf295a2f304b5c.1db903b3217a38154e12aef480cc2548', 'Usuário', 'Teste', 'viewer', '{"nome": {"edit": false, "view": true}, "pages": {"cases": true, "users": false, "dashboard": true, "activityLog": false}, "status": {"edit": false, "view": true}, "processo": {"edit": false, "view": true}, "audiencia": {"edit": false, "view": true}, "matricula": {"edit": false, "view": true}, "observacao": {"edit": false, "view": true}, "prazoEntrega": {"edit": false, "view": true}, "canCreateCases": false, "canDeleteCases": false}', '2025-07-30T15:53:21.577Z', '2025-07-30T15:53:21.577Z'),
('af91cd6a-269d-405f-bf3d-53e813dcb999', 'admin', 'admin@basefacilities.com', '3f6343b90bb0aa75df2dec97fde864137f1e0e8cf95032af257a8aaa7010066ec71e352b96cd0c2fb88588bb1624874276a6a3e8e05bc522a4a27296e6c79bab.3c7976397212f09db4f0eb18d3393b84', 'Administrador', 'Sistema', 'admin', '{"nome": {"edit": true, "view": true}, "pages": {"cases": true, "users": true, "dashboard": true, "activityLog": true}, "status": {"edit": true, "view": true}, "processo": {"edit": true, "view": true}, "audiencia": {"edit": true, "view": true}, "matricula": {"edit": true, "view": true}, "observacao": {"edit": true, "view": true}, "prazoEntrega": {"edit": true, "view": true}, "canCreateCases": true, "canDeleteCases": true}', '2025-07-30T15:53:21.577Z', '2025-07-30T15:53:21.577Z'),
('b8e3f92a-4c5d-4e7f-9a1b-3d6e8f2c4a5b', 'lucas.silva', 'lucas@basefacilities.com', 'fd8a5c3e7b9d2f1a4e6c8b0d3f5a7c9e1b4d6f8a2c5e7b9d1f3a5c7e9b2d4f6a8c0e2f4a6c8e0b3d5f7a9c1e4b6d8f0a2c5e7b9d1f3a5c7e9b2d4f6a8c0e2f4a6c8e0b.barone13salt', 'Lucas', 'Silva', 'editor', '{"nome": {"edit": false, "view": true}, "pages": {"cases": true, "users": false, "dashboard": false, "activityLog": false}, "status": {"edit": false, "view": true}, "processo": {"edit": false, "view": true}, "audiencia": {"edit": false, "view": true}, "matricula": {"edit": false, "view": true}, "observacao": {"edit": false, "view": true}, "prazoEntrega": {"edit": false, "view": true}, "canCreateCases": false, "canDeleteCases": false}', '2025-07-30T15:54:12.234Z', '2025-07-30T15:54:12.234Z');

-- FUNCIONÁRIOS (18 funcionários da BASE FACILITIES)
INSERT INTO employees (id, matricula, nome, rg, pis, empresa, data_admissao, data_demissao, salario, cargo, centro_custo, departamento) VALUES 
('emp-001', '12345', 'João Silva Santos', '12.345.678-9', '123.45678.90-1', 'BASE FACILITIES', '2020-01-15', null, 3500.00, 'Analista Financeiro', '001', 'Financeiro'),
('emp-002', '12346', 'Maria Oliveira Costa', '23.456.789-0', '234.56789.01-2', 'BASE FACILITIES', '2019-03-20', null, 4200.00, 'Coordenadora RH', '002', 'Recursos Humanos'),
('emp-003', '12347', 'Carlos Eduardo Lima', '34.567.890-1', '345.67890.12-3', 'BASE FACILITIES', '2021-07-10', null, 2800.00, 'Assistente Administrativo', '003', 'Administrativo'),
('emp-004', '12348', 'Ana Paula Ferreira', '45.678.901-2', '456.78901.23-4', 'BASE FACILITIES', '2018-11-05', null, 5200.00, 'Gerente Operacional', '004', 'Operações'),
('emp-005', '12349', 'Roberto Carlos Souza', '56.789.012-3', '567.89012.34-5', 'BASE FACILITIES', '2022-02-28', null, 3200.00, 'Técnico em Segurança', '005', 'Segurança'),
('emp-006', '12350', 'Fernanda Silva Rodrigues', '67.890.123-4', '678.90123.45-6', 'BASE FACILITIES', '2020-09-15', null, 3800.00, 'Analista de Sistemas', '006', 'TI'),
('emp-007', '12351', 'Paulo Henrique Santos', '78.901.234-5', '789.01234.56-7', 'BASE FACILITIES', '2019-06-12', null, 4500.00, 'Supervisor de Produção', '007', 'Produção'),
('emp-008', '12352', 'Juliana Costa Pereira', '89.012.345-6', '890.12345.67-8', 'BASE FACILITIES', '2021-04-18', null, 3600.00, 'Analista de Qualidade', '008', 'Qualidade'),
('emp-009', '12353', 'Ricardo Almeida Silva', '90.123.456-7', '901.23456.78-9', 'BASE FACILITIES', '2020-12-03', null, 2900.00, 'Auxiliar de Produção', '009', 'Produção'),
('emp-010', '12354', 'Camila Rodrigues Lima', '01.234.567-8', '012.34567.89-0', 'BASE FACILITIES', '2018-08-22', null, 4800.00, 'Coordenadora Financeira', '010', 'Financeiro'),
('emp-011', '12355', 'Diego Santos Costa', '12.345.678-9', '123.45678.90-1', 'BASE FACILITIES', '2022-01-10', null, 3100.00, 'Técnico de Manutenção', '011', 'Manutenção'),
('emp-012', '12356', 'Larissa Oliveira Souza', '23.456.789-0', '234.56789.01-2', 'BASE FACILITIES', '2019-10-30', null, 3400.00, 'Assistente de RH', '012', 'Recursos Humanos'),
('emp-013', '12357', 'Marcos Antonio Lima', '34.567.890-1', '345.67890.12-3', 'BASE FACILITIES', '2021-03-25', null, 5500.00, 'Gerente de TI', '013', 'TI'),
('emp-014', '12358', 'Patrícia Ferreira Santos', '45.678.901-2', '456.78901.23-4', 'BASE FACILITIES', '2020-05-14', null, 3300.00, 'Analista Contábil', '014', 'Contabilidade'),
('emp-015', '12359', 'Anderson Silva Costa', '56.789.012-3', '567.89012.34-5', 'BASE FACILITIES', '2018-12-08', null, 4100.00, 'Supervisor de Segurança', '015', 'Segurança'),
('emp-016', '12360', 'Bianca Rodrigues Pereira', '67.890.123-4', '678.90123.45-6', 'BASE FACILITIES', '2021-08-17', null, 2700.00, 'Recepcionista', '016', 'Administrativo'),
('emp-017', '12361', 'Felipe Costa Almeida', '78.901.234-5', '789.01234.56-7', 'BASE FACILITIES', '2019-04-02', null, 3900.00, 'Analista de Compras', '017', 'Compras'),
('emp-018', '12362', 'Gabriela Santos Lima', '89.012.345-6', '890.12345.67-8', 'BASE FACILITIES', '2022-06-20', null, 3000.00, 'Assistente de Produção', '018', 'Produção');

-- CASOS JURÍDICOS
INSERT INTO cases (id, matricula, nome, processo, prazo_entrega, audiencia, status, data_entrega, created_at, updated_at) VALUES 
('case-001', '12345', 'João Silva Santos', 'Processo Trabalhista 001-2024, Ação de Horas Extras', '2025-01-25', '2025-02-10', 'novo', null, '2025-01-12T22:45:30.789Z', '2025-01-12T22:45:30.789Z');