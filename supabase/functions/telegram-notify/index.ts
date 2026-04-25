import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTIFY_SECRET = Deno.env.get('NOTIFY_SECRET')!
const TOKEN         = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TG_API        = `https://api.telegram.org/bot${TOKEN}`

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)


// ── Helpers ────────────────────────────────────────────────────────────────

async function sendMsg(chatId: number, text: string, keyboard?: { text: string; callback_data: string }[][]) {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' }
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard }
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => res.statusText)
    console.error('[sendMsg] Telegram error:', JSON.stringify(err))
  }
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function getLinkedSessions(userId?: string) {
  let q = db.from('bot_sessions').select('chat_id, user_id').not('user_id', 'is', null)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q
  if (error) console.error('[getLinkedSessions] DB error:', error.message)
  console.log('[getLinkedSessions] userId:', userId, '→', data?.length ?? 0, 'session(s)')
  return data ?? []
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleEstoqueBaixo(userId: string, payload: Record<string, unknown>) {
  const sessions = await getLinkedSessions(userId)
  const text = `⚠️ <b>Estoque baixo!</b>\n\n📦 <b>${payload.nome}</b> — ${payload.quantidade} un restantes (mín: ${payload.estoque_minimo})`
  for (const s of sessions) await sendMsg(Number(s.chat_id), text)
}

async function handleNovaOS(userId: string, payload: Record<string, unknown>) {
  const sessions = await getLinkedSessions(userId)
  const veiculo  = payload.veiculo ? ` — ${payload.veiculo}` : ''
  const text = `🔧 <b>Nova OS aberta!</b>\n\n<b>${payload.numero}</b>${veiculo}`
  for (const s of sessions) await sendMsg(Number(s.chat_id), text)
}

function timeStr() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function closedTimeStr(isoUtc: string) {
  return new Date(isoUtc).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

async function handleCaixaAberto(userId: string, payload: Record<string, unknown>) {
  const sessions = await getLinkedSessions(userId)
  const data     = payload.data as string
  const text = [
    `🟢 <b>Caixa aberto — ${fmtDate(data)}</b>`,
    '',
    `💵 Saldo inicial: R$ ${fmt(Number(payload.saldo_inicial || 0))}`,
    `🕐 ${timeStr()}`,
  ].join('\n')
  for (const s of sessions) await sendMsg(Number(s.chat_id), text)
}

async function handleCaixaFechado(userId: string, payload: Record<string, unknown>) {
  const sessions    = await getLinkedSessions(userId)
  const data        = payload.data as string
  const inicial     = Number(payload.saldo_inicial  || 0)
  const vendas      = Number(payload.total_vendas   || 0)
  const numVendas   = Number(payload.num_vendas     || 0)
  const entradas    = Number(payload.total_entradas || 0)
  const saidas      = Number(payload.total_saidas   || 0)
  const esperado    = Number(payload.saldo_esperado || 0)
  const contado     = Number(payload.saldo_contado  || 0)
  const diff        = contado - esperado
  const diffIcon    = Math.abs(diff) < 0.01 ? '✅' : diff < 0 ? '⚠️' : '💚'
  const diffStr     = `${diff >= 0 ? '+' : ''}R$ ${fmt(diff)}`
  const obs         = payload.observacoes as string | null

  const lines = [
    `🔴 <b>Caixa fechado — ${fmtDate(data)}</b>`,
    '',
    `💵 Saldo inicial:      R$ ${fmt(inicial)}`,
    `🛒 Vendas (${numVendas}):         R$ ${fmt(vendas)}`,
    `📥 Entradas extras:    R$ ${fmt(entradas)}`,
    `📤 Saídas:             R$ ${fmt(saidas)}`,
    `─────────────────────────`,
    `📊 Saldo esperado:     R$ ${fmt(esperado)}`,
    `🧾 Saldo contado:      R$ ${fmt(contado)}`,
    `${diffIcon} Diferença:          ${diffStr}`,
    `🕐 ${timeStr()}`,
  ]

  if (obs) lines.push('', `📝 "${obs}"`)

  const keyboard = numVendas > 0
    ? [[{ text: '📋 Ver vendas do dia', callback_data: `vendas_dia:${data}` }]]
    : undefined

  for (const s of sessions) await sendMsg(Number(s.chat_id), lines.join('\n'), keyboard)
}

async function handleCaixaReaberto(userId: string, payload: Record<string, unknown>) {
  const sessions   = await getLinkedSessions(userId)
  const data       = payload.data as string
  const saldoAnt   = payload.saldo_final_anterior != null ? `R$ ${fmt(Number(payload.saldo_final_anterior))}` : '—'
  const fechadoEm  = payload.fechado_at ? closedTimeStr(payload.fechado_at as string) : '—'

  const text = [
    `🔄 <b>Caixa reaberto — ${fmtDate(data)}</b>`,
    '',
    `⏮ Fechado às:        ${fechadoEm}`,
    `🧾 Saldo contado era: ${saldoAnt}`,
    `🕐 Reaberto às:       ${timeStr()}`,
  ].join('\n')
  for (const s of sessions) await sendMsg(Number(s.chat_id), text)
}

async function handleResumoMatinal() {
  const sessions = await getLinkedSessions()
  const today   = new Date().toISOString().split('T')[0]
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  for (const s of sessions) {
    const userId = s.user_id as string

    const [
      { data: caixa },
      { count: osCount },
      { data: parcelas },
      { data: checkouts },
    ] = await Promise.all([
      db.from('caixas')
        .select('status')
        .eq('user_id', userId)
        .eq('data', today)
        .maybeSingle(),
      db.from('ordens_servico')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['aberta', 'em_andamento']),
      db.rpc('get_parcelas_vencidas_usuario', { p_user_id: userId }),
      db.from('reservas')
        .select('nome_hospede')
        .eq('user_id', userId)
        .eq('check_out', today)
        .in('status', ['confirmada', 'checkin']),
    ])

    const lines: string[] = [
      `🌅 <b>Bom dia! Resumo de ${dateStr}</b>`,
      '',
      `💰 Caixa: ${caixa ? (caixa.status === 'aberto' ? '🟢 Aberto' : '🔴 Fechado') : '⚠️ Não aberto ainda'}`,
      `🏨 Check-outs hoje: <b>${checkouts?.length ?? 0}</b>`,
      `🔧 OS em aberto: <b>${osCount ?? 0}</b>`,
      `📋 Parcelas vencidas: <b>${(parcelas as unknown[])?.length ?? 0}</b>`,
    ]

    if (checkouts?.length) {
      lines.push('', '<b>Saídas de hoje:</b>')
      for (const r of checkouts) lines.push(`  • ${r.nome_hospede}`)
    }

    if ((parcelas as unknown[])?.length) {
      lines.push('', '<b>Parcelas em atraso:</b>')
      for (const p of parcelas as any[]) {
        const dias = Math.floor(
          (new Date(today).getTime() - new Date(p.data_vencimento + 'T12:00:00').getTime()) / 86400000
        )
        const atraso = dias > 0 ? `${dias}d atraso` : 'vence hoje'
        lines.push(`  • <b>${p.cliente_nome}</b> — R$ ${fmt(Number(p.valor))} (${atraso})`)
      }
    }

    await sendMsg(Number(s.chat_id), lines.join('\n'))
  }
}

// ── CORS ───────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notify-secret',
}

