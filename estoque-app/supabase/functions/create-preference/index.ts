import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Missing authorization', { status: 401, headers: corsHeaders })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.stocktag.com.br'
  const accessToken = Deno.env.get('MP_ACCESS_TOKEN')!

  const preference = {
    items: [
      {
        id: 'stocktag-mensal',
        title: 'StockTag — Plano Mensal',
        description: 'Acesso completo ao StockTag por 30 dias',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: 129.00,
      },
    ],
    payer: {
      email: user.email,
    },
    back_urls: {
      success: `${appUrl}/app/dashboard?payment=success`,
      failure: `${appUrl}/app/configuracoes?payment=failure`,
      pending: `${appUrl}/app/configuracoes?payment=pending`,
    },
    auto_return: 'approved',
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/activate-subscription`,
    external_reference: user.id,
    statement_descriptor: 'STOCKTAG',
  }

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(preference),
  })

  if (!mpRes.ok) {
    const err = await mpRes.text()
    console.error('MercadoPago error:', err)
    return new Response(
      JSON.stringify({ error: 'Falha ao criar preferência de pagamento' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const data = await mpRes.json()

  return new Response(
    JSON.stringify({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      preference_id: data.id,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
