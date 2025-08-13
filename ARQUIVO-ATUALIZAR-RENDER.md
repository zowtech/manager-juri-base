# 🔧 Arquivo para Substituir no GitHub

## Problema Identificado
O arquivo `server/db.ts` precisa ser atualizado para conectar corretamente no Supabase.

## ✅ Arquivo Corrigido: `server/db.ts`

Substitua o conteúdo atual do arquivo `server/db.ts` por este:

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle(pool, { schema });
```

## 🚀 Como Fazer a Substituição

### Método 1: GitHub Web Interface
1. Vá no seu repositório GitHub
2. Navegue até `server/db.ts`
3. Clique no ícone de lápis (Edit)
4. Substitua todo o conteúdo pelo código acima
5. Commit → "Fix: SSL connection for Supabase"

### Método 2: Download/Upload
1. Baixe este projeto do Replit
2. Edite o arquivo `server/db.ts` localmente
3. Suba o arquivo atualizado no GitHub

### Método 3: Git Clone (se souber usar)
```bash
git clone seu-repositorio
# editar server/db.ts
git add .
git commit -m "Fix: SSL connection for Supabase"
git push origin main
```

## ⚠️ Importante
Após atualizar o arquivo no GitHub, o Render vai fazer deploy automático em alguns minutos.