// Edge Function: notify-payment
// Recebida quando o usuário clica "Já paguei" no frontend.
// Envia mensagem Telegram ao admin com link de ativação.
//
// Reutiliza secrets já configurados no projeto:
//   TELEGRAM_BOT_TOKEN  → mesmo bot das notificações
//   NOTIFY_SECRET       → mesmo secret do telegram-notify (protege activate-user)
//   ADMIN_CHAT_ID       → chat_id do admin no Telegram (único secret novo)
//   SUPABASE_URL        → disponível automaticamente no Supabase

const ADMIN_TG_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const ADMIN_TG_CHAT  = Deno.env.get('ADMIN_CHAT_ID') ?? ''
const ADMIN_SECRET   = Deno.env.get('NOTIFY_SECRET') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''

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

  let user_id: string, email: string, months: number, total: number
  try {
    const body = await req.json()
    user_id = body.user_id
    email   = body.email
    months  = Number(body.months) || 1
    total   = Number(body.total)  || 0
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!user_id || !email) {
    return new Response(JSON.stringify({ error: 'user_id e email são obrigatórios' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!ADMIN_TG_TOKEN || !ADMIN_TG_CHAT) {
    // Secrets não configurados — retorna ok mesmo assim para não travar o frontend
    console.warn('TELEGRAM_BOT_TOKEN ou ADMIN_CHAT_ID não configurados')
    return new Response(JSON.stringify({ ok: true, warning: 'Telegram não configurado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const baseUrl = `${SUPABASE_URL}/functions/v1/activate-user?secret=${ADMIN_SECRET}&user_id=${user_id}`
  const now     = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const planLabel = months === 1 ? '1 mês' : months === 3 ? '3 meses' : `${months} meses`
  const totalFmt  = total > 0
    ? `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : ''

  const link = (label: string, m: number) => {
    const url = m === 1 ? baseUrl : `${baseUrl}&months=${m}`
    const arrow = m === months ? ' ← SELECIONADO' : ''
    return `[${label}${arrow}](${url})`
  }

  const message =
    `💰 *Pagamento PIX pendente*\n\n` +
    `📧 \`${email}\`\n` +
    `🆔 \`${user_id}\`\n` +
    `📦 Plano: *${planLabel}*${totalFmt ? ` — ${totalFmt}` : ''}\n` +
    `🕐 ${now}\n\n` +
    link('✅ Ativar 1 mês', 1) + '\n' +
    link('✅ Ativar 3 meses', 3) + '\n' +
    link('✅ Ativar 12 meses', 12)

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${ADMIN_TG_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_TG_CHAT,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      }
    )
    if (!tgRes.ok) {
      const err = await tgRes.text()
      console.error('Telegram error:', err)
    }
  } catch (e) {
    console.error('Failed to send Telegram notification:', e)
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
