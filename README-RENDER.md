# Deploy no Render

## Configuração do Build

**Build Command:**
```bash
npm install --include=dev && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
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

### Erro 500 "Failed to create employee"
- Verifique os logs do servidor para detalhes: `[EMPLOYEES/CREATE] DB error:`
- Confirme que a tabela `employees` existe no Supabase
- Use `RUN_MIGRATIONS_ON_BOOT=true` na primeira subida para criar tabelas

### Build falha
- Verifique se todas as dependências estão em `dependencies` (não só `devDependencies`)
- O comando de build deve executar sem erros

## Endpoints de Diagnóstico

- `GET /health` → retorna `ok` se o servidor estiver funcionando
- `GET /health/db` → retorna `{"ok": true, "now": "timestamp"}` se o banco estiver conectado

## Migração Automática (Opcional)

Para criar as tabelas automaticamente na primeira subida:

1. Configure no Render: `RUN_MIGRATIONS_ON_BOOT=true`
2. Faça o primeiro deploy
3. Remova a variável após sucesso