-- Tabela de parcelas de crediário
create table if not exists parcelas_crediario (
  id               uuid primary key default gen_random_uuid(),
  venda_id         uuid references vendas(id) on delete cascade,
  cliente_id       uuid references clientes(id),
  cliente_nome     text not null default '',
  numero           int not null,
  total_parcelas   int not null,
  valor            numeric(10,2) not null,
  data_vencimento  date not null,
  status           text not null default 'pendente',
  data_pagamento   date,
  created_at       timestamptz default now()
);

create index if not exists idx_parcelas_crediario_vencimento on parcelas_crediario(data_vencimento);
create index if not exists idx_parcelas_crediario_status     on parcelas_crediario(status);
create index if not exists idx_parcelas_crediario_cliente    on parcelas_crediario(cliente_id);

alter table parcelas_crediario enable row level security;

drop policy if exists "authenticated can manage parcelas_crediario" on parcelas_crediario;
create policy "authenticated can manage parcelas_crediario"
  on parcelas_crediario for all to authenticated
  using (true) with check (true);
