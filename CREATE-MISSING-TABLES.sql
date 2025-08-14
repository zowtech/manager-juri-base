-- ✅ SCRIPT PARA CRIAR TABELAS FALTANTES NO SUPABASE
-- Baseado no schema.ts local que está funcionando 100%

-- 1. Verificar e criar tabela activity_log (logs de atividade)
CREATE TABLE IF NOT EXISTS activity_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  action VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  resource_id VARCHAR NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Verificar e criar índices para activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON activity_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- 3. Verificar se tabela employees tem todas as 11 colunas do Excel
DO $$
BEGIN
  -- Adicionar colunas que possam estar faltando
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS empresa VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS rg VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS pis VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS data_admissao DATE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS data_demissao DATE;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS salario VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS cargo VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS centro_custo VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS departamento VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END$$;

-- 4. Verificar se tabela cases tem todas as colunas necessárias
DO $$
BEGIN
  BEGIN
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS matricula VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS data_audiencia TIMESTAMP;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS data_entrega TIMESTAMP;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS tipo_processo VARCHAR;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE cases ADD COLUMN IF NOT EXISTS observacoes TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END$$;

-- 5. Criar tabela dashboard_layouts se não existir
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  layout_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Verificar se existem dados de teste
SELECT 
  'TABELAS VALIDADAS:' as status,
  (SELECT COUNT(*) FROM users) as usuarios,
  (SELECT COUNT(*) FROM employees) as funcionarios,
  (SELECT COUNT(*) FROM cases) as casos,
  (SELECT COUNT(*) FROM activity_log) as logs;