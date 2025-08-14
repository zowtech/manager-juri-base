# Deploy no Render

## Configuração do Build

**Build Command:**
```bash
npm run render-build
```

**Start Command:**
```bash
npm start
```

## Variáveis de Ambiente

Configure no Dashboard do Render:

1. **NODE_ENV**: `production`
2. **DATABASE_URL**: Connection string do Supabase Transaction Pooler

### DATABASE_URL Supabase

Use a URL do **Transaction Pooler** (porta 6543) do Supabase:

```
postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Onde encontrar:**
1. Acesse o projeto no Supabase
2. Vá em Settings → Database
3. Connection pooling → Transaction
4. Copie a URI e substitua `[YOUR-PASSWORD]`

## Health Check

O sistema inclui endpoint `/health` que retorna `ok` quando funcionando.

O Render usa este endpoint para verificar se a aplicação está saudável.

## Arquitetura

- **Frontend**: React + Vite (buildado para `dist/public`)
- **Backend**: Node.js ESM (bundled para `dist/index.js`)
- **Database**: PostgreSQL via Supabase
- **Sessões**: Armazenadas no banco PostgreSQL

## Troubleshooting

### Erro "DATABASE_URL is not set"
- Verifique se a variável está configurada no Render Dashboard
- Teste a connection string localmente primeiro

### Erro "EADDRINUSE" 
- Certificado que há apenas um `server.listen()` no código
- O `start-production.js` não deve fazer listen

### Build falha
- Verifique se todas as dependências estão em `dependencies` (não só `devDependencies`)
- O comando `npm run render-build` deve executar sem erros