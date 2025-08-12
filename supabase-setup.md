# Configuração Supabase - Passo a Passo

## 1. Criar Conta Supabase

1. Vá para: https://supabase.com
2. Clique em "Sign up" 
3. Use seu email/GitHub
4. Confirme email se necessário

## 2. Criar Projeto

1. Clique em "New project"
2. Nome: `legal-case-management`
3. Database Password: `BaseF@cilities2025!` (anote esta senha)
4. Região: `East US (Virginia)`
5. Clique "Create new project"

## 3. Aguardar Criação (2-3 minutos)

O Supabase vai criar seu banco PostgreSQL automaticamente.

## 4. Copiar Database URL

1. No painel do projeto, vá em "Settings" (menu lateral)
2. Clique em "Database"
3. Role para baixo até "Connection string"
4. Copie a URL que está assim:
   `postgresql://postgres.XXXXXX:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

5. **IMPORTANTE**: Substitua `[YOUR-PASSWORD]` pela senha que você criou
   Exemplo final:
   `postgresql://postgres.XXXXXX:BaseF@cilities2025!@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

## 5. Configurar Schema

No terminal do Replit, execute:
```bash
DATABASE_URL="sua-url-copiada" npm run db:push
```

## 6. Importar Dados

```bash
node migration-import.js "sua-url-copiada"
```

## 7. Atualizar Render

1. Painel do Render → Seu serviço → Settings → Environment Variables
2. Edite `DATABASE_URL` 
3. Cole a nova URL do Supabase
4. Save Changes → Manual Deploy

## Pronto! Sistema 100% Independente

✅ Banco próprio no Supabase
✅ Dados migrados
✅ Render usando novo banco
✅ Total independência

**Dashboard Supabase**: Você pode ver/editar dados diretamente no painel web do Supabase!