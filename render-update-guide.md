# COMO ATUALIZAR O RENDER - PASSO A PASSO

## 🎯 OBJETIVO
Conectar seu app no Render ao novo banco Supabase.

## 📋 PASSOS EXATOS

### 1. Acesse o Painel do Render
1. Vá para: **https://dashboard.render.com**
2. Faça login na sua conta
3. Encontre seu serviço do sistema jurídico
4. Clique no nome do serviço

### 2. Atualize Environment Variables
1. No painel do serviço, clique em **"Environment"** (menu lateral)
2. Procure a variável **`DATABASE_URL`**
3. Clique no ícone de **editar** (lápis) ao lado
4. **APAGUE** a URL antiga completamente
5. **COLE** a nova URL do Supabase:

```
postgresql://postgres:BaseF@cilities2025!@db.dnymyzhahgqnxvkrgmoq.supabase.co:5432/postgres
```

### 3. Salvar e Deploy
1. Clique **"Save Changes"**
2. Aguarde a confirmação (alguns segundos)
3. Clique **"Manual Deploy"** (botão azul no topo)
4. Aguarde o deploy completar (2-3 minutos)

### 4. Teste o Sistema
1. Acesse sua URL do Render
2. Teste login: **admin** / **admin123**
3. Verifique se os funcionários aparecem
4. Confirme que tudo funciona

## ⚠️ SE DER ERRO DE CARACTERES ESPECIAIS

Use esta URL alternativa (com caracteres codificados):
```
postgresql://postgres:BaseF%40cilities2025%21@db.dnymyzhahgqnxvkrgmoq.supabase.co:5432/postgres
```

## ✅ SINAIS DE SUCESSO

- ✅ Login funciona (admin/admin123)
- ✅ Dashboard carrega
- ✅ Funcionários aparecem na busca
- ✅ Casos jurídicos são exibidos
- ✅ Sem erros de conexão

## 🎉 INDEPENDÊNCIA ALCANÇADA!

Após seguir esses passos:
- Seu sistema roda com SEU banco Supabase
- Você tem controle total dos dados
- Pode fazer backup quando quiser
- Não depende mais de terceiros
- Dashboard visual no Supabase para gerenciar dados

**PARABÉNS! Sistema 100% independente funcionando!**