// ── Main ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('OK', { headers: CORS })
  if (req.method !== 'POST')   return new Response('OK')

  const secret = req.headers.get('X-Notify-Secret')
  const auth   = req.headers.get('Authorization')

  let verifiedUserId: string | null = null

  if (secret) {
    if (secret !== NOTIFY_SECRET) return new Response('Unauthorized', { status: 401, headers: CORS })
  } else if (auth) {
    const { data: { user }, error: authErr } = await db.auth.getUser(auth.replace('Bearer ', ''))
    if (authErr || !user) return new Response('Unauthorized', { status: 401, headers: CORS })
    verifiedUserId = user.id
  } else {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  try {
    const { type, user_id, payload = {} } = await req.json()
    const uid = verifiedUserId ?? user_id
    console.log('[notify] type:', type, '| uid:', uid)

    if      (type === 'caixa_aberto')    await handleCaixaAberto(uid, payload)
    else if (type === 'caixa_fechado')   await handleCaixaFechado(uid, payload)
    else if (type === 'caixa_reaberto')  await handleCaixaReaberto(uid, payload)
    else if (type === 'estoque_baixo')   await handleEstoqueBaixo(uid, payload)
    else if (type === 'nova_os')         await handleNovaOS(uid, payload)
    else if (type === 'resumo_matinal')  await handleResumoMatinal()
  } catch (err) {
    console.error('telegram-notify error:', err)
  }

  return new Response('OK', { headers: CORS })
})
