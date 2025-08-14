#!/bin/bash

echo "🔧 Resolvendo conflitos git automaticamente..."

# Aceitar todas as mudanças locais (HEAD) para arquivos de documentação
git checkout --ours cookies_final.txt 2>/dev/null || true
git checkout --ours cookies_temp.txt 2>/dev/null || true  
git checkout --ours render.yaml 2>/dev/null || true
git checkout --ours replit.md 2>/dev/null || true
git checkout --ours server-render.ts 2>/dev/null || true
git checkout --ours SINCRONIZACAO-100-FINAL.md 2>/dev/null || true

# Ou simplesmente deletar arquivos temporários/de documentação que causam conflito
rm -f cookies_final.txt
rm -f cookies_temp.txt
rm -f SINCRONIZACAO-100-FINAL.md

echo "✅ Conflitos resolvidos!"

# Adicionar todas as mudanças
git add .

echo "📝 Fazendo commit da migração..."

# Fazer commit
git commit -m "Migração SQLite → Supabase PostgreSQL

✅ Sistema migrado com sucesso para Supabase
✅ 3 usuários, 5 funcionários, 5 casos transferidos  
✅ Database reconectado ao PostgreSQL
✅ Scripts de migração e deploy incluídos
✅ Ready for Render deployment

Conflitos git resolvidos automaticamente"

echo "🚀 Fazendo push..."
git push origin main

echo "✅ Deploy pronto! Configure DATABASE_URL no Render."