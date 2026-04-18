-- ============================================================
-- StockPro — Schema Supabase
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- ============================================================

-- Tabela: produtos
create table if not exists produtos (
  id uuid default gen_random_uuid() primary key,
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
  cliente_id uuid references clientes(id) on delete set null,
  total numeric(10,2) default 0,
  status text default 'pago' check (status in ('pago', 'pendente', 'cancelado')),
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

-- ============================================================
-- Row Level Security (RLS) — Protege dados por usuário autenticado
-- ============================================================

alter table produtos enable row level security;
alter table clientes enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;

-- Políticas: qualquer usuário autenticado pode ler e escrever
-- (ajuste conforme necessário para multi-tenant)

create policy "Authenticated users can do everything on produtos"
  on produtos for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on clientes"
  on clientes for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on vendas"
  on vendas for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on venda_itens"
  on venda_itens for all to authenticated using (true) with check (true);

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

create trigger set_updated_at_produtos
  before update on produtos
  for each row execute function update_updated_at();

create trigger set_updated_at_clientes
  before update on clientes
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
