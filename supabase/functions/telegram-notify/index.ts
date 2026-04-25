import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTIFY_SECRET = Deno.env.get('NOTIFY_SECRET')!
const TOKEN         = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TG_API        = `https://api.telegram.org/bot${TOKEN}`

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// ── Helpers ────────────────────────────────────────────────────────────────

async function sendMsg(chatId: number, text: string) {
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function getLinkedSessions(userId?: string) {
  let q = db.from('bot_sessions').select('chat_id, user_id').not('user_id', 'is', null)
  if (userId) q = q.eq('user_id', userId)
  const { data } = await q
  return data ?? []
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleEstoqueBaixo(userId: string, payload: Record<string, unknown>) {
  const sessions = await getLinkedSessions(userId)
  const text = `⚠️ *Estoque baixo!*\n\n📦 *${payload.nome}* — ${payload.quantidade} un restantes (mín: ${payload.estoque_minimo})`
  for (const s of sessions) await sendMsg(Number(s.chat_id), text)
}

async function handleNovaOS(userId: string, payload: Record<string, unknown>) {
  const sessions = await getLinkedSessions(userId)
  const veiculo  = payload.veiculo ? ` — ${payload.veiculo}` : ''
  const text = `🔧 *Nova OS aberta!*\n\n*${payload.numero}*${veiculo}`
  for (const s of sessions) await sendMsg(Number(s.chat_id), text)
}

function timeStr() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

async function handleCaixaAberto(userId: string, payload: Record<string, unknown>) {
  const sessions = await getLinkedSessions(userId)
  const saldo = fmt(Number(payload.saldo_inicial || 0))
  const text = [
    '🟢 *Caixa aberto*',
    '',
    `Saldo inicial: R$ ${saldo}`,
    `🕐 ${timeStr()}`,
  ].join('\n')
  for (const s of sessions) await sendMsg(Number(s.chat_id), text)
}

async function handleCaixaFechado(userId: string, payload: Record<string, unknown>) {
  const sessions   = await getLinkedSessions(userId)
  const contado    = Number(payload.saldo_contado  || 0)
  const esperado   = Number(payload.saldo_esperado || 0)
  const diff       = contado - esperado
  const diffIcon   = Math.abs(diff) < 0.01 ? '✅' : diff < 0 ? '⚠️' : '💚'
  const diffStr    = `${diff >= 0 ? '+' : ''}R$ ${fmt(diff)}`
  const text = [
    '🔴 *Caixa fechado*',
    '',
    `Saldo contado:  R$ ${fmt(contado)}`,
    `Saldo esperado: R$ ${fmt(esperado)}`,
    `${diffIcon} Diferença: ${diffStr}`,
    `🕐 ${timeStr()}`,
  ].join('\n')
  for (const s of sessions) await sendMsg(Number(s.chat_id), text)
}

async function handleCaixaReaberto(userId: string) {
  const sessions = await getLinkedSessions(userId)
  const text = [
    '🔄 *Caixa reaberto*',
    '',
    `O caixa foi reaberto manualmente.`,
    `🕐 ${timeStr()}`,
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
      `🌅 *Bom dia! Resumo de ${dateStr}*`,
      '',
      `💰 Caixa: ${caixa ? (caixa.status === 'aberto' ? '🟢 Aberto' : '🔴 Fechado') : '⚠️ Não aberto ainda'}`,
      `🏨 Check-outs hoje: *${checkouts?.length ?? 0}*`,
      `🔧 OS em aberto: *${osCount ?? 0}*`,
      `📋 Parcelas vencidas: *${(parcelas as unknown[])?.length ?? 0}*`,
    ]

    if (checkouts?.length) {
      lines.push('', '*Saídas de hoje:*')
      for (const r of checkouts) lines.push(`  • ${r.nome_hospede}`)
    }

    if ((parcelas as unknown[])?.length) {
      lines.push('', '*Parcelas em atraso:*')
      for (const p of parcelas as any[]) {
        const dias = Math.floor(
          (new Date(today).getTime() - new Date(p.data_vencimento + 'T12:00:00').getTime()) / 86400000
        )
        const atraso = dias > 0 ? `${dias}d atraso` : 'vence hoje'
        lines.push(`  • *${p.cliente_nome}* — R$ ${fmt(Number(p.valor))} (${atraso})`)
      }
    }

    await sendMsg(Number(s.chat_id), lines.join('\n'))
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('OK')

  const secret = req.headers.get('X-Notify-Secret')
  const auth   = req.headers.get('Authorization')

  let verifiedUserId: string | null = null

  if (secret) {
    if (secret !== NOTIFY_SECRET) return new Response('Unauthorized', { status: 401 })
  } else if (auth) {
    const userDb = createClient(Deno.env.get('SUPABASE_URL')!, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    })
    const { data: { user } } = await userDb.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    verifiedUserId = user.id
  } else {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { type, user_id, payload = {} } = await req.json()
    const uid = verifiedUserId ?? user_id

    if      (type === 'caixa_aberto')    await handleCaixaAberto(uid, payload)
    else if (type === 'caixa_fechado')   await handleCaixaFechado(uid, payload)
    else if (type === 'caixa_reaberto')  await handleCaixaReaberto(uid)
    else if (type === 'estoque_baixo')   await handleEstoqueBaixo(uid, payload)
    else if (type === 'nova_os')         await handleNovaOS(uid, payload)
    else if (type === 'resumo_matinal')  await handleResumoMatinal()
  } catch (err) {
    console.error('telegram-notify error:', err)
  }

  return new Response('OK')
})
