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

function fmtR$(val: number, padTo = 11): string {
  return `R$ ${fmt(val)}`.padStart(padTo)
}

function row(label: string, value: string, totalWidth = 30): string {
  const gap = Math.max(1, totalWidth - label.length - value.length)
  return label + ' '.repeat(gap) + value
}

function divider(width = 30): string {
  return '─'.repeat(width)
}

function pre(lines: string[]): string {
  return `<pre>${lines.join('\n')}</pre>`
}

function timeStr(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDateShort(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function closedTimeStr(isoUtc: string): string {
  return new Date(isoUtc).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

async function getLinkedSessions(userId?: string) {
  let q = db.from('bot_sessions').select('chat_id, user_id').not('user_id', 'is', null)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q
  if (error) console.error('[getLinkedSessions] DB error:', error.message)
  return data ?? []
}

async function broadcast(userId: string, text: string, keyboard?: { text: string; callback_data: string }[][]) {
  const sessions = await getLinkedSessions(userId)
  for (const s of sessions) await sendMsg(Number(s.chat_id), text, keyboard)
}

// ── Caixa ──────────────────────────────────────────────────────────────────

async function handleCaixaAberto(userId: string, payload: Record<string, unknown>) {
  const data    = payload.data as string
  const inicial = Number(payload.saldo_inicial || 0)

  const text = [
    `🟢 <b>Caixa Aberto</b>`,
    `📅 ${fmtDate(data)}`,
    '',
    pre([row('Saldo inicial', fmtR$(inicial))]),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

async function handleCaixaFechado(userId: string, payload: Record<string, unknown>) {
  const data      = payload.data as string
  const inicial   = Number(payload.saldo_inicial  || 0)
  const vendas    = Number(payload.total_vendas   || 0)
  const numVendas = Number(payload.num_vendas     || 0)
  const entradas  = Number(payload.total_entradas || 0)
  const saidas    = Number(payload.total_saidas   || 0)
  const esperado  = Number(payload.saldo_esperado || 0)
  const contado   = Number(payload.saldo_contado  || 0)
  const diff      = contado - esperado
  const diffIcon  = Math.abs(diff) < 0.01 ? '✅' : diff < 0 ? '❌' : '💚'
  const diffVal   = `${diff >= 0 ? '+' : ''}${fmt(diff)}`
  const obs       = payload.observacoes as string | null

  const W = 31
  const text = [
    `🔴 <b>Caixa Fechado</b>`,
    `📅 ${fmtDate(data)}`,
    '',
    pre([
      row('Saldo inicial',         fmtR$(inicial),  W),
      row(`Vendas (${numVendas})`, fmtR$(vendas),   W),
      row('Entradas extras',       fmtR$(entradas), W),
      row('Saidas',                fmtR$(saidas),   W),
      divider(W),
      row('Saldo esperado',        fmtR$(esperado), W),
      row('Saldo contado',         fmtR$(contado),  W),
      row('Diferenca',  `R$ ${diffVal}`.padStart(11), W),
    ]),
    `${diffIcon} Diferença: <b>R$ ${diffVal}</b>`,
    `🕐 ${timeStr()}`,
    ...(obs ? ['', `📝 <i>${obs}</i>`] : []),
  ].join('\n')

  const keyboard = numVendas > 0
    ? [[{ text: '📋 Ver vendas do dia', callback_data: `vendas_dia:${data}` }]]
    : undefined

  await broadcast(userId, text, keyboard)
}

async function handleCaixaReaberto(userId: string, payload: Record<string, unknown>) {
  const data      = payload.data as string
  const saldoAnt  = payload.saldo_final_anterior != null ? fmt(Number(payload.saldo_final_anterior)) : '—'
  const fechadoEm = payload.fechado_at ? closedTimeStr(payload.fechado_at as string) : '—'

  const W = 28
  const text = [
    `🔄 <b>Caixa Reaberto</b>`,
    `📅 ${fmtDate(data)}`,
    '',
    pre([
      row('Fechado as',     fechadoEm,        W),
      row('Saldo anterior', `R$ ${saldoAnt}`, W),
      row('Reaberto as',    timeStr(),         W),
    ]),
  ].join('\n')

  await broadcast(userId, text)
}

// ── Vendas ─────────────────────────────────────────────────────────────────

async function handleNovaVenda(userId: string, payload: Record<string, unknown>) {
  const itens       = (payload.itens as any[]) || []
  const total       = Number(payload.total || 0)
  const crediario   = payload.crediario as { num_parcelas: number; valor_parcela: number } | null
  const formaLabel  = String(payload.forma_pagamento || '—')
  const W = 30

  const itemLines = itens.map((i: any) =>
    row(`${i.nome} (${i.quantidade}x)`, fmtR$(Number(i.preco_unitario) * Number(i.quantidade), 11), W)
  )

  const tableLines = [
    row('Cliente',   String(payload.cliente_nome || '—'), W),
    row('Pagamento', formaLabel, W),
    divider(W),
    ...itemLines,
    divider(W),
    row('Total', fmtR$(total), W),
  ]

  if (crediario) {
    tableLines.push(row(`  ${crediario.num_parcelas}x de`, fmtR$(crediario.valor_parcela), W))
  }

  const text = [
    `🛒 <b>Nova Venda</b>`,
    '',
    pre(tableLines),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

// ── OS ─────────────────────────────────────────────────────────────────────

async function handleNovaOS(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const tableLines = [row('Numero', String(payload.numero), W)]
  if (payload.veiculo) tableLines.push(row('Veiculo', String(payload.veiculo), W))
  if (payload.cliente) tableLines.push(row('Cliente', String(payload.cliente), W))
  if (Number(payload.valor_total)) tableLines.push(row('Valor', fmtR$(Number(payload.valor_total)), W))

  const text = [
    `🔧 <b>Nova OS Aberta</b>`,
    '',
    pre(tableLines),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

async function handleOsAtualizada(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const STATUS_LABEL: Record<string, string> = {
    aberta: 'Aberta', em_andamento: 'Em andamento',
    concluida: 'Concluida', cancelada: 'Cancelada',
  }
  const statusNovo = STATUS_LABEL[String(payload.status_novo)] || String(payload.status_novo)
  const icon = payload.status_novo === 'concluida' ? '✅'
    : payload.status_novo === 'cancelada' ? '❌'
    : payload.status_novo === 'em_andamento' ? '⚙️'
    : '🔧'

  const tableLines = [
    row('Numero', String(payload.numero || '—'), W),
    row('Status', statusNovo, W),
  ]
  if (payload.veiculo) tableLines.push(row('Veiculo', String(payload.veiculo), W))
  if (payload.cliente) tableLines.push(row('Cliente', String(payload.cliente), W))
  if (Number(payload.valor_total)) tableLines.push(row('Valor', fmtR$(Number(payload.valor_total)), W))

  const text = [
    `${icon} <b>OS Atualizada</b>`,
    '',
    pre(tableLines),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

async function handleOSConcluida(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const tableLines = [row('Numero', String(payload.numero), W)]
  if (payload.veiculo) tableLines.push(row('Veiculo', String(payload.veiculo), W))
  tableLines.push(
    row('Valor',     fmtR$(Number(payload.valor || 0)), W),
    row('Pagamento', String(payload.forma_pagamento || '—'), W),
  )

  const text = [
    `✅ <b>OS Concluída</b>`,
    '',
    pre(tableLines),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

// ── Reservas ───────────────────────────────────────────────────────────────

async function handleNovaReserva(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const dias = payload.dias ? `${payload.dias} dia${Number(payload.dias) !== 1 ? 's' : ''}` : '—'

  const text = [
    `🏨 <b>Nova Reserva</b>`,
    '',
    pre([
      row('Hospede',   String(payload.hospede   || '—'), W),
      row('Quarto',    String(payload.quarto    || '—'), W),
      row('Check-in',  String(payload.check_in  || '—'), W),
      row('Check-out', String(payload.check_out || '—'), W),
      row('Dias',      dias,                             W),
      divider(W),
      row('Total', fmtR$(Number(payload.valor_total || 0)), W),
    ]),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

async function handleReservaAtualizada(userId: string, payload: Record<string, unknown>) {
  const STATUS_LABEL: Record<string, string> = {
    confirmada: 'Confirmada', checkin: 'Check-in',
    checkout: 'Check-out', cancelada: 'Cancelada',
  }
  const STATUS_ICON: Record<string, string> = {
    confirmada: '📋', checkin: '🔑', checkout: '🚪', cancelada: '❌',
  }
  const statusNovo = String(payload.status_novo || '')
  const icon       = STATUS_ICON[statusNovo] || '🏨'
  const label      = STATUS_LABEL[statusNovo] || statusNovo
  const W = 26

  const tableLines = [
    row('Hospede', String(payload.hospede || '—'), W),
    row('Quarto',  String(payload.quarto  || '—'), W),
    row('Status',  label,                          W),
  ]
  if (payload.check_in)  tableLines.push(row('Check-in',  String(payload.check_in),  W))
  if (payload.check_out) tableLines.push(row('Check-out', String(payload.check_out), W))

  const text = [
    `${icon} <b>Reserva Atualizada</b>`,
    '',
    pre(tableLines),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

async function handleReservaRecebida(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const text = [
    `🏨 <b>Reserva Recebida</b>`,
    '',
    pre([
      row('Hospede',   String(payload.hospede   || '—'), W),
      row('Quarto',    String(payload.quarto    || '—'), W),
      row('Valor',     fmtR$(Number(payload.valor || 0)), W),
      row('Pagamento', String(payload.forma_pagamento || '—'), W),
    ]),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

// ── Bar ────────────────────────────────────────────────────────────────────

async function handleComandaFechada(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const numItens = Number(payload.num_itens || 0)

  const text = [
    `🍽️ <b>Comanda Fechada</b>`,
    '',
    pre([
      row('Mesa',  String(payload.mesa      || '—'), W),
      row('Itens', `${numItens} item${numItens !== 1 ? 's' : ''}`, W),
      divider(W),
      row('Total', fmtR$(Number(payload.total || 0)), W),
    ]),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

// ── Crediário ──────────────────────────────────────────────────────────────

async function handleParcelaPaga(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const parcela = `${payload.parcela_num}/${payload.total_parcelas}`

  const text = [
    `💳 <b>Parcela Recebida</b>`,
    '',
    pre([
      row('Cliente', String(payload.cliente || '—'), W),
      row('Parcela', parcela,                        W),
      row('Valor',   fmtR$(Number(payload.valor || 0)), W),
    ]),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

// ── Cadastros ──────────────────────────────────────────────────────────────

async function handleNovoCliente(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const tableLines = [row('Nome', String(payload.nome || '—'), W)]
  if (payload.telefone) tableLines.push(row('Telefone', String(payload.telefone), W))
  if (payload.cidade)   tableLines.push(row('Cidade',   String(payload.cidade),   W))

  const text = [
    `👤 <b>Novo Cliente</b>`,
    '',
    pre(tableLines),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

async function handleNovoProduto(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const text = [
    `📦 <b>Novo Produto</b>`,
    '',
    pre([
      row('Nome',      String(payload.nome      || '—'), W),
      row('Categoria', String(payload.categoria || '—'), W),
      row('Estoque',   `${payload.quantidade} un`,       W),
      row('Preco',     fmtR$(Number(payload.preco_venda || 0)), W),
    ]),
    `🕐 ${timeStr()}`,
  ].join('\n')

  await broadcast(userId, text)
}

// ── Estoque Baixo / Resumo ─────────────────────────────────────────────────

async function handleEstoqueBaixo(userId: string, payload: Record<string, unknown>) {
  const W = 26
  const text = [
    `⚠️ <b>Estoque Baixo!</b>`,
    '',
    pre([
      row('Produto',  String(payload.nome),              W),
      row('Qtd atual', `${payload.quantidade} un`,       W),
      row('Minimo',    `${payload.estoque_minimo} un`,   W),
    ]),
  ].join('\n')

  await broadcast(userId, text)
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
      db.from('caixas').select('status').eq('user_id', userId).eq('data', today).maybeSingle(),
      db.from('ordens_servico').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).in('status', ['aberta', 'em_andamento']),
      db.rpc('get_parcelas_vencidas_usuario', { p_user_id: userId }),
      db.from('reservas').select('nome_hospede')
        .eq('user_id', userId).eq('check_out', today).in('status', ['confirmada', 'checkin']),
    ])

    const caixaStatus = caixa
      ? (caixa.status === 'aberto' ? 'Aberto' : 'Fechado')
      : 'Nao aberto'

    const W = 26
    const lines: string[] = [
      `🌅 <b>Bom dia! ${dateStr}</b>`,
      '',
      pre([
        row('Caixa',            caixaStatus,                    W),
        row('Check-outs hoje',  String(checkouts?.length ?? 0), W),
        row('OS em aberto',     String(osCount ?? 0),           W),
        row('Parcelas vencidas',String((parcelas as unknown[])?.length ?? 0), W),
      ]),
    ]

    if (checkouts?.length) {
      lines.push('<b>Saidas de hoje:</b>')
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

    if      (type === 'caixa_aberto')       await handleCaixaAberto(uid, payload)
    else if (type === 'caixa_fechado')      await handleCaixaFechado(uid, payload)
    else if (type === 'caixa_reaberto')     await handleCaixaReaberto(uid, payload)
    else if (type === 'nova_venda')         await handleNovaVenda(uid, payload)
    else if (type === 'nova_os')            await handleNovaOS(uid, payload)
    else if (type === 'os_atualizada')      await handleOsAtualizada(uid, payload)
    else if (type === 'os_concluida')       await handleOSConcluida(uid, payload)
    else if (type === 'nova_reserva')       await handleNovaReserva(uid, payload)
    else if (type === 'reserva_atualizada') await handleReservaAtualizada(uid, payload)
    else if (type === 'reserva_recebida')   await handleReservaRecebida(uid, payload)
    else if (type === 'comanda_fechada')    await handleComandaFechada(uid, payload)
    else if (type === 'parcela_paga')       await handleParcelaPaga(uid, payload)
    else if (type === 'novo_cliente')       await handleNovoCliente(uid, payload)
    else if (type === 'novo_produto')       await handleNovoProduto(uid, payload)
    else if (type === 'estoque_baixo')      await handleEstoqueBaixo(uid, payload)
    else if (type === 'resumo_matinal')     await handleResumoMatinal()
  } catch (err) {
    console.error('telegram-notify error:', err)
  }

  return new Response('OK', { headers: CORS })
})
