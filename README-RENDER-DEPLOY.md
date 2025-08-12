# Deploy no Render - Legal Case Management System

## Configuração Automática

Este sistema está otimizado para deployment no Render. Siga estas etapas:

### 1. Configurar Variáveis de Ambiente

No painel do Render, adicione estas variáveis:

**DATABASE_URL**
```
postgresql://neondb_owner:npg_cENtFV63LasC@ep-proud-sun-adscjpcc.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**SESSION_SECRET**
```
base-facilities-legal-2024-secret-key
```

**NODE_ENV** (opcional - já configurado automaticamente)
```
production
```

### 2. Comandos de Build e Start

**Build Command:**
```
node render-build.js
```

**Start Command:**
```
node render-simple-start.js
```

**Alternativo (se script não funcionar):**
```
NODE_ENV=production DATABASE_URL=postgresql://neondb_owner:npg_cENtFV63LasC@ep-proud-sun-adscjpcc.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require SESSION_SECRET=base-facilities-legal-2024-secret-key node dist/index.js
```

### 3. Configuração Alternativa (se scripts personalizados não funcionarem)

**Build Command:**
```
npm install && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

**Start Command:**
```
NODE_ENV=production node dist/index.js
```

### 4. Arquivos de Configuração Inclusos

- `render-build.js` - Script personalizado de build
- `render-start.js` - Script personalizado de inicialização  
- `render.yaml` - Configuração automática do Render
- `build.sh` - Script alternativo de build

### 5. Features do Sistema

✅ Autenticação com sessões seguras
✅ Gerenciamento de casos jurídicos
✅ Dashboard analytics em tempo real
✅ Gestão de funcionários com 40k+ registros
✅ Logs de atividade completos
✅ Interface responsiva em português

### 6. Contas de Teste

- **Admin**: admin / admin123
- **Limitado**: lucas.silva / barone13

### 7. Troubleshooting

Se o build falhar:

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Use os comandos alternativos listados na seção 3
3. Verifique os logs do Render para erros específicos

O sistema está configurado para funcionar automaticamente no Render com estas configurações.