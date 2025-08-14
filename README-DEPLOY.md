# 🚀 DEPLOY FÁCIL - Sistema Legal com SQLite

## 📋 OVERVIEW
Sistema de gestão jurídica com **banco SQLite local** - funciona em qualquer plataforma de hospedagem sem configuração de banco de dados externa.

## ✅ VANTAGENS DO SQLITE:
- **Zero configuração** de banco externo
- **Backup simples** - apenas um arquivo `data/legal-system.db`
- **Deploy universal** - funciona no Render, Vercel, Railway, Fly.io
- **Performance excelente** para aplicações pequenas/médias
- **Dados persistentes** automáticos

## 🎯 PLATAFORMAS SUPORTADAS:

### **1. RENDER.com (RECOMENDADO)**
```bash
# Build Command:
npm install && npm run build

# Start Command:
npm start

# Environment:
NODE_ENV=production
```

### **2. RAILWAY**
```bash
# Build Command:
npm run build

# Start Command:
npm start

# Deploy automático via GitHub
```

### **3. FLY.IO**
```bash
# Instalar fly CLI e fazer deploy:
fly launch
fly deploy
```

### **4. VERCEL (Frontend + Serverless)**
```bash
# Build Command:
npm run build

# Serverless functions para API
```

## 📦 ESTRUTURA DE ARQUIVOS:

```
├── data/
│   └── legal-system.db      # Banco SQLite (criado automaticamente)
├── server/
│   ├── sqlite-db.ts         # Configuração banco
│   ├── sqlite-storage.ts    # CRUD operations
│   └── index.ts            # Server principal
├── client/                  # Frontend React
├── dist/                   # Build de produção
└── package.json
```

## 🔧 COMANDOS BUILD:

### **Development:**
```bash
npm run dev        # Servidor desenvolvimento
```

### **Production:**
```bash
npm run build      # Build frontend + backend
npm start          # Start produção
```

## 🛠 DADOS PRÉ-POPULADOS:

### **Usuários:**
- **admin** / admin123 (Administrador completo)
- **lucas.silva** / barone13 (Editor limitado)
- **joyce** / senha123 (Editor limitado)

### **Funcionalidades:**
- ✅ Gestão de casos jurídicos
- ✅ Controle de funcionários
- ✅ Dashboard com analytics
- ✅ Sistema de permissões
- ✅ Logs de auditoria
- ✅ Interface responsiva

## 🎮 COMO FAZER DEPLOY:

### **RENDER (Mais Fácil):**
1. **Fork/Clone** do repositório
2. **Conectar** no Render.com
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Environment**: `NODE_ENV=production`
6. **Deploy** → Sistema funcional!

### **BACKUP/RESTORE:**
```bash
# Backup
cp data/legal-system.db backup-$(date +%Y%m%d).db

# Restore
cp backup-20240814.db data/legal-system.db
```

## 📊 MONITORAMENTO:

### **Health Check:**
```bash
curl https://seu-app.onrender.com/health/db
# Resposta: {"ok":true,"now":"2024-08-14..."}
```

### **URLs Importantes:**
- **Health**: `/health/db`
- **Login**: `/api/login`
- **Dashboard**: `/dashboard`
- **Admin**: `/users` (apenas admin)

---

**RESULTADO**: Sistema jurídico completo e **100% portável** - funciona em qualquer plataforma sem configuração de banco externa!