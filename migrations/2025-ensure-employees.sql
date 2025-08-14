-- Migration to ensure employees table exists with correct structure
create table if not exists employees (
  id text primary key default gen_random_uuid(),
  empresa text,
  nome text not null,
  matricula text unique not null,
  rg text,
  pis text,
  data_admissao date,
  data_demissao date,
  salario text,
  cargo text,
  departamento text,
  centro_custo text,
  cpf text unique,
  status text default 'ativo',
  email text,
  telefone text,
  endereco text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure other required tables exist
create table if not exists users (
  id text primary key default gen_random_uuid(),
  email text unique,
  username text unique,
  password text,
  first_name text,
  last_name text,
  profile_image_url text,
  role text not null default 'viewer',
  permissions jsonb default '{
    "matricula": {"view": true, "edit": false},
    "nome": {"view": true, "edit": false},
    "processo": {"view": true, "edit": false},
    "prazoEntrega": {"view": true, "edit": false},
    "audiencia": {"view": true, "edit": false},
    "status": {"view": true, "edit": false},
    "observacao": {"view": true, "edit": false},
    "canCreateCases": false,
    "canDeleteCases": false,
    "pages": {
      "dashboard": true,
      "cases": true,
      "activityLog": false,
      "users": false
    }
  }'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sessions (
  sid text primary key,
  sess jsonb not null,
  expire timestamptz not null
);

create index if not exists IDX_session_expire on sessions(expire);