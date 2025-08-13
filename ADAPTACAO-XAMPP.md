# 🔧 Adaptação para XAMPP + MySQL

## Mudanças Necessárias

### 1. Configuração do Banco MySQL
Vou adaptar o schema do PostgreSQL para MySQL:

```sql
-- Executar no phpMyAdmin ou MySQL Workbench
CREATE DATABASE legal_management;
USE legal_management;

-- Tabela de usuários
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role ENUM('admin', 'editor') DEFAULT 'editor',
  can_access_dashboard BOOLEAN DEFAULT TRUE,
  can_access_cases BOOLEAN DEFAULT TRUE,
  can_access_employees BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de funcionários
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
  status ENUM('ativo', 'inativo', 'deletado') DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de casos
CREATE TABLE cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricula VARCHAR(50),
  nome VARCHAR(255),
  processo TEXT,
  prazo_entrega DATE,
  audiencia DATE,
  status ENUM('novo', 'pendente', 'concluido', 'atrasado') DEFAULT 'novo',
  data_entrega DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de logs de atividade
CREATE TABLE activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255),
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Inserir usuário admin
INSERT INTO users (email, password, name, role) 
VALUES ('admin', '$2b$10$hash_aqui', 'Administrador', 'admin');
```

### 2. Configuração do Ambiente
```env
# .env.local
DATABASE_URL=mysql://root:@localhost:3306/legal_management
NODE_ENV=development
PORT=3000
```

### 3. Instalar Dependências MySQL
```bash
npm install mysql2 drizzle-orm
```

### 4. Configurar Drizzle para MySQL
Criados os arquivos:
- `shared/schema-mysql.ts` - Schema adaptado para MySQL
- `server/storage-mysql.ts` - Storage com MySQL
- `drizzle-mysql.config.ts` - Config do Drizzle

### 5. Gerar Tabelas
```bash
# Gerar migrations
npx drizzle-kit generate:mysql --config=drizzle-mysql.config.ts

# Aplicar no banco
npx drizzle-kit push:mysql --config=drizzle-mysql.config.ts
```

### 6. Trocar Imports
No `server/storage.ts`, trocar:
```typescript
// Trocar
import { storage } from './storage';
// Por
import { storage } from './storage-mysql';
```