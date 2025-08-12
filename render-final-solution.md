# SOLUÇÃO FINAL - RENDER + SUPABASE

## Problema identificado:
✅ Login funcionando no Render
❌ Conexão IPv6 falhando com Supabase

## Correção aplicada:
- **server/db.ts** - Forçar conexão IPv4 ao invés de usar connection string
- Parse manual da URL para evitar problemas de IPv6

## Para atualizar no Render:

1. **Enviar para Git:**
```bash
git add server/db.ts supabase-simple-setup.sql
git commit -m "Force IPv4 connection to Supabase"
git push
```

2. **Deploy no Render:**
- Build: `npm install && node fix-production-build.cjs`
- Start: `node render-start.cjs`
- DATABASE_URL: (manter a mesma)

3. **Executar SQL no Supabase:**
Execute o arquivo `supabase-simple-setup.sql` no SQL Editor

## Resultado esperado:
- ✅ Login: admin/admin123
- ✅ Dados carregando (João Silva Santos)
- ✅ Sistema completamente funcional
- ✅ Sem erros de conexão IPv6

## Logs que devem aparecer no Render:
```
🔗 Conectando ao banco: postgresql://postgres:****@...
🔧 Conectando: postgres@db.dnymyzhahgqnxvkrgmoq.supabase.co:5432/postgres
✅ Conectado ao PostgreSQL/Supabase
```