-- SCRIPT DE SINCRONIZAÇÃO FORÇADA PARA PRODUÇÃO RENDER
-- Execute este script diretamente no painel do Supabase

-- 1. Verificar estrutura atual das tabelas
DO $$ 
BEGIN
    RAISE NOTICE 'Iniciando sincronização de produção...';
END $$;

-- 2. Adicionar colunas que podem estar faltando na tabela cases
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS matricula VARCHAR,
ADD COLUMN IF NOT EXISTS audience_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 3. Verificar se usuário admin existe com as permissões corretas
UPDATE users SET 
    permissions = '{
        "nome": {"edit": true, "view": true},
        "pages": {"cases": true, "users": true, "dashboard": true, "activityLog": true},
        "status": {"edit": true, "view": true},
        "processo": {"edit": true, "view": true},
        "audiencia": {"edit": true, "view": true},
        "matricula": {"edit": true, "view": true},
        "observacao": {"edit": true, "view": true},
        "prazoEntrega": {"edit": true, "view": true},
        "canCreateCases": true,
        "canDeleteCases": true
    }'::jsonb,
    role = 'admin',
    updated_at = NOW()
WHERE username = 'admin';

-- 4. Inserir admin se não existir
INSERT INTO users (id, username, password, role, permissions, created_at, updated_at)
SELECT 
    'af91cd6a-269d-405f-bf3d-53e813dcb999',
    'admin',
    '$scrypt$N=16384,r=8,p=1$7fe058e7a9fce9cc4608a1e4140dd5ca$46c02fbd4bf93ddcbe88c67f425e357b126a505d5caa598cbf0cdde48b5cd6e4.7fe058e7a9fce9cc4608a1e4140dd5ca',
    'admin',
    '{
        "nome": {"edit": true, "view": true},
        "pages": {"cases": true, "users": true, "dashboard": true, "activityLog": true},
        "status": {"edit": true, "view": true},
        "processo": {"edit": true, "view": true},
        "audiencia": {"edit": true, "view": true},
        "matricula": {"edit": true, "view": true},
        "observacao": {"edit": true, "view": true},
        "prazoEntrega": {"edit": true, "view": true},
        "canCreateCases": true,
        "canDeleteCases": true
    }'::jsonb,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 5. Verificar resultado final
SELECT 
    'VERIFICAÇÃO FINAL' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE username = 'admin') as admin_exists,
    (SELECT COUNT(*) FROM employees) as total_employees,
    (SELECT COUNT(*) FROM cases) as total_cases;

-- 6. Mostrar estrutura da tabela cases para confirmação
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;