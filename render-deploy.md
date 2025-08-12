# INSTRUÇÕES PARA DEPLOY NO RENDER

## Configurações Exatas para o Render:

### Build Command:
```
npm install && node fix-production-build.cjs
```

### Start Command:
```
node render-start.cjs
```

### Environment Variables:
**DATABASE_URL:**
```
postgresql://postgres:BaseF%40cilities2025%21@db.dnymyzhahgqnxvkrgmoq.supabase.co:5432/postgres
```

**IMPORTANTE**: Use a versão com caracteres codificados:
- @ vira %40  
- ! vira %21

## Como fazer o deploy:

1. **No painel do Render**, vá até seu serviço
2. **Environment** → Edite DATABASE_URL com a versão codificada acima
3. **Settings** → Configure Build e Start commands acima
4. **Deploy** → Clique em "Manual Deploy"

## O que vai acontecer:
1. Render instala dependências (`npm install`)
2. Executa build otimizado (`fix-production-build.cjs`)
3. Inicia servidor (`render-start.cjs`)
4. Conecta ao banco Supabase com dados existentes

## Teste após deploy:
- Login: admin/admin123
- Dados do banco Supabase devem aparecer
- Sistema funcionando independentemente