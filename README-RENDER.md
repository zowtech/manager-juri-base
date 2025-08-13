# Deploy no Render com Supabase

## Pré-requisitos

1. **Conta no Render**: [render.com](https://render.com)
2. **Banco Supabase**: [supabase.com](https://supabase.com)
3. **Repositório Git**: GitHub, GitLab ou Bitbucket

## Passo a Passo

### 1. Preparar o Banco Supabase

1. Crie um projeto no Supabase
2. Vá em **Settings** → **Database**
3. Copie a **Connection String** (URI format)
4. Exemplo: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`

### 2. Configurar no Render

1. **Criar Web Service**:
   - Vá em [dashboard.render.com](https://dashboard.render.com)
   - Clique em **New** → **Web Service**
   - Conecte seu repositório Git

2. **Configurações do Build**:
   - **Name**: `legal-case-management`
   - **Environment**: `Node`
   - **Build Command**: `npm install && node build-render.js`
   - **Start Command**: `npm start`

3. **Variáveis de Ambiente**:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `sua_connection_string_do_supabase`

### 3. Deploy Automático

O Render detectará o arquivo `render.yaml` e configurará automaticamente:

```yaml
services:
  - type: web
    name: legal-case-management
    env: node
    buildCommand: npm install && node build-render.js
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

### 4. Configurar DATABASE_URL

No painel do Render:
1. Vá em **Environment**
2. Adicione a variável `DATABASE_URL`
3. Cole sua string de conexão do Supabase
4. Clique em **Save Changes**

### 5. Executar Migrações

Após o primeiro deploy:
1. Vá em **Shell** no painel do Render
2. Execute: `npm run db:push`

## Estrutura de Arquivos

```
projeto/
├── render.yaml          # Configuração automática do Render
├── build-render.js      # Script de build customizado
├── start-render.js      # Script de inicialização
├── package.json         # Dependencies e scripts
├── dist/               # Arquivos buildados (criado automaticamente)
│   ├── index.js        # Servidor bundled
│   ├── public/         # Frontend estático
│   └── package.json    # Package simplificado para produção
```

## Comandos Úteis

### Local (desenvolvimento)
```bash
npm run dev                 # Servidor de desenvolvimento
npm run db:push            # Aplicar migrações
```

### Produção (Render)
```bash
npm install                 # Instalar dependências
node build-render.js        # Build completo
npm start                   # Iniciar servidor
```

## Troubleshooting

### Erro de Build
- Verifique se todas as dependências estão no `package.json`
- Confirme que `esbuild` está instalado

### Erro de Conexão com DB
- Verifique se `DATABASE_URL` está configurado corretamente
- Teste a conexão localmente primeiro

### Erro 404 em Rotas
- Confirme que os arquivos estáticos foram buildados em `dist/public`
- Verifique se o servidor está servindo arquivos estáticos

## URLs Importantes

- **App Live**: `https://legal-case-management.onrender.com`
- **Logs**: Dashboard Render → Logs
- **DB Admin**: Supabase Dashboard
- **Métricas**: Dashboard Render → Metrics

## Suporte

Em caso de problemas:
1. Verifique os logs no painel do Render
2. Confirme as variáveis de ambiente
3. Teste localmente com `NODE_ENV=production`