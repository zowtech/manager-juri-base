# Guia de Migração para Banco Próprio

## Passo 1: Exportar Dados Atuais

```bash
node migration-export.js
```

Isso criará:
- `database-backup.json` - Backup completo em JSON
- `database-backup.sql` - Script SQL para importação manual

## Passo 2: Criar Novo Banco

### Opção A: Supabase (Gratuito)
1. Vá para [supabase.com](https://supabase.com)
2. Crie conta gratuita
3. Crie novo projeto
4. Copie a Database URL

### Opção B: Railway ($5/mês)
1. Vá para [railway.app](https://railway.app)
2. Crie conta
3. Deploy PostgreSQL
4. Copie a Database URL

### Opção C: Neon (Gratuito)
1. Vá para [neon.tech](https://neon.tech)
2. Crie conta gratuita
3. Crie database
4. Copie a Database URL

## Passo 3: Configurar Schema no Novo Banco

```bash
# Usando a nova DATABASE_URL
DATABASE_URL="sua-nova-url" npm run db:push
```

## Passo 4: Importar Dados

```bash
node migration-import.js "sua-nova-database-url"
```

## Passo 5: Atualizar Render

1. Vá para o painel do Render
2. Environment Variables
3. Atualize `DATABASE_URL` com a nova URL
4. Deploy novamente

## Dados que Serão Migrados

✅ **Usuários**: admin, lucas.silva e permissões
✅ **Funcionários**: 19 funcionários da BASE FACILITIES  
✅ **Casos**: Todos os processos jurídicos
✅ **Logs**: Histórico de atividades
✅ **Configurações**: Permissões e layouts

## Benefícios da Migração

- **Independência total** do meu banco
- **Controle completo** dos dados
- **Backup próprio** quando quiser
- **Sem dependência** de terceiros
- **Escalabilidade** conforme sua necessidade

## Suporte Pós-Migração

Após a migração, você terá:
- Scripts de backup/restore
- Controle total dos dados
- Flexibilidade para trocar de provedor
- Capacidade de fazer backups locais

**Tempo estimado**: 15-30 minutos
**Custo**: Gratuito (Supabase/Neon) ou $5/mês (Railway)