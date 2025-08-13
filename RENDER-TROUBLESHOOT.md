# 🔧 Solução para Erro de Banco no Render

## Problema Identificado
O Render está com erro na conexão do banco porque precisa de SSL habilitado para Supabase.

## ✅ Solução Aplicada

### 1. Corrigido SSL no server/db.ts
```typescript
ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
```

### 2. Verificar Environment Variables no Render
No painel do Render → **Environment**:
- `NODE_ENV` = `production`
- `DATABASE_URL` = `postgresql://postgres:BaseF@cilities2025!@db.fhalwugmppeswkvxnljn.supabase.co:5432/postgres`

### 3. Forçar Redeploy
1. No Render → **Manual Deploy**
2. Ou fazer um novo commit:
```bash
git add .
git commit -m "Fix: SSL connection for Supabase"
git push origin main
```

## ✅ Dados Confirmados no Supabase
- **Usuário admin**: ID dfe01ce1-4901-4121-9956-089446f88286
- **Login**: admin/admin123
- **Funcionários**: 3 ativos
- **Tabelas**: Todas criadas corretamente

## 🎯 Resultado Esperado
Após o redeploy, o sistema deve:
- ✅ Conectar no Supabase sem erros
- ✅ Permitir login com admin/admin123
- ✅ Mostrar funcionários e casos
- ✅ Permitir criar novos registros

**Se ainda der erro, verifique os logs do Render e confirme se a DATABASE_URL está correta.**