# 🚀 DEPLOY RENDER - INSTRUÇÕES COMPLETAS

## ✅ SUPABASE DATABASE - 100% PRONTO

### **Tabelas Criadas e Populadas:**
- ✅ **users** → 3 usuários (admin, lucas.silva, joyce)
- ✅ **cases** → 8 casos jurídicos com status/alertas
- ✅ **employees** → 5 funcionários BASE FACILITIES  
- ✅ **activity_log** → Logs de auditoria funcionais
- ✅ **sessions** → Autenticação por sessão

### **APIs Testadas - Funcionando:**
```bash
✅ POST /api/login → Autenticação
✅ GET /api/users → 3 usuários
✅ GET /api/cases → 8 casos
✅ GET /api/employees → 5 funcionários
✅ GET /api/activity-logs → Logs de atividade
```

## 🔧 CONFIGURAÇÃO RENDER

### **1. Build Settings:**
- **Build Command**: 
```bash
npm install --include=dev && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

- **Start Command**:
```bash
node dist/index.js
```

### **2. Environment Variables:**
```bash
NODE_ENV=production
DATABASE_URL=[SEU_SUPABASE_CONNECTION_STRING]
PORT=10000
```

### **3. Health Check Endpoint:**
- **URL**: `/health/db`
- **Resposta esperada**: `{"ok":true,"now":"2025-08-14T..."}`

## 📋 ARQUIVOS RENDER PRONTOS:

### **A) dist/index.js** (Após build)
- Server bundleado com todas dependências
- Porta configurável via `process.env.PORT`
- Conexão SSL Supabase via `DATABASE_URL`

### **B) dist/public/** (Após build)  
- Frontend React buildado
- Assets estáticos servidos pelo Express

## 🎯 DEPLOY STEPS:

### **1. No Render Dashboard:**
1. **New → Web Service**
2. **Connect Repository** → GitHub/GitLab
3. **Build Command** → Comando acima
4. **Start Command** → `node dist/index.js`
5. **Environment** → `NODE_ENV=production`
6. **Add DATABASE_URL** → String conexão Supabase

### **2. Verificar Deploy:**
```bash
# Health check
curl https://[seu-render-url].onrender.com/health/db

# Login teste  
curl -X POST https://[seu-render-url].onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### **3. Testar Interface:**
- **Login**: admin / admin123
- **Usuários**: 3 usuários listados
- **Casos**: 8 casos com alertas coloridas
- **Funcionários**: 5 funcionários BASE FACILITIES

---

**STATUS FINAL**: Database Supabase 100% funcional, código pronto para deploy no Render!