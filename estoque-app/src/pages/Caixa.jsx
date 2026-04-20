import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Search, ShoppingCart, X, ChevronDown, Receipt,
  Package, ArrowUpCircle, ArrowDownCircle, Lock, Unlock,
  Wallet, TrendingUp, TrendingDown, DollarSign,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

function fmt(val) { return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

const FORMAS = ['dinheiro', 'pix', 'cartao', 'outros']
const FORMA_LABEL = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outros' }

export default function Caixa() {
  const today = new Date().toISOString().split('T')[0]

  // Caixa do dia
  const [caixa, setCaixa]           = useState(null)
  const [loadingCaixa, setLoadingCaixa] = useState(true)

  // Movimentações do dia
  const [vendas, setVendas]         = useState([])
  const [extras, setExtras]         = useState([])
  const [loading, setLoading]       = useState(true)

  // UI
  const [search, setSearch]         = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [modal, setModal]           = useState(null) // 'venda' | 'entrada' | 'saida' | 'abrir' | 'fechar'
  const [toast, setToast]           = useState(null)

  // Form — nova venda
  const [clientes, setClientes]     = useState([])
  const [produtos, setProdutos]     = useState([])
  const [clienteId, setClienteId]   = useState('')
  const [observacao, setObservacao] = useState('')
  const [formaVenda, setFormaVenda] = useState('dinheiro')
  const [itens, setItens]           = useState([{ produto_id: '', quantidade: 1, preco_unitario: 0 }])

  // Form — movimentação extra
  const [extDescricao, setExtDescricao] = useState('')
  const [extValor, setExtValor]         = useState('')
  const [extForma, setExtForma]         = useState('dinheiro')

  // Form — abrir caixa
  const [saldoInicial, setSaldoInicial] = useState('0')

  // Form — fechar caixa
  const [saldoContado, setSaldoContado] = useState('')
  const [obsFechar, setObsFechar]       = useState('')

  const [saving, setSaving] = useState(false)

  /* ── Carregamento ─────────────────────────────────────── */
  const loadCaixa = useCallback(async () => {
    setLoadingCaixa(true)
    const { data } = await supabase
      .from('caixas')
      .select('*')
      .eq('data', today)
      .maybeSingle()
    setCaixa(data || null)
    setLoadingCaixa(false)
  }, [today])

  const loadMovimentacoes = useCallback(async () => {
    setLoading(true)
    const start = `${today}T00:00:00`
    const end   = `${today}T23:59:59`
    const [{ data: v }, { data: e }] = await Promise.all([
      supabase.from('vendas')
        .select('*, clientes(nome), venda_itens(*, produtos(nome))')
        .gte('created_at', start).lte('created_at', end)
        .order('created_at', { ascending: false }),
      supabase.from('movimentacoes_extras')
        .select('*')
        .gte('created_at', start).lte('created_at', end)
        .order('created_at', { ascending: false }),
    ])
    setVendas(v || [])
    setExtras(e || [])
    setLoading(false)
  }, [today])

  const loadOptions = useCallback(async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('produtos').select('id, nome, preco_venda, quantidade').order('nome'),
    ])
    setClientes(c || [])
    setProdutos(p || [])
  }, [])

  useEffect(() => {
    loadCaixa()
    loadMovimentacoes()
    loadOptions()
  }, [loadCaixa, loadMovimentacoes, loadOptions])

  /* ── Cálculos ─────────────────────────────────────────── */
  const totalVendas   = vendas.reduce((s, v) => s + Number(v.total), 0)
  const totalEntradas = extras.filter(e => e.tipo === 'entrada').reduce((s, e) => s + Number(e.valor), 0)
  const totalSaidas   = extras.filter(e => e.tipo === 'saida').reduce((s, e) => s + Number(e.valor), 0)
  const saldoEsperado = Number(caixa?.saldo_inicial || 0) + totalVendas + totalEntradas - totalSaidas

  /* ── Abrir caixa ──────────────────────────────────────── */
  const handleAbrirCaixa = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase.from('caixas')
      .insert({ data: today, saldo_inicial: Number(saldoInicial), status: 'aberto' })
      .select().single()
    setSaving(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setCaixa(data)
    setModal(null)
    setToast({ msg: 'Caixa aberto!', type: 'success' })
  }

  /* ── Fechar caixa ─────────────────────────────────────── */
  const handleFecharCaixa = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('caixas')
      .update({ status: 'fechado', saldo_final: Number(saldoContado), observacoes: obsFechar, fechado_at: new Date().toISOString() })
      .eq('id', caixa.id)
    setSaving(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    loadCaixa()
    setModal(null)
    setToast({ msg: 'Caixa fechado com sucesso!', type: 'success' })
  }

  /* ── Nova venda ───────────────────────────────────────── */
  const addItem    = () => setItens(i => [...i, { produto_id: '', quantidade: 1, preco_unitario: 0 }])
  const removeItem = (idx) => setItens(i => i.filter((_, j) => j !== idx))
  const updateItem = (idx, field, value) => {
    setItens(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'produto_id') {
        const prod = produtos.find(p => p.id === value)
        updated.preco_unitario = prod?.preco_venda || 0
      }
      return updated
    }))
  }
  const totalVenda = itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.preco_unitario), 0)

  const handleSaveVenda = async (e) => {
    e.preventDefault()
    if (!clienteId) return setToast({ msg: 'Selecione um cliente.', type: 'error' })
    const validItens = itens.filter(i => i.produto_id && Number(i.quantidade) > 0)
    if (validItens.length === 0) return setToast({ msg: 'Adicione pelo menos um produto.', type: 'error' })
    setSaving(true)
    const { data: venda, error: errV } = await supabase.from('vendas')
      .insert({ cliente_id: clienteId, total: totalVenda, observacao, forma_pagamento: formaVenda })
      .select().single()
    if (errV) { setSaving(false); return setToast({ msg: errV.message, type: 'error' }) }
    const { error: errI } = await supabase.from('venda_itens').insert(
      validItens.map(i => ({ venda_id: venda.id, produto_id: i.produto_id, quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario) }))
    )
    if (errI) { setSaving(false); return setToast({ msg: errI.message, type: 'error' }) }
    for (const item of validItens) {
      const prod = produtos.find(p => p.id === item.produto_id)
      if (prod) await supabase.from('produtos').update({ quantidade: Math.max(0, prod.quantidade - Number(item.quantidade)) }).eq('id', item.produto_id)
    }
    setSaving(false)
    setModal(null)
    setClienteId(''); setObservacao(''); setFormaVenda('dinheiro')
    setItens([{ produto_id: '', quantidade: 1, preco_unitario: 0 }])
    setToast({ msg: 'Venda registrada!', type: 'success' })
    loadMovimentacoes(); loadOptions()
  }

  /* ── Movimentação extra ───────────────────────────────── */
  const handleSaveExtra = async (e) => {
    e.preventDefault()
    if (!extValor || Number(extValor) <= 0) return setToast({ msg: 'Informe um valor válido.', type: 'error' })
    setSaving(true)
    const tipo = modal // 'entrada' ou 'saida'
    const { error } = await supabase.from('movimentacoes_extras').insert({
      caixa_id: caixa?.id || null,
      tipo,
      descricao: extDescricao,
      valor: Number(extValor),
      forma_pagamento: extForma,
    })
    setSaving(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setModal(null)
    setExtDescricao(''); setExtValor(''); setExtForma('dinheiro')
    setToast({ msg: tipo === 'entrada' ? 'Entrada registrada!' : 'Saída registrada!', type: 'success' })
    loadMovimentacoes()
  }

  /* ── Lista unificada ──────────────────────────────────── */
  const allMovs = [
    ...vendas.map(v => ({ ...v, _tipo: 'venda' })),
    ...extras.map(e => ({ ...e, _tipo: e.tipo })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const filtered = allMovs.filter(m => {
    const q = search.toLowerCase()
    if (m._tipo === 'venda') return m.clientes?.nome?.toLowerCase().includes(q) || String(m.id).includes(q)
    return m.descricao?.toLowerCase().includes(q)
  })

  const caixaAberto  = caixa?.status === 'aberto'
  const caixaFechado = caixa?.status === 'fechado'
  const semCaixa     = !caixa

  return (
    <div style={{ maxWidth: 1200 }} className="animate-fade-in page-content">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Caixa</h1>
            {!loadingCaixa && (
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '3px 10px', borderRadius: 20,
                background: caixaAberto ? 'rgba(16,185,129,0.12)' : caixaFechado ? 'rgba(239,68,68,0.1)' : 'var(--bg-600)',
                color: caixaAberto ? 'var(--amber)' : caixaFechado ? '#F87171' : 'var(--text-subtle)',
                border: `1px solid ${caixaAberto ? 'rgba(16,185,129,0.25)' : caixaFechado ? 'rgba(239,68,68,0.2)' : 'var(--bg-500)'}`,
              }}>
                {caixaAberto ? 'Aberto' : caixaFechado ? 'Fechado' : 'Não iniciado'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 15 }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {semCaixa && (
            <button className="btn-primary" onClick={() => setModal('abrir')}>
              <Unlock size={15} /> Abrir caixa
            </button>
          )}
          {caixaAberto && (
            <button className="btn-secondary" onClick={() => { setSaldoContado(''); setObsFechar(''); setModal('fechar') }}
              style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#F87171' }}>
              <Lock size={15} /> Fechar caixa
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Saldo atual',  value: `R$ ${fmt(saldoEsperado)}`,  icon: Wallet,        sub: `Inicial: R$ ${fmt(caixa?.saldo_inicial)}` },
          { label: 'Vendas hoje',  value: `R$ ${fmt(totalVendas)}`,    icon: ShoppingCart,  sub: `${vendas.length} venda${vendas.length !== 1 ? 's' : ''}` },
          { label: 'Entradas',     value: `R$ ${fmt(totalEntradas)}`,  icon: TrendingUp,    sub: `${extras.filter(e => e.tipo === 'entrada').length} lançamentos` },
          { label: 'Saídas',       value: `R$ ${fmt(totalSaidas)}`,    icon: TrendingDown,  sub: `${extras.filter(e => e.tipo === 'saida').length} lançamentos` },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} style={{
            background: 'linear-gradient(135deg, var(--bg-700) 0%, rgba(16,185,129,0.04) 100%)',
            border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color="var(--amber)" />
              </div>
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>{value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Action buttons + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {caixaAberto && (<>
          <button className="btn-primary" onClick={() => { setClienteId(''); setObservacao(''); setFormaVenda('dinheiro'); setItens([{ produto_id: '', quantidade: 1, preco_unitario: 0 }]); setModal('venda') }}>
            <ShoppingCart size={14} /> Nova venda
          </button>
          <button className="btn-secondary" onClick={() => { setExtDescricao(''); setExtValor(''); setExtForma('dinheiro'); setModal('entrada') }}
            style={{ color: 'var(--amber)', borderColor: 'rgba(16,185,129,0.3)' }}>
            <ArrowUpCircle size={14} /> Entrada
          </button>
          <button className="btn-secondary" onClick={() => { setExtDescricao(''); setExtValor(''); setExtForma('dinheiro'); setModal('saida') }}
            style={{ color: '#F87171', borderColor: 'rgba(239,68,68,0.25)' }}>
            <ArrowDownCircle size={14} /> Saída
          </button>
        </>)}

        <div style={{ position: 'relative', flex: 1, maxWidth: 380, marginLeft: caixaAberto ? 'auto' : 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar movimentação..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38, fontSize: 13 }} />
        </div>
      </div>

      {/* Lista de movimentações */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <DollarSign size={28} color="var(--bg-400)" />
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              {semCaixa ? 'Caixa não aberto' : search ? 'Nenhum resultado' : 'Sem movimentações hoje'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
              {semCaixa ? 'Abra o caixa para começar a registrar' : search ? `Sem resultados para "${search}"` : 'Registre sua primeira venda ou movimentação'}
            </p>
          </div>
        ) : (
          filtered.map((mov, idx) => {
            const isVenda    = mov._tipo === 'venda'
            const isEntrada  = mov._tipo === 'entrada'
            const isSaida    = mov._tipo === 'saida'
            const isOpen     = expanded === mov.id
            const valor      = isVenda ? mov.total : mov.valor
            const valorColor = isSaida ? '#F87171' : 'var(--amber)'
            const sinal      = isSaida ? '-' : '+'
            const hora       = new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            const forma      = FORMA_LABEL[mov.forma_pagamento] || '—'

            return (
              <div key={mov.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--bg-600)' : 'none' }}>
                <div
                  onClick={() => isVenda ? setExpanded(isOpen ? null : mov.id) : null}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: isVenda ? 'pointer' : 'default', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (isVenda) e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isVenda ? 'rgba(16,185,129,0.08)' : isEntrada ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${isVenda ? 'rgba(16,185,129,0.15)' : isEntrada ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                    }}>
                      {isVenda   ? <Receipt size={16} color="var(--amber)" /> :
                       isEntrada ? <ArrowUpCircle size={16} color="var(--amber)" /> :
                                   <ArrowDownCircle size={16} color="#F87171" />}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                        {isVenda ? (mov.clientes?.nome || '—') : mov.descricao}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)', background: 'var(--bg-600)', borderRadius: 4, padding: '1px 6px' }}>
                          {isVenda ? 'Venda' : isEntrada ? 'Entrada' : 'Saída'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{forma}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{hora}</span>
                        {isVenda && <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{mov.venda_itens?.length || 0} item(s)</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: valorColor }}>
                      {sinal} R$ {fmt(valor)}
                    </span>
                    {isVenda && (
                      <ChevronDown size={14} color="var(--text-subtle)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    )}
                  </div>
                </div>

                {/* Expandido: itens da venda */}
                {isVenda && isOpen && (
                  <div style={{ padding: '14px 20px 18px', borderTop: '1px solid var(--bg-600)', background: 'rgba(0,0,0,0.12)' }}>
                    {mov.observacao && (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>"{mov.observacao}"</p>
                    )}
                    <div style={{ background: 'var(--bg-800)', borderRadius: 10, border: '1px solid var(--bg-500)', overflow: 'hidden' }}>
                      {(mov.venda_itens || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < (mov.venda_itens?.length - 1) ? '1px solid var(--bg-600)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={11} color="var(--text-subtle)" />
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{item.produtos?.nome || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {item.quantidade}× R$ {fmt(item.preco_unitario)}
                            </span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 80, textAlign: 'right' }}>
                              R$ {fmt(item.quantidade * item.preco_unitario)}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', background: 'rgba(16,185,129,0.04)', borderTop: '1px solid rgba(16,185,129,0.1)' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 16 }}>Total</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 800, color: 'var(--amber)' }}>R$ {fmt(mov.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Rodapé: fechamento se caixa fechado */}
      {caixaFechado && caixa.saldo_final != null && (
        <div style={{ marginTop: 20, background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: '20px 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 16 }}>Resumo de fechamento</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Saldo esperado', value: fmt(saldoEsperado) },
              { label: 'Saldo contado',  value: fmt(caixa.saldo_final) },
              { label: 'Diferença',      value: fmt(caixa.saldo_final - saldoEsperado), diff: true },
            ].map(({ label, value, diff }) => {
              const dif = Number(caixa.saldo_final) - saldoEsperado
              const color = diff ? (Math.abs(dif) < 0.01 ? 'var(--amber)' : dif < 0 ? '#F87171' : '#34D399') : 'var(--text)'
              return (
                <div key={label} style={{ textAlign: 'center', padding: '14px', background: 'var(--bg-700)', borderRadius: 10, border: '1px solid var(--bg-600)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color }}>{diff && dif > 0 ? '+' : ''}R$ {value}</p>
                </div>
              )
            })}
          </div>
          {caixa.observacoes && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 14, fontStyle: 'italic' }}>"{caixa.observacoes}"</p>
          )}
        </div>
      )}

      {/* ── Modais ───────────────────────────────────────── */}

      {/* Abrir caixa */}
      {modal === 'abrir' && (
        <Modal title="Abrir caixa" onClose={() => setModal(null)}>
          <form onSubmit={handleAbrirCaixa}>
            <div style={{ marginBottom: 24 }}>
              <Label>Saldo inicial (dinheiro em caixa)</Label>
              <input className="input-field" type="number" min="0" step="0.01"
                value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, monospace' }} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Abrindo...' : 'Abrir caixa'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Fechar caixa */}
      {modal === 'fechar' && (
        <Modal title="Fechar caixa" onClose={() => setModal(null)}>
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 4 }}>Saldo esperado</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>R$ {fmt(saldoEsperado)}</p>
          </div>
          <form onSubmit={handleFecharCaixa}>
            <div style={{ marginBottom: 16 }}>
              <Label required>Saldo contado em caixa</Label>
              <input className="input-field" type="number" min="0" step="0.01" required
                value={saldoContado} onChange={e => setSaldoContado(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, monospace' }} autoFocus />
              {saldoContado !== '' && (
                <p style={{ fontSize: 12, marginTop: 6, color: Math.abs(Number(saldoContado) - saldoEsperado) < 0.01 ? 'var(--amber)' : Number(saldoContado) < saldoEsperado ? '#F87171' : '#34D399' }}>
                  Diferença: {Number(saldoContado) > saldoEsperado ? '+' : ''}R$ {fmt(Number(saldoContado) - saldoEsperado)}
                </p>
              )}
            </div>
            <div style={{ marginBottom: 24 }}>
              <Label>Observações</Label>
              <input className="input-field" value={obsFechar} onChange={e => setObsFechar(e.target.value)} placeholder="Nota de fechamento..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving || saldoContado === ''} style={{ background: '#EF4444' }}>
                {saving ? 'Fechando...' : 'Confirmar fechamento'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Nova venda */}
      {modal === 'venda' && (
        <Modal title="Registrar venda" onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSaveVenda}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Label required>Cliente</Label>
                <select className="input-field" value={clienteId} onChange={e => setClienteId(e.target.value)} required>
                  <option value="">Selecionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <select className="input-field" value={formaVenda} onChange={e => setFormaVenda(e.target.value)}>
                  {FORMAS.map(f => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Observação</Label>
              <input className="input-field" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Nota opcional..." />
            </div>

            <div style={{ background: 'var(--bg-700)', borderRadius: 10, border: '1px solid var(--bg-500)', padding: '16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Produtos</p>
                <button type="button" className="btn-secondary" onClick={addItem} style={{ padding: '5px 12px', fontSize: 12 }}>
                  <Plus size={12} /> Adicionar
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 32px', gap: 4, marginBottom: 6 }}>
                {['Produto', 'Qtd.', 'Preço unit.', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '0 4px' }}>{h}</div>
                ))}
              </div>
              {itens.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 32px', gap: 4, marginBottom: 6, alignItems: 'center' }}>
                  <select className="input-field" value={item.produto_id} onChange={e => updateItem(idx, 'produto_id', e.target.value)} style={{ fontSize: 13 }}>
                    <option value="">Selecionar...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.quantidade} em estq.)</option>)}
                  </select>
                  <input className="input-field" type="number" min="1" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', e.target.value)} style={{ fontSize: 13, textAlign: 'center' }} />
                  <input className="input-field" type="number" min="0" step="0.01" value={item.preco_unitario} onChange={e => updateItem(idx, 'preco_unitario', e.target.value)} style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }} />
                  <button type="button" onClick={() => removeItem(idx)}
                    style={{ width: 30, height: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none' }}
                  ><X size={13} /></button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 2 }}>Total da venda</p>
                <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{itens.filter(i => i.produto_id).length} produto(s)</p>
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--amber)', letterSpacing: '-0.02em' }}>R$ {fmt(totalVenda)}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar venda'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Entrada / Saída */}
      {(modal === 'entrada' || modal === 'saida') && (
        <Modal
          title={modal === 'entrada' ? 'Registrar entrada' : 'Registrar saída'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSaveExtra}>
            <div style={{ marginBottom: 16 }}>
              <Label required>Descrição</Label>
              <input className="input-field" required value={extDescricao} onChange={e => setExtDescricao(e.target.value)}
                placeholder={modal === 'entrada' ? 'Ex: PIX recebido, devolução...' : 'Ex: Compra de embalagens, energia...'} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <Label required>Valor (R$)</Label>
                <input className="input-field" type="number" min="0.01" step="0.01" required
                  value={extValor} onChange={e => setExtValor(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <div>
                <Label>Forma</Label>
                <select className="input-field" value={extForma} onChange={e => setExtForma(e.target.value)}>
                  {FORMAS.map(f => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}
                style={modal === 'saida' ? { background: '#EF4444' } : {}}>
                {saving ? 'Salvando...' : modal === 'entrada' ? 'Registrar entrada' : 'Registrar saída'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
