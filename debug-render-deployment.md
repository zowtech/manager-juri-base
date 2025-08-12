# Debug do Problema no Render - Dados em Branco

## Possíveis Causas:

### 1. **Problema de Migração de Schema**
O schema foi alterado mas o banco no Render não foi atualizado.

**Solução:**
- Execute `render-migration-check.sql` no Supabase para verificar
- Se necessário, execute `fix-render-data.sql`

### 2. **Problema de Conexão com Banco**
A variável DATABASE_URL pode estar incorreta.

**Verificar:**
```
postgresql://postgres:BaseF@cilities2025!@db.dnymyzhahgqnxvkrgmoq.supabase.co:5432/postgres
```

### 3. **Cache do Render**
O Render pode estar usando uma versão antiga.

**Solução:**
- Clear cache no deploy
- Redeploy manual

### 4. **Erro de Build**
Os novos scripts podem ter problemas.

**Verificar logs do Render para:**
- Erros de build
- Erros de conexão com DB
- Erros de inicialização

## Como Diagnosticar:

1. **Acesse os logs do Render**
2. **Execute os SQLs no Supabase**
3. **Verifique a variável DATABASE_URL**
4. **Force um rebuild completo**

## Script de Emergência - Recriar Admin:

```sql
-- Execute no Supabase se o admin não existir
INSERT INTO users (id, username, password, role, permissions) 
VALUES (
  gen_random_uuid()::text,
  'admin',
  -- Você precisa gerar o hash da senha 'admin123' 
  '$scrypt$N=16384,r=8,p=1$...',
  'admin',
  '{"pages":{"cases":true,"users":true,"dashboard":true},"canCreateCases":true}'::jsonb
);
```