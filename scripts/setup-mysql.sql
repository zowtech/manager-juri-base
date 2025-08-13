-- Script completo para configurar o banco MySQL no XAMPP
-- Execute este script no phpMyAdmin ou MySQL Workbench

-- 1. Criar banco de dados
CREATE DATABASE IF NOT EXISTS legal_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE legal_management;

-- 2. Tabela de usuários
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url VARCHAR(500),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  permissions JSON DEFAULT ('{"matricula": {"view": true, "edit": false}, "nome": {"view": true, "edit": false}, "processo": {"view": true, "edit": false}, "prazoEntrega": {"view": true, "edit": false}, "audiencia": {"view": true, "edit": false}, "status": {"view": true, "edit": false}, "observacao": {"view": true, "edit": false}, "canCreateCases": false, "canDeleteCases": false, "pages": {"dashboard": true, "cases": true, "activityLog": false, "users": false}}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Tabela de funcionários
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa VARCHAR(10),
  nome VARCHAR(255),
  matricula VARCHAR(50),
  rg VARCHAR(20),
  pis VARCHAR(20),
  data_admissao DATE,
  data_demissao DATE,
  salario DECIMAL(10,2),
  cargo VARCHAR(255),
  centro_custo VARCHAR(255),
  departamento VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Tabela de casos jurídicos
CREATE TABLE cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  employee_id INT,
  process_number VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'novo',
  start_date TIMESTAMP,
  due_date TIMESTAMP,
  data_audiencia TIMESTAMP,
  completed_date TIMESTAMP,
  data_entrega TIMESTAMP,
  matricula VARCHAR(50),
  tipo_processo VARCHAR(255),
  documentos_solicitados JSON,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Tabela de logs de atividade
CREATE TABLE activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255),
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Tabela de layouts do dashboard
CREATE TABLE dashboard_layouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  layout JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Inserir usuário administrador
INSERT INTO users (email, username, password, first_name, last_name, role) 
VALUES (
  'admin@legal.com', 
  'admin', 
  '$2b$10$K7L/8Y1yFZ8R8JZT5mHxCOeB2p7oQ3f6jHkDsL2YfU4X7nN8zWvOm', -- senha: admin123
  'Administrador', 
  'Sistema', 
  'admin'
);

-- 8. Inserir funcionários de exemplo
INSERT INTO employees (empresa, nome, matricula, rg, pis, data_admissao, salario, cargo, centro_custo, departamento, status) VALUES
('33', 'João Silva Santos', '12345', '123456789', '12345678901', '2023-01-15', 5500.00, 'Analista Jurídico', 'Jurídico', 'Departamento Legal', 'ativo'),
('55', 'Maria Oliveira Costa', '67890', '987654321', '98765432109', '2023-03-20', 4800.00, 'Assistente Legal', 'Jurídico', 'Departamento Legal', 'ativo');

-- 9. Inserir casos de exemplo
INSERT INTO cases (client_name, matricula, process_number, description, status, due_date, data_audiencia, tipo_processo) VALUES
('João Silva Santos', '12345', 'TRT-2023-001', 'Reclamação trabalhista - horas extras', 'pendente', '2024-01-30', '2024-01-25', 'trabalhista'),
('Maria Oliveira Costa', '67890', 'TRT-2023-002', 'Processo de rescisão indireta', 'novo', '2024-02-15', '2024-02-10', 'rescisao_indireta');

-- 10. Verificar dados inseridos
SELECT 'Usuários cadastrados:' as info;
SELECT id, username, email, role FROM users;

SELECT 'Funcionários cadastrados:' as info;
SELECT id, nome, matricula, empresa, cargo FROM employees WHERE status = 'ativo';

SELECT 'Casos cadastrados:' as info;
SELECT id, client_name, matricula, status, due_date FROM cases;

SELECT '✅ Banco configurado com sucesso!' as status;