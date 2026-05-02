-- ============================================================
-- StockPro — Schema Supabase
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- ============================================================

-- Tabela: produtos
create table if not exists produtos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  nome text not null,
  categoria text,
  quantidade integer default 0,
  preco_custo numeric(10,2) default 0,
  preco_venda numeric(10,2) default 0,
  estoque_minimo integer default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela: clientes
create table if not exists clientes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  nome text not null,
  email text,
  telefone text,
  endereco text,
  cidade text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela: vendas
create table if not exists vendas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  cliente_id uuid references clientes(id) on delete set null,
  total numeric(10,2) default 0,
  status text default 'pago' check (status in ('pago', 'pendente', 'cancelado')),
  forma_pagamento text,
  observacao text,
  created_at timestamptz default now()
);

-- Tabela: venda_itens
create table if not exists venda_itens (
  id uuid default gen_random_uuid() primary key,
  venda_id uuid references vendas(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  quantidade integer not null,
  preco_unitario numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Tabela: mesas (Bar / Restaurante)
create table if not exists mesas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  numero text not null,
  tipo text default 'salao' check (tipo in ('salao', 'varanda', 'reservado', 'bar')),
  capacidade integer default 4,
  status text default 'disponivel' check (status in ('disponivel', 'ocupada', 'reservada')),
  descricao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela: comanda_itens (itens lançados nas mesas)
create table if not exists comanda_itens (
  id uuid default gen_random_uuid() primary key,
  mesa_id uuid references mesas(id) on delete cascade,
  descricao text not null,
  quantidade integer default 1,
  preco_unitario numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Tabela: fornecedores
create table if not exists fornecedores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  nome text not null,
  cnpj text,
  telefone text,
  email text,
  categoria text,
  cidade text,
  observacoes text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS) — Protege dados por usuário autenticado
-- ============================================================

alter table produtos enable row level security;
alter table clientes enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;
alter table mesas enable row level security;
alter table comanda_itens enable row level security;
alter table fornecedores enable row level security;

-- Políticas: cada usuário acessa apenas seus próprios dados
-- user_id IS NULL cobre dados legados sem isolamento

drop policy if exists "Authenticated users can do everything on produtos" on produtos;
create policy "produtos isolated by user"
  on produtos for all to authenticated
  using  (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());

drop policy if exists "Authenticated users can do everything on clientes" on clientes;
create policy "clientes isolated by user"
  on clientes for all to authenticated
  using  (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());

drop policy if exists "Authenticated users can do everything on vendas" on vendas;
create policy "vendas isolated by user"
  on vendas for all to authenticated
  using  (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());

drop policy if exists "Authenticated users can do everything on venda_itens" on venda_itens;
create policy "venda_itens isolated by user"
  on venda_itens for all to authenticated
  using  (venda_id in (select id from vendas where user_id = auth.uid() or user_id is null))
  with check (venda_id in (select id from vendas where user_id = auth.uid() or user_id is null));

drop policy if exists "Authenticated users can do everything on mesas" on mesas;
create policy "mesas isolated by user"
  on mesas for all to authenticated
  using  (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());

drop policy if exists "Authenticated users can do everything on comanda_itens" on comanda_itens;
create policy "comanda_itens isolated by user"
  on comanda_itens for all to authenticated
  using  (mesa_id in (select id from mesas where user_id = auth.uid() or user_id is null))
  with check (mesa_id in (select id from mesas where user_id = auth.uid() or user_id is null));

drop policy if exists "Authenticated users can do everything on fornecedores" on fornecedores;
create policy "fornecedores isolated by user"
  on fornecedores for all to authenticated
  using  (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_produtos on produtos;
create trigger set_updated_at_produtos
  before update on produtos
  for each row execute function update_updated_at();

drop trigger if exists set_updated_at_clientes on clientes;
create trigger set_updated_at_clientes
  before update on clientes
  for each row execute function update_updated_at();

drop trigger if exists set_updated_at_mesas on mesas;
create trigger set_updated_at_mesas
  before update on mesas
  for each row execute function update_updated_at();

drop trigger if exists set_updated_at_fornecedores on fornecedores;
create trigger set_updated_at_fornecedores
  before update on fornecedores
  for each row execute function update_updated_at();

-- ============================================================
-- Dados de exemplo (opcional — remova se não quiser)
-- ============================================================

insert into clientes (nome, email, telefone, cidade) values
  ('João Silva', 'joao@email.com', '(11) 99999-1111', 'São Paulo'),
  ('Maria Souza', 'maria@email.com', '(21) 98888-2222', 'Rio de Janeiro'),
  ('Pedro Costa', 'pedro@email.com', '(31) 97777-3333', 'Belo Horizonte');

insert into produtos (nome, categoria, quantidade, preco_custo, preco_venda, estoque_minimo) values
  ('Notebook Dell', 'Eletrônicos', 15, 2500.00, 3499.00, 3),
  ('Mouse Sem Fio', 'Eletrônicos', 50, 35.00, 79.90, 10),
  ('Teclado Mecânico', 'Eletrônicos', 8, 120.00, 249.00, 5),
  ('Caderno Universitário', 'Papelaria', 100, 8.00, 18.90, 20),
  ('Caneta Azul cx/10', 'Papelaria', 3, 5.00, 12.00, 5),
  ('Garrafa Térmica', 'Outros', 25, 45.00, 89.90, 8);
