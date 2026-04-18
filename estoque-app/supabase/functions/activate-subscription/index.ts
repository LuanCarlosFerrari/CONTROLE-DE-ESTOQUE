import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Verificar secret (chamada interna ou webhook de pagamento)
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { user_id } = await req.json()
  if (!user_id) return new Response('user_id required', { status: 400 })

  const subscription_ends_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Desbanir usuário
  const { error: unbanError } = await supabase.auth.admin.updateUserById(user_id, {
    ban_duration: 'none'
  })
  if (unbanError) {
    return new Response(JSON.stringify({ error: unbanError.message }), { status: 500 })
  }

  // Atualizar subscription para active + 30 dias
  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      subscription_ends_at,
      banned_at: null,
    })
    .eq('user_id', user_id)

  if (subError) {
    return new Response(JSON.stringify({ error: subError.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ ok: true, user_id, subscription_ends_at }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
