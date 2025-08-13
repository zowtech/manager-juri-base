# 🚀 DEPLOY DIRETO - PASSO A PASSO

## 1. Execute Script Simples no Supabase
```sql
-- Funcionários básicos
INSERT INTO employees (empresa, nome, matricula, status) VALUES
('33', 'João Silva Santos', '12345', 'ativo'),
('55', 'Maria Oliveira Costa', '67890', 'ativo'),
('2', 'Carlos Mendes Silva', '11111', 'ativo'),
('79', 'Ana Paula Ferreira', '22222', 'ativo');

-- Casos básicos  
INSERT INTO cases ("clientName", matricula, "processNumber", description, status) VALUES
('João Silva Santos', '12345', 'TRT-2024-001', 'Reclamação trabalhista', 'pendente'),
('Maria Oliveira Costa', '67890', 'TRT-2024-002', 'Rescisão indireta', 'novo'),
('Carlos Mendes Silva', '11111', 'TRT-2024-003', 'Danos morais', 'concluido'),
('Ana Paula Ferreira', '22222', 'TRT-2024-004', 'Equiparação salarial', 'atrasado');
```

## 2. Arquivo para GitHub
O arquivo `server/db.ts` já está correto.

## 3. Deploy no Render
1. Atualizar GitHub (se necessário)
2. Manual Deploy no Render
3. Testar login: admin/admin123

## 4. Popular Mais Dados
Depois que estiver funcionando, podemos adicionar mais dados pelo próprio sistema.