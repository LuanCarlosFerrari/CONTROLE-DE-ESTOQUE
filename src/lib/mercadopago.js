import { supabase } from './supabase'

export async function createPaymentPreference() {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-preference`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    }
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Erro ao criar preferência')
  return import.meta.env.DEV ? json.sandbox_init_point : json.init_point
}
