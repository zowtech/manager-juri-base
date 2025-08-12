# INSTRUÇÕES PARA SUPABASE - PASSO A PASSO

## PROBLEMA
A string de conexão está com erro. Isso pode ser porque:
1. O projeto ainda está sendo provisionado (aguarde 2-3 minutos)
2. A senha tem caracteres especiais que precisam ser codificados
3. A URL precisa ser copiada de um local diferente

## SOLUÇÃO MANUAL (MAIS SEGURA)

### 1. Execute o SQL no Painel Web
1. Vá para: **https://supabase.com/dashboard/projects**
2. Clique no seu projeto `legal-case-management`
3. No menu lateral, clique em **"SQL Editor"**
4. Clique em **"New Query"**
5. Cole TODO o conteúdo do arquivo `supabase-manual-setup.sql`
6. Clique **"Run"**

### 2. Copie a URL Correta
1. No painel do Supabase, vá em **Settings** → **Database**
2. Na seção **"Connection parameters"**, copie:
   - Host: `aws-0-us-east-1.pooler.supabase.com`
   - Database: `postgres`
   - Port: `6543`
   - User: `postgres.kxqyldwhcfzhbnpfdcjl`
   - Password: `BaseF@cilities2025!`

3. Monte a URL assim:
   ```
   postgresql://postgres.kxqyldwhcfzhbnpfdcjl:BaseF%40cilities2025%21@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
   
   **ATENÇÃO**: O `@` vira `%40` e o `!` vira `%21`

### 3. Teste no Replit
Teste se a nova URL funciona:
```bash
DATABASE_URL="postgresql://postgres.kxqyldwhcfzhbnpfdcjl:BaseF%40cilities2025%21@aws-0-us-east-1.pooler.supabase.com:6543/postgres" npm run db:push
```

### 4. Atualize o Render
1. Painel do Render → Environment Variables
2. Edite `DATABASE_URL`
3. Cole a nova URL (com %40 e %21)
4. Save → Manual Deploy

## RESULTADOS ESPERADOS

Após executar o SQL, você deve ver:
- 3 usuários (admin, lucas.silva, roberto.santos)
- 18 funcionários da BASE FACILITIES
- 1 caso jurídico
- Estrutura completa das tabelas

## CREDENCIAIS DE TESTE
- **Admin**: admin / admin123
- **Editor**: lucas.silva / barone13

## ✅ INDEPENDÊNCIA TOTAL ALCANÇADA!
Depois dessa migração:
- Banco 100% seu no Supabase
- Dashboard visual para gerenciar dados
- Backups automáticos
- Sem dependência de terceiros
- Controle total dos dados