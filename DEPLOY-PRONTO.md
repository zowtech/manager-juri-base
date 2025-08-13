# ✅ DEPLOY RENDER - PRONTO PARA USAR

## Banco Supabase Configurado ✅
- **URL**: `postgresql://postgres:BaseF@cilities2025!@db.fhalwugmppeswkvxnljn.supabase.co:5432/postgres`
- **Tabelas criadas**: users, employees, cases, activity_log, sessions
- **Dados de exemplo**: 2 funcionários, 2 casos, 1 admin

## Login do Sistema
- **Usuário**: `admin`
- **Senha**: `admin123`

## 🚀 Passos Finais

### 1. Git Push
```bash
git add .
git commit -m "Sistema jurídico pronto - Render + Supabase"
git push origin main
```

### 2. Criar Web Service no Render
1. **[render.com](https://render.com)** → **New Web Service**
2. **Connect GitHub** → Selecionar seu repositório
3. **Nome**: `legal-case-management`
4. **Branch**: `main`
5. **Build Command**: `npm install && node build-render.cjs` (automático via render.yaml)
6. **Start Command**: `npm start` (automático via render.yaml)

### 3. Configurar Environment Variable
- **Key**: `DATABASE_URL`
- **Value**: `postgresql://postgres:BaseF@cilities2025!@db.fhalwugmppeswkvxnljn.supabase.co:5432/postgres`

### 4. Deploy!
- Render vai buildar automaticamente
- Em ~5 minutos: URL pública funcionando
- Login com admin/admin123

## 🎯 Sistema Completo Pronto
- ✅ Dashboard com métricas
- ✅ Gestão de funcionários
- ✅ Gestão de casos jurídicos  
- ✅ Upload de Excel
- ✅ Relatórios e analytics
- ✅ Audit trail completo

**É só fazer o git push e criar o Web Service! Está tudo configurado.**