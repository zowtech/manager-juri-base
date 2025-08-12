# DEPLOY RENDER + SUPABASE - PASSO A PASSO

## PASSO 1: Configurar Banco Supabase

1. **Acesse:** https://supabase.com/dashboard
2. **Vá no seu projeto** legal-case-management  
3. **SQL Editor** → Cole e execute o script `supabase-render-setup.sql`
4. **Settings** → Database → Connection String
5. **Copie a URI** (não o Connection pooling)

## PASSO 2: Configurar Render

### Environment Variables:
```
DATABASE_URL=postgresql://postgres.kxqyldwhcfzhbnpfdcjl:[SUA_SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**IMPORTANTE:** Substitua `[SUA_SENHA]` pela senha real do projeto

### Build Command:
```
npm install && node fix-production-build.cjs
```

### Start Command:  
```
node render-start.cjs
```

## PASSO 3: Deploy

1. **Salve as configurações** no Render
2. **Manual Deploy**
3. **Aguarde 2-3 minutos**

## PASSO 4: Teste

- **URL:** https://seu-app.onrender.com
- **Login:** admin / admin123
- **Dados:** João Silva Santos deve aparecer

## Solução de Problemas

### Se der erro de conexão:
1. Verifique a DATABASE_URL no Render
2. Confirme que executou o SQL no Supabase
3. Teste a conexão no Supabase SQL Editor

### Comandos de verificação no Supabase:
```sql
SELECT * FROM users;
SELECT * FROM cases;  
SELECT * FROM employees;
```

## Resultado Esperado:
- ✅ Login funcionando
- ✅ Dados carregando
- ✅ Dashboard operacional
- ✅ Sistema independente