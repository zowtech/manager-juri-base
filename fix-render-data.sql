-- Script para corrigir dados no Render se necessário

-- 1. Recriar usuário admin se não existir
INSERT INTO users (id, username, password, role, permissions, created_at, updated_at)
VALUES (
  'af91cd6a-269d-405f-bf3d-53e813dcb999',
  'admin',
  '$scrypt$N=16384,r=8,p=1$c2FsdA==$hashedpassword',  -- Será substituído pelo hash correto
  'admin',
  '{"nome":{"edit":true,"view":true},"pages":{"cases":true,"users":true,"dashboard":true,"activityLog":true},"status":{"edit":true,"view":true},"processo":{"edit":true,"view":true},"audiencia":{"edit":true,"view":true},"matricula":{"edit":true,"view":true},"observacao":{"edit":true,"view":true},"prazoEntrega":{"edit":true,"view":true},"canCreateCases":true,"canDeleteCases":true}',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE SET
  role = 'admin',
  permissions = '{"nome":{"edit":true,"view":true},"pages":{"cases":true,"users":true,"dashboard":true,"activityLog":true},"status":{"edit":true,"view":true},"processo":{"edit":true,"view":true},"audiencia":{"edit":true,"view":true},"matricula":{"edit":true,"view":true},"observacao":{"edit":true,"view":true},"prazoEntrega":{"edit":true,"view":true},"canCreateCases":true,"canDeleteCases":true}',
  updated_at = NOW();

-- 2. Verificar se a senha está correta (você precisará executar isso manualmente)
-- SELECT username, password FROM users WHERE username = 'admin';