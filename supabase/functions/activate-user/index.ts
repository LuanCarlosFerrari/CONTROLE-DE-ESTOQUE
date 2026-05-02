// Edge Function: activate-user
// Chamada pelo admin via link no Telegram.
// GET /activate-user?secret=XXX&user_id=YYY&months=1
//
// Secrets necessários:
//   NOTIFY_SECRET               → mesmo secret do telegram-notify
//   SUPABASE_SERVICE_ROLE_KEY   → disponível automaticamente no Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_SECRET      = Deno.env.get('NOTIFY_SECRET') ?? ''
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SVC_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function html(title: string, emoji: string, msg: string, color = '#34D399') {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    </head>
    <body style="font-family:system-ui,sans-serif;text-align:center;padding:80px 24px;
                 background:#0d0d0d;color:#fff;min-height:100vh;box-sizing:border-box">
      <div style="font-size:72px;margin-bottom:24px">${emoji}</div>
      <h1 style="color:${color};font-size:28px;margin-bottom:12px">${title}</h1>
      <p style="color:#888;font-size:16px;max-width:400px;margin:0 auto">${msg}</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

Deno.serve(async (req) => {
  const url     = new URL(req.url)
  const secret  = url.searchParams.get('secret') ?? ''
  const user_id = url.searchParams.get('user_id') ?? ''
  const months  = Math.max(1, parseInt(url.searchParams.get('months') ?? '1', 10))

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return html('Não autorizado', '🔒', 'Token inválido ou expirado.', '#F87171')
  }

  if (!user_id) {
    return html('Parâmetro ausente', '⚠️', 'user_id é obrigatório.', '#F59E0B')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_ROLE, {
    auth: { persistSession: false },
  })

  const { error } = await supabase.rpc('activate_subscription', {
    p_user_id: user_id,
    p_months:  months,
  })

  if (error) {
    console.error('activate_subscription error:', error)
    return html(
      'Erro ao ativar',
      '❌',
      `Não foi possível ativar a assinatura: ${error.message}`,
      '#F87171'
    )
  }

  const period = months === 1 ? '1 mês' : `${months} meses`
  return html(
    'Assinatura ativada!',
    '✅',
    `Conta ativada por ${period}. O usuário já tem acesso ao sistema.`
  )
})
