import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TOKEN  = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TG_API = `https://api.telegram.org/bot${TOKEN}`

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ── Telegram helpers ───────────────────────────────────────────────

interface InlineButton { text: string; callback_data: string }

async function send(chatId: number, text: string, keyboard?: InlineButton[][]) {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' }
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard }
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function answerCallback(id: string) {
  await fetch(`${TG_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id }),
  })
}

// ── Menus ──────────────────────────────────────────────────────────

const MAIN_KEYBOARD: InlineButton[][] = [
  [
    { text: '💰 Resumo do caixa',   callback_data: 'caixa'    },
    { text: '📦 Estoque baixo',     callback_data: 'estoque'  },
  ],
  [
    { text: '📋 Parcelas vencidas', callback_data: 'parcelas' },
    { text: '🔧 OS em aberto',      callback_data: 'os'       },
  ],
  [
    { text: '🏨 Check-outs hoje',   callback_data: 'checkout' },
  ],
]

async function sendMainMenu(chatId: number, intro?: string) {
  await send(chatId, intro ?? 'O que deseja consultar?', MAIN_KEYBOARD)
}

// ── Session ────────────────────────────────────────────────────────

async function getSession(chatId: number) {
  const { data } = await db
    .from('bot_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle()

  if (!data) {
    const { data: created } = await db
      .from('bot_sessions')
      .insert({ chat_id: chatId, state: 'UNLINKED' })
      .select()
      .single()
    return created
  }
  return data
}

async function updateSession(chatId: number, fields: Record<string, unknown>) {
  await db
    .from('bot_sessions')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId)
}

// ── Formatters ─────────────────────────────────────────────────────

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Data queries ───────────────────────────────────────────────────

async function queryCaixa(userId: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const start = `${today}T00:00:00`
  const end   = `${today}T23:59:59`

  const [{ data: caixa }, { data: vendas }, { data: extras }] = await Promise.all([
    db.from('caixas').select('saldo_inicial, status').eq('user_id', userId).eq('data', today).maybeSingle(),
    db.from('vendas').select('total').gte('created_at', start).lte('created_at', end),
    db.from('movimentacoes_extras').select('tipo, valor').gte('created_at', start).lte('created_at', end),
  ])

  if (!caixa) return '⚠️ Nenhum caixa aberto hoje.'

  const totalVendas = (vendas  || []).reduce((s, v) => s + Number(v.total), 0)
  const entradas    = (extras  || []).filter(e => e.tipo === 'entrada').reduce((s, e) => s + Number(e.valor), 0)
  const saidas      = (extras  || []).filter(e => e.tipo === 'saida')  .reduce((s, e) => s + Number(e.valor), 0)
  const saldo       = Number(caixa.saldo_inicial || 0) + totalVendas + entradas - saidas

  return [
    '💰 <b>Resumo do caixa — hoje</b>',
    '',
    `Saldo inicial:  R$ ${fmt(Number(caixa.saldo_inicial || 0))}`,
    `Vendas:         R$ ${fmt(totalVendas)}`,
    `Entradas:       R$ ${fmt(entradas)}`,
    `Saídas:         R$ ${fmt(saidas)}`,
    '',
    `<b>Saldo atual:   R$ ${fmt(saldo)}</b>`,
    `Status: ${caixa.status === 'aberto' ? '🟢 Aberto' : '🔴 Fechado'}`,
  ].join('\n')
}

async function queryEstoque(): Promise<string> {
  const { data } = await db
    .from('produtos')
    .select('nome, quantidade, estoque_minimo')
    .not('estoque_minimo', 'is', null)
    .order('nome')

  const baixo = (data || []).filter(p => Number(p.quantidade) <= Number(p.estoque_minimo))

  if (!baixo.length) return '✅ Nenhum produto com estoque baixo.'

  const lines = baixo.map(p => `• <b>${p.nome}</b> — ${p.quantidade} un (mín: ${p.estoque_minimo})`)
  return [`📦 <b>Estoque baixo (${baixo.length})</b>`, '', ...lines].join('\n')
}

async function queryParcelas(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await db
    .from('parcelas_crediario')
    .select('cliente_nome, valor, data_vencimento, numero, total_parcelas')
    .eq('status', 'pendente')
    .lte('data_vencimento', today)
    .order('data_vencimento')
    .limit(15)

  if (!data?.length) return '✅ Nenhuma parcela vencida.'

  const lines = (data || []).map(p => {
    const dias = Math.floor((new Date(today).getTime() - new Date(p.data_vencimento + 'T12:00:00').getTime()) / 86400000)
    return `• <b>${p.cliente_nome}</b> — R$ ${fmt(Number(p.valor))} · ${p.numero}/${p.total_parcelas} (${dias}d)`
  })

  return [`📋 <b>Parcelas vencidas (${data.length})</b>`, '', ...lines].join('\n')
}

async function queryOS(): Promise<string> {
  const { data } = await db
    .from('ordens_servico')
    .select('numero, status, veiculos(placa, modelo)')
    .in('status', ['aberta', 'em_andamento'])
    .order('created_at', { ascending: false })
    .limit(10)

  if (!data?.length) return '✅ Nenhuma OS em aberto.'

  const lines = (data || []).map(o => {
    const icon  = o.status === 'em_andamento' ? '🔄' : '🔧'
    const veiculo = (o as any).veiculos
    const info  = veiculo ? `${veiculo.placa} · ${veiculo.modelo}` : ''
    return `${icon} <b>${o.numero}</b>${info ? ` — ${info}` : ''}`
  })

  return [`🔧 <b>OS em aberto (${data.length})</b>`, '', ...lines].join('\n')
}

async function queryVendasDia(userId: string, date: string): Promise<string> {
  const start = `${date}T00:00:00`
  const end   = `${date}T23:59:59`

  const { data } = await db
    .from('vendas')
    .select('total, forma_pagamento, clientes(nome), venda_itens(quantidade, preco_unitario, produtos(nome))')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at')

  const vendas = data || []
  if (!vendas.length) return '🛒 Nenhuma venda registrada neste dia.'

  const FORMA: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outros', crediario: 'Crediário' }
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const total = vendas.reduce((s, v) => s + Number(v.total), 0)

  const lines: string[] = [`🛒 <b>Vendas — ${dateLabel} (${vendas.length})</b>`, '']

  for (const v of vendas) {
    const cliente = (v as any).clientes?.nome || '—'
    const forma   = FORMA[(v as any).forma_pagamento] || (v as any).forma_pagamento || '—'
    lines.push(`<b>${cliente}</b> — R$ ${fmt(Number(v.total))} · ${forma}`)
    const itens: any[] = (v as any).venda_itens || []
    for (const i of itens) {
      const nome = i.produtos?.nome || '?'
      lines.push(`   ↳ ${i.quantidade}× ${nome} — R$ ${fmt(Number(i.preco_unitario))}`)
    }
  }

  lines.push('', `─────────────────────────`, `💰 <b>Total: R$ ${fmt(total)}</b>`)
  return lines.join('\n')
}

async function queryCheckout(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await db
    .from('reservas')
    .select('nome_hospede, valor_total, quartos(numero)')
    .eq('check_out', today)
    .in('status', ['confirmada', 'checkin'])
    .order('created_at')

  if (!data?.length) return '✅ Nenhum check-out previsto para hoje.'

  const lines = (data || []).map(r => {
    const qto = (r as any).quartos?.numero ? `Qto ${(r as any).quartos.numero}` : ''
    return `• <b>${r.nome_hospede}</b> ${qto ? `· ${qto} ` : ''}— R$ ${fmt(Number(r.valor_total))}`
  })

  return [`🏨 <b>Check-outs hoje (${data.length})</b>`, '', ...lines].join('\n')
}

// ── Flow handlers ──────────────────────────────────────────────────

async function handleTokenLink(chatId: number, token: string) {
  const { data, error } = await db
    .from('telegram_link_tokens')
    .select('user_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) {
    await send(chatId, '❌ Link inválido. Gere um novo link nas Configurações do StockTag.')
    return
  }

  if (data.used_at) {
    await send(chatId, '❌ Este link já foi utilizado. Gere um novo nas Configurações.')
    return
  }

  if (new Date(data.expires_at) < new Date()) {
    await send(chatId, '❌ Link expirado. Gere um novo nas Configurações.')
    return
  }

  await db
    .from('telegram_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  await getSession(chatId)
  await updateSession(chatId, { user_id: data.user_id, state: 'MAIN_MENU' })

  const { data: sub } = await db
    .from('subscriptions')
    .select('business_name')
    .eq('user_id', data.user_id)
    .maybeSingle()

  const nome = sub?.business_name || 'gestor'

  await send(chatId, `✅ <b>Conta vinculada com sucesso!</b>\n\nBem-vindo, <b>${nome}</b>! 🎉`)
  await sendMainMenu(chatId)
}

async function handleNotLinked(chatId: number) {
  await send(chatId,
    '👋 Olá! Para usar este bot, acesse as <b>Configurações</b> no StockTag e clique em <b>"Conectar no Telegram"</b>.'
  )
}

async function handleAction(chatId: number, action: string, userId: string) {
  if (action.startsWith('vendas_dia:')) {
    const date = action.slice('vendas_dia:'.length)
    const text = await queryVendasDia(userId, date)
    await send(chatId, text)
    return
  }

  let text = ''
  if      (action === 'caixa')    text = await queryCaixa(userId)
  else if (action === 'estoque')  text = await queryEstoque()
  else if (action === 'parcelas') text = await queryParcelas()
  else if (action === 'os')       text = await queryOS()
  else if (action === 'checkout') text = await queryCheckout()

  await send(chatId, text)
  await sendMainMenu(chatId, '<i>Deseja consultar mais alguma coisa?</i>')
}

// ── Main ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') return new Response('OK')

  try {
    const update = await req.json()

    // ── Botão pressionado ──
    if (update.callback_query) {
      const { id, from, data: action } = update.callback_query
      const chatId = Number(from.id)

      await answerCallback(id)

      const session = await getSession(chatId)
      if (!session?.user_id) {
        await handleNotLinked(chatId)
        return new Response('OK')
      }

      await handleAction(chatId, action, session.user_id)
      return new Response('OK')
    }

    // ── Mensagem de texto ──
    if (update.message?.text) {
      const chatId = Number(update.message.chat.id)
      const text   = update.message.text.trim()

      // /start com token de vinculação
      if (text.startsWith('/start ')) {
        const token = text.slice(7).trim()
        await handleTokenLink(chatId, token)
        return new Response('OK')
      }

      const session = await getSession(chatId)

      if (!session?.user_id) {
        await handleNotLinked(chatId)
        return new Response('OK')
      }

      // Já vinculado — qualquer mensagem mostra o menu
      await sendMainMenu(chatId, `👋 Olá! O que deseja consultar?`)
    }
  } catch (err) {
    console.error('Bot error:', err)
  }

  return new Response('OK')
})
