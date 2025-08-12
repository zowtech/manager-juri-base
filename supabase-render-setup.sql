-- SCRIPT COMPLETO PARA SUPABASE
-- Execute no SQL Editor do Supabase

-- 1. Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'editor',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar tabela de casos
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(50),
    nome VARCHAR(255),
    processo TEXT,
    prazo_entrega DATE,
    audiencia DATE,
    status VARCHAR(50) DEFAULT 'novo',
    data_entrega DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Criar tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(255),
    nome VARCHAR(255),
    matricula VARCHAR(50),
    rg VARCHAR(20),
    pis VARCHAR(20),
    data_admissao DATE,
    data_demissao DATE,
    salario DECIMAL(10,2),
    cargo VARCHAR(100),
    centro_custo VARCHAR(100),
    departamento VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Criar tabela de log de atividades
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Criar tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- 6. Criar tabela de layouts do dashboard
CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    layout_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Inserir usuário admin
INSERT INTO users (username, password_hash, role, permissions) 
VALUES ('admin', '8b8c9cfa09fca0b1c1b4a4e8a8e8d5f6a7b2c3d4e5f6.1234567890abcdef', 'admin', '{"dashboard": true, "cases": true, "employees": true, "users": true}')
ON CONFLICT (username) DO NOTHING;

-- 8. Inserir dados de exemplo
INSERT INTO cases (matricula, nome, processo, prazo_entrega, audiencia, status) VALUES
('BF001', 'João Silva Santos', 'Processo Trabalhista 001-2024, Ação de Divórcio 002-2024', '2025-01-25', '2025-02-15', 'novo')
ON CONFLICT DO NOTHING;

INSERT INTO employees (empresa, nome, matricula, rg, pis, data_admissao, salario, cargo, centro_custo, departamento) VALUES
('BASE FACILITIES', 'João Silva Santos', 'BF001', '12345678-9', '12345678901', '2024-01-15', 3500.00, 'Analista', 'ADM', 'Administrativo')
ON CONFLICT DO NOTHING;

-- 9. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_cases_matricula ON cases(matricula);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_employees_matricula ON employees(matricula);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

COMMIT;