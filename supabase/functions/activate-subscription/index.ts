import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function activateUser(user_id: string): Promise<string> {
  const subscription_ends_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error: unbanError } = await supabase.auth.admin.updateUserById(user_id, {
    ban_duration: 'none'
  })
  if (unbanError) throw new Error(`unban failed: ${unbanError.message}`)

  const { error: subError } = await supabase
    .from('subscriptions')
    .update({ status: 'active', subscription_ends_at, banned_at: null })
    .eq('user_id', user_id)
  if (subError) throw new Error(`subscription update failed: ${subError.message}`)

  return subscription_ends_at
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const rawBody = await req.text()

  // --- Path B: chamada interna com x-webhook-secret (backwards compat) ---
  const internalSecret = req.headers.get('x-webhook-secret')
  if (internalSecret) {
    if (internalSecret !== Deno.env.get('WEBHOOK_SECRET')) {
      return new Response('Unauthorized', { status: 401 })
    }
    let body: { user_id?: string }
    try { body = JSON.parse(rawBody) } catch { return new Response('Bad request', { status: 400 }) }
    if (!body.user_id) return new Response('user_id required', { status: 400 })
    try {
      const subscription_ends_at = await activateUser(body.user_id)
      return new Response(
        JSON.stringify({ ok: true, user_id: body.user_id, subscription_ends_at }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
    }
  }

  // --- Path A: IPN do MercadoPago ---
  let body: { type?: string; data?: { id?: string } }
  try { body = JSON.parse(rawBody) } catch { return new Response('Bad request', { status: 400 }) }

  const dataId = body?.data?.id
  if (!dataId) {
    // Ping de teste sem data.id — apenas confirmar recebimento
    return new Response('ok', { status: 200 })
  }

  if (body.type !== 'payment') {
    return new Response('ok', { status: 200 })
  }

  // Validar assinatura HMAC-SHA256
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')
  const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET')

  if (!xSignature || !webhookSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const parts = Object.fromEntries(
    xSignature.split(',').map(p => {
      const idx = p.indexOf('=')
      return [p.slice(0, idx), p.slice(idx + 1)]
    })
  )
  const ts = parts['ts']
  const receivedHash = parts['v1']

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
  const computedHash = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (computedHash !== receivedHash) {
    console.error('Signature mismatch', { computedHash, receivedHash })
    return new Response('Unauthorized', { status: 401 })
  }

  // Buscar detalhes do pagamento no MP
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { 'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` }
  })

  if (!mpRes.ok) {
    console.error('Failed to fetch payment', dataId, await mpRes.text())
    return new Response('Error fetching payment', { status: 502 })
  }

  const payment = await mpRes.json()

  if (payment.status !== 'approved') {
    console.log(`Payment ${dataId} status: ${payment.status} — ignoring`)
    return new Response('ok', { status: 200 })
  }

  const user_id = payment.external_reference
  if (!user_id) {
    console.error('Payment has no external_reference', dataId)
    return new Response('Missing external_reference', { status: 400 })
  }

  try {
    const subscription_ends_at = await activateUser(user_id)
    console.log(`Activated user ${user_id} until ${subscription_ends_at}`)
    return new Response(
      JSON.stringify({ ok: true, user_id, subscription_ends_at }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Activation error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
