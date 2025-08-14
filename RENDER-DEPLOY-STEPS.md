# 🚀 DEPLOY NO RENDER - PASSO A PASSO

## 📋 PREPARAÇÃO (FEITO ✅):
- ✅ Sistema migrado para Supabase PostgreSQL
- ✅ Dados transferidos (3 usuários, 5 funcionários, 5 casos)
- ✅ Arquivos de deploy criados
- ✅ Build commands configurados

## 🎯 PASSOS PARA DEPLOY NO RENDER:

### **1. CONFIGURAR BANCO NO RENDER:**
```
1. Acesse render.com
2. Vá em "New" > "PostgreSQL"
3. Nome: legal-system-db
4. Copie a DATABASE_URL gerada
```

### **2. CONFIGURAR WEB SERVICE:**
```
1. "New" > "Web Service"
2. Conecte seu repositório GitHub
3. Configure:
   - Build Command: npm install && npm run build
   - Start Command: npm start
   - Environment: NODE_ENV=production
   - Environment: DATABASE_URL=[cole a URL do passo 1]
```

### **3. MIGRAR DADOS PARA RENDER:**
Opção A - **Usar Supabase atual:**
```
1. Mantenha DATABASE_URL do Supabase no Render
2. Sistema funcionará com mesmo banco
3. Deploy imediato sem migração
```

Opção B - **Banco novo no Render:**
```
1. Use DATABASE_URL do PostgreSQL do Render
2. Execute script de migração
3. Rode: node migrate-to-supabase.js
```

## 🔧 VARIÁVEIS DE AMBIENTE RENDER:
```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
```

## 🎮 COMANDOS DE BUILD:
```bash
# Build Command:
npm install && npm run build

# Start Command:
npm start
```

## ✅ VERIFICAÇÃO PÓS-DEPLOY:
1. **Health Check**: `https://seu-app.onrender.com/health/db`
2. **Login**: `https://seu-app.onrender.com/` → admin/admin123
3. **API Test**: `https://seu-app.onrender.com/api/users`

## 🚨 SOLUÇÃO DE PROBLEMAS:

### **Build Error:**
```bash
# Se der erro de build, use:
npm install --include=dev && npm run build
```

### **Database Error:**
```bash
# Verifique DATABASE_URL:
curl https://seu-app.onrender.com/debug/where
```

### **Migration Error:**
```bash
# Re-executar migração:
node migrate-to-supabase.js
```

---

**RESULTADO ESPERADO**: Sistema jurídico funcionando 100% no Render com Supabase/PostgreSQL!