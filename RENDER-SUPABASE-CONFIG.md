# 🚀 CONFIGURAÇÃO RENDER + SUPABASE - PASSO A PASSO

## ⚡ AÇÃO IMEDIATA NECESSÁRIA

### 1️⃣ CONFIGURAR VARIÁVEL NO RENDER (AGORA)

1. **Acesse**: https://dashboard.render.com
2. **Encontre**: seu serviço `manager-juri-base`
3. **Vá em**: Environment → Environment Variables
4. **Adicione/Edite**:
   ```
   Key: DATABASE_URL
   Value: postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```

### 2️⃣ DEPLOY MANUAL

1. **Clique**: "Manual Deploy" ou "Deploy Latest Commit"
2. **Aguarde**: build completar (2-3 minutos)
3. **Monitore**: logs para confirmar "Database connected successfully"

## 🎯 RESULTADO ESPERADO

Após o deploy, quando acessar sua aplicação no Render:

### Login funcionando:
- **Usuário**: admin
- **Senha**: admin123

### Página de usuários mostrará 4 usuários:
1. **admin** - admin@example.com (admin)
2. **lucas.silva** - lucas.silva@example.com (viewer)
3. **nicole.silva** - nicole.silva@example.com (viewer)  
4. **teste-replit** - teste@replit.com (viewer)

## ✅ CONFIRMAÇÃO DE SUCESSO

### No Supabase Dashboard:
- Vá em: https://supabase.com/dashboard/projects
- Table Editor → users
- Deve mostrar os mesmos 4 usuários

### Teste de criação:
1. Crie um novo usuário no Render
2. Vá no Supabase Dashboard
3. O novo usuário deve aparecer imediatamente

## 📱 QUANDO TERMINAR

Me avise que vou:
1. Testar a sincronização
2. Criar um usuário teste para confirmar
3. Verificar se tudo está funcionando entre Render ↔ Supabase