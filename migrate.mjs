import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ucmxycxqpzyiucdidvit.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbXh5Y3hxcHp5aXVjZGlkdml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTk0NDUsImV4cCI6MjA5MjA5NTQ0NX0.XS891VZKPfb1Ptp2Xsz6RpdItm--MRuCVl4xqS0MBlY'
)

// Sign in to get an authenticated session (needed for RLS)
const { error: authErr } = await supabase.auth.signInWithPassword({
  email: 'luan.carlos.ferrari@gmail.com',
  password: 'Ferrant1971!!',
})
if (authErr) { console.error('Login falhou:', authErr.message); process.exit(1) }
console.log('✓ Login OK')

// Create table via rpc (requires the function to exist) — fallback: direct insert test
// Since anon key can't run DDL, we use the REST API with service_role if available
// Otherwise we test if table already exists
const { error } = await supabase.from('reserva_consumos').select('id').limit(1)

if (!error) {
  console.log('✓ Tabela reserva_consumos já existe!')
  process.exit(0)
}

if (error.code === '42P01') {
  console.log('✗ Tabela não existe. O anon key não tem permissão para criar tabelas.')
  console.log('\nExecute o SQL abaixo no Supabase Dashboard → SQL Editor:')
  console.log(`
create table reserva_consumos (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid references reservas(id) on delete cascade not null,
  descricao text not null,
  quantidade numeric not null default 1,
  preco_unitario numeric not null default 0,
  created_at timestamptz default now()
);

alter table reserva_consumos enable row level security;

create policy "authenticated full access"
on reserva_consumos for all
to authenticated
using (true)
with check (true);
  `)
} else {
  console.log('Erro:', error.message)
}
