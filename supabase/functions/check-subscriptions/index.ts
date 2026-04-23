import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

Deno.serve(async (req) => {
  // Aceita apenas POST com secret header para segurança
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const results = { banned: 0, reactivated: 0, errors: [] as string[] }

  try {
    // 1. Buscar trials expirados ainda não banidos
    const { data: expiredTrials, error: trialError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'trial')
      .lt('trial_ends_at', new Date().toISOString())

    if (trialError) throw trialError

    // 2. Banir usuários com trial expirado
    for (const sub of expiredTrials ?? []) {
      const { error: banError } = await supabase.auth.admin.updateUserById(
        sub.user_id,
        { ban_duration: '876600h' } // ~100 anos
      )
      if (banError) {
        results.errors.push(`ban ${sub.user_id}: ${banError.message}`)
        continue
      }
      await supabase
        .from('subscriptions')
        .update({ status: 'banned', banned_at: new Date().toISOString() })
        .eq('user_id', sub.user_id)
      results.banned++
    }

    // 3. Buscar assinaturas pagas expiradas (para pagamentos futuros)
    const { data: expiredSubs } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .lt('subscription_ends_at', new Date().toISOString())

    for (const sub of expiredSubs ?? []) {
      const { error: banError } = await supabase.auth.admin.updateUserById(
        sub.user_id,
        { ban_duration: '876600h' }
      )
      if (banError) {
        results.errors.push(`ban-expired ${sub.user_id}: ${banError.message}`)
        continue
      }
      await supabase
        .from('subscriptions')
        .update({ status: 'banned', banned_at: new Date().toISOString() })
        .eq('user_id', sub.user_id)
      results.banned++
    }

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ ok: true, timestamp: new Date().toISOString(), ...results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
