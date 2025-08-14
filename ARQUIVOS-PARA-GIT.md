# 📁 ARQUIVOS ESSENCIAIS PARA GIT/RENDER

## ✅ ARQUIVOS OBRIGATÓRIOS:

### **1. Configuração do Projeto**
```
package.json             ✅ (dependências npm)
package-lock.json        ✅ (versões exatas)
tsconfig.json           ✅ (configuração TypeScript)
vite.config.ts          ✅ (build frontend)
tailwind.config.ts      ✅ (estilos)
postcss.config.js       ✅ (CSS processing)
components.json         ✅ (shadcn/ui)
drizzle.config.ts       ✅ (database)
.gitignore              ✅ (arquivos ignorados)
```

### **2. Código Fonte**
```
client/                 ✅ (React frontend completo)
server/                 ✅ (Node.js backend completo)
shared/                 ✅ (schemas e tipos)
```

### **3. Configuração Deploy Render**
```
render.yaml             ✅ (configuração deploy)
start-production.js     ✅ (script inicialização)
build-render.sh         ✅ (script build)
```

### **4. Documentação**
```
replit.md              ✅ (documentação técnica)
README.md              ✅ (se existir)
```

## ❌ NÃO SUBIR:

### **Arquivos Locais/Temporários**
```
node_modules/
dist/
uploads/
cookies*.txt
*.log
.replit
```

### **Arquivos de Desenvolvimento**
```
debug-*.js
test-*.js
migration-*.js
populate-*.js
*.sql (arquivos de migração manual)
```

## 🚀 COMANDOS PARA VOCÊ EXECUTAR:

### **1. Preparar Repositório**
```bash
# Inicializar Git
git init

# Adicionar arquivos essenciais
git add package.json package-lock.json tsconfig.json
git add vite.config.ts tailwind.config.ts postcss.config.js
git add components.json drizzle.config.ts .gitignore

# Adicionar código fonte
git add client/ server/ shared/

# Adicionar configuração deploy
git add render.yaml start-production.js build-render.sh
git add replit.md

# Commit inicial
git commit -m "Sistema jurídico - Deploy com Supabase funcionando"
```

### **2. Conectar ao Repositório Remoto**
```bash
git remote add origin [URL_DO_SEU_REPOSITORIO_GIT]
git branch -M main
git push -u origin main
```

## 🔧 CONFIGURAÇÃO NO RENDER:

### **1. Environment Variables (no painel Render):**
```
DATABASE_URL=postgresql://postgres.fhalwugmppeswkvxnljn:BaseF@cilities2025!@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
NODE_ENV=production
PORT=10000
```

### **2. Build & Deploy Settings:**
```
Build Command:    npm install --include=dev && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
Start Command:    node start-production.js
```

## 📝 CHECKLIST FINAL:

- [x] Código funcionando localmente
- [x] Casos concluídos aparecendo ✅
- [x] Funcionários carregando ✅
- [x] Dashboard operacional ✅
- [x] Supabase conectado ✅
- [ ] Git configurado
- [ ] Deploy no Render

---

**PRÓXIMO PASSO**: Configure o repositório Git e conecte ao Render. O sistema já está 98% funcionando com dados reais do Supabase!