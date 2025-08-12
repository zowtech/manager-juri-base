-- Script para verificar e corrigir dados no Render/Supabase

-- 1. Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'employees', 'cases');

-- 2. Verificar estrutura da tabela users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 3. Verificar se existem usuários
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
FROM users;

-- 4. Verificar se existe o usuário admin
SELECT username, role, 
       CASE 
         WHEN permissions IS NULL THEN 'NULL'
         ELSE permissions::text
       END as permissions_text
FROM users 
WHERE username = 'admin';

-- 5. Verificar funcionários
SELECT COUNT(*) as total_employees FROM employees;

-- 6. Verificar casos
SELECT COUNT(*) as total_cases FROM cases;