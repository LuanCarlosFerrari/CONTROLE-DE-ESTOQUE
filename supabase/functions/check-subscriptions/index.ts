import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const results = { expired: 0, errors: [] as string[] }

  try {
    // Trials vencidos → expired (usuário ainda consegue logar e ver a tela de pagamento)
    const { data: expiredTrials, error: trialError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'trial')
      .lt('trial_ends_at', new Date().toISOString())

    if (trialError) throw trialError

    for (const sub of expiredTrials ?? []) {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', sub.user_id)
      if (error) results.errors.push(`expire trial ${sub.user_id}: ${error.message}`)
      else results.expired++
    }

    // Assinaturas pagas vencidas → expired
    const { data: expiredSubs, error: subError } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .not('subscription_ends_at', 'is', null)
      .lt('subscription_ends_at', new Date().toISOString())

    if (subError) throw subError

    for (const sub of expiredSubs ?? []) {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', sub.user_id)
      if (error) results.errors.push(`expire sub ${sub.user_id}: ${error.message}`)
      else results.expired++
    }

    // Usuários com status 'banned' no auth.users mas sem motivo legítimo → desbanir
    // (migração: limpar bans antigos gerados pela versão anterior desta function)
    const { data: banned } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'banned')

    for (const sub of banned ?? []) {
      await supabase.auth.admin.updateUserById(sub.user_id, { ban_duration: 'none' })
      await supabase
        .from('subscriptions')
        .update({ status: 'expired', banned_at: null })
        .eq('user_id', sub.user_id)
      results.expired++
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
