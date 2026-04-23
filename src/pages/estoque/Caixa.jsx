import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'
import { formatCurrency as fmt } from '../../utils/format'
import { Search, ShoppingCart, ArrowUpCircle, ArrowDownCircle, Lock, Unlock, Wallet, Wrench, BedDouble } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Label from '../../components/ui/FormLabel'
import { useAuth } from '../../contexts/AuthContext'
import CaixaStats from './caixa/CaixaStats'
import MovimentacaoLista from './caixa/MovimentacaoLista'
import ModalVenda from './caixa/ModalVenda'
import ModalExtra from './caixa/ModalExtra'



const FORMAS = ['dinheiro', 'pix', 'cartao', 'outros']
const FORMA_LABEL = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outros' }

export default function Caixa() {
  const { businessType } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const [caixa, setCaixa]           = useState(null)
  const [loadingCaixa, setLoadingCaixa] = useState(true)
  const [vendas, setVendas]         = useState([])
  const [extras, setExtras]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [clientes, setClientes]     = useState([])
  const [produtos, setProdutos]     = useState([])
  const [ordensAbertas, setOrdensAbertas]     = useState([])
  const [reservasPendentes, setReservasPendentes] = useState([])
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(null)
  const { toast, showToast, clearToast } = useToast()
  const [saving, setSaving]         = useState(false)

  // Fechar caixa
  const [saldoInicial, setSaldoInicial] = useState('0')
  const [saldoContado, setSaldoContado] = useState('')
  const [obsFechar, setObsFechar]       = useState('')

  // Receber OS
  const [osId, setOsId]       = useState('')
  const [osValor, setOsValor] = useState('')
  const [osForma, setOsForma] = useState('dinheiro')
  const [osObs, setOsObs]     = useState('')

  // Receber Reserva
  const [reservaId, setReservaId]       = useState('')
  const [reservaValor, setReservaValor] = useState('')
  const [reservaForma, setReservaForma] = useState('dinheiro')

  /* ── Carregamento ─────────────────────────────────────── */
  const loadCaixa = useCallback(async () => {
    setLoadingCaixa(true)
    const { data } = await supabase.from('caixas').select('*').eq('data', today).maybeSingle()
    setCaixa(data || null)
    setLoadingCaixa(false)
  }, [today])

  const loadMovimentacoes = useCallback(async () => {
    setLoading(true)
    const start = `${today}T00:00:00`
    const end   = `${today}T23:59:59`
    const [{ data: v }, { data: e }] = await Promise.all([
      supabase.from('vendas').select('*, clientes(nome), venda_itens(*, produtos(nome))').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
      supabase.from('movimentacoes_extras').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
    ])
    setVendas(v || [])
    setExtras(e || [])
    setLoading(false)
  }, [today])

  const loadOptions = useCallback(async () => {
    const [{ data: c }, { data: p }, { data: os }, { data: res }] = await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('produtos').select('id, nome, preco_venda, quantidade').order('nome'),
      supabase.from('ordens_servico').select('id, numero, descricao, valor_total, status, veiculos(placa, modelo)').in('status', ['aberta', 'em_andamento']).order('numero'),
      supabase.from('reservas').select('id, nome_hospede, check_in, check_out, valor_total, valor_pago, status, quartos(numero)').in('status', ['confirmada', 'checkin']).order('check_in'),
    ])
    setClientes(c || [])
    setProdutos(p || [])
    setOrdensAbertas(os || [])
    setReservasPendentes(res || [])
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

  const caixaAberto  = caixa?.status === 'aberto'
  const caixaFechado = caixa?.status === 'fechado'
  const semCaixa     = !caixa

  /* ── Ações ────────────────────────────────────────────── */
  const handleAbrirCaixa = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase.from('caixas')
      .insert({ data: today, saldo_inicial: Number(saldoInicial), status: 'aberto' })
      .select().single()
    setSaving(false)
    if (error) return showToast(error.message, 'error')
    setCaixa(data)
    setModal(null)
    showToast('Caixa aberto!')
  }

  const handleFecharCaixa = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('caixas')
      .update({ status: 'fechado', saldo_final: Number(saldoContado), observacoes: obsFechar, fechado_at: new Date().toISOString() })
      .eq('id', caixa.id)
    setSaving(false)
    if (error) return showToast(error.message, 'error')
    loadCaixa()
    setModal(null)
    showToast('Caixa fechado com sucesso!')
  }

  const handleReceberOS = async (e) => {
    e.preventDefault()
    if (!osId) return showToast('Selecione uma OS.', 'error')
    const valor = Number(osValor)
    if (!valor || valor <= 0) return showToast('Informe um valor válido.', 'error')
    const os = ordensAbertas.find(o => o.id === osId)
    setSaving(true)
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('movimentacoes_extras').insert({ caixa_id: caixa?.id || null, tipo: 'entrada', descricao: `OS ${os?.numero || ''} — ${(os?.descricao || '').slice(0, 40)}${osObs ? ` (${osObs})` : ''}`, valor, forma_pagamento: osForma }),
      supabase.from('ordens_servico').update({ status: 'concluida', data_conclusao: new Date().toISOString(), valor_total: valor }).eq('id', osId),
    ])
    setSaving(false)
    if (e1 || e2) return showToast((e1 || e2).message, 'error')
    setModal(null)
    setOsId(''); setOsValor(''); setOsForma('dinheiro'); setOsObs('')
    showToast('OS recebida e concluída!')
    loadMovimentacoes(); loadOptions()
  }

  const handleReceberReserva = async (e) => {
    e.preventDefault()
    if (!reservaId) return showToast('Selecione uma reserva.', 'error')
    const valor = Number(reservaValor)
    if (!valor || valor <= 0) return showToast('Informe um valor válido.', 'error')
    const res = reservasPendentes.find(r => r.id === reservaId)
    setSaving(true)
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('movimentacoes_extras').insert({ caixa_id: caixa?.id || null, tipo: 'entrada', descricao: `Reserva — ${res?.nome_hospede || ''} (Qto ${res?.quartos?.numero || ''})`, valor, forma_pagamento: reservaForma }),
      supabase.from('reservas').update({ valor_pago: Number(res?.valor_pago || 0) + valor, status: 'checkout', forma_pagamento: reservaForma }).eq('id', reservaId),
    ])
    setSaving(false)
    if (e1 || e2) return showToast((e1 || e2).message, 'error')
    setModal(null)
    setReservaId(''); setReservaValor(''); setReservaForma('dinheiro')
    showToast('Reserva recebida e check-out realizado!')
    loadMovimentacoes(); loadOptions()
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

  const openModal = (key, resetFn) => { resetFn?.(); setModal(key) }

  return (
    <div style={{ width: '100%' }} className="animate-fade-in page-content">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Caixa</h1>
            {!loadingCaixa && (
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20,
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
          {semCaixa && <button className="btn-primary" onClick={() => openModal('abrir', () => setSaldoInicial('0'))}><Unlock size={15} /> Abrir caixa</button>}
          {caixaAberto && (
            <button className="btn-secondary" onClick={() => openModal('fechar', () => { setSaldoContado(''); setObsFechar('') })}
              style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#F87171' }}>
              <Lock size={15} /> Fechar caixa
            </button>
          )}
        </div>
      </div>

      <CaixaStats saldoEsperado={saldoEsperado} totalVendas={totalVendas} totalEntradas={totalEntradas} totalSaidas={totalSaidas} vendas={vendas} extras={extras} caixa={caixa} />

      {/* Botões de ação + busca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {caixaAberto && (<>
          {businessType === 'oficina' ? (<>
            <button className="btn-primary" onClick={() => openModal('os', () => { setOsId(''); setOsValor(''); setOsForma('dinheiro'); setOsObs('') })}>
              <Wrench size={14} /> Receber OS
            </button>
            <button className="btn-secondary" onClick={() => setModal('venda')} style={{ color: 'var(--amber)', borderColor: 'rgba(16,185,129,0.3)' }}>
              <ShoppingCart size={14} /> Venda avulsa
            </button>
          </>) : businessType === 'hotel' ? (<>
            <button className="btn-primary" onClick={() => openModal('reserva', () => { setReservaId(''); setReservaValor(''); setReservaForma('dinheiro') })}>
              <BedDouble size={14} /> Receber reserva
            </button>
            <button className="btn-secondary" onClick={() => setModal('venda')} style={{ color: 'var(--amber)', borderColor: 'rgba(16,185,129,0.3)' }}>
              <ShoppingCart size={14} /> Consumo avulso
            </button>
          </>) : (
            <button className="btn-primary" onClick={() => setModal('venda')}>
              <ShoppingCart size={14} /> Nova venda
            </button>
          )}
          <button className="btn-secondary" onClick={() => setModal('entrada')} style={{ color: 'var(--amber)', borderColor: 'rgba(16,185,129,0.3)' }}>
            <ArrowUpCircle size={14} /> Entrada
          </button>
          <button className="btn-secondary" onClick={() => setModal('saida')} style={{ color: '#F87171', borderColor: 'rgba(239,68,68,0.25)' }}>
            <ArrowDownCircle size={14} /> Saída
          </button>
        </>)}
        <div style={{ position: 'relative', flex: 1, maxWidth: 380, marginLeft: caixaAberto ? 'auto' : 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar movimentação..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38, fontSize: 13 }} />
        </div>
      </div>

      {/* Lista */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden', flex: 1, minHeight: 0 }}>
        <MovimentacaoLista filtered={filtered} loading={loading} semCaixa={semCaixa} search={search} />
      </div>

      {/* Rodapé fechamento */}
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
                <div key={label} style={{ textAlign: 'center', padding: 14, background: 'var(--bg-700)', borderRadius: 10, border: '1px solid var(--bg-600)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color }}>{diff && dif > 0 ? '+' : ''}R$ {value}</p>
                </div>
              )
            })}
          </div>
          {caixa.observacoes && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 14, fontStyle: 'italic' }}>"{caixa.observacoes}"</p>}
        </div>
      )}

      {/* Modais — Abrir / Fechar */}
      {modal === 'abrir' && (
        <Modal title="Abrir caixa" onClose={() => setModal(null)}>
          <form onSubmit={handleAbrirCaixa}>
            <div style={{ marginBottom: 24 }}>
              <Label>Saldo inicial (dinheiro em caixa)</Label>
              <input className="input-field" type="number" min="0" step="0.01" value={saldoInicial} onChange={e => setSaldoInicial(e.target.value)} style={{ fontFamily: 'JetBrains Mono, monospace' }} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Abrindo...' : 'Abrir caixa'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'fechar' && (
        <Modal title="Fechar caixa" onClose={() => setModal(null)}>
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 4 }}>Saldo esperado</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>R$ {fmt(saldoEsperado)}</p>
          </div>
          <form onSubmit={handleFecharCaixa}>
            <div style={{ marginBottom: 16 }}>
              <Label required>Saldo contado em caixa</Label>
              <input className="input-field" type="number" min="0" step="0.01" required value={saldoContado} onChange={e => setSaldoContado(e.target.value)} style={{ fontFamily: 'JetBrains Mono, monospace' }} autoFocus />
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

      {/* Modal — Venda */}
      {modal === 'venda' && (
        <ModalVenda
          clientes={clientes} produtos={produtos}
          title={businessType === 'hotel' ? 'Consumo avulso' : businessType === 'oficina' ? 'Venda avulsa' : 'Registrar venda'}
          onClose={() => setModal(null)}
          onSaved={(msg) => { setModal(null); showToast(msg); loadMovimentacoes(); loadOptions() }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Modais — Entrada / Saída */}
      {(modal === 'entrada' || modal === 'saida') && (
        <ModalExtra
          tipo={modal} caixaId={caixa?.id}
          onClose={() => setModal(null)}
          onSaved={(msg) => { setModal(null); showToast(msg); loadMovimentacoes() }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Modal — Receber OS */}
      {modal === 'os' && (
        <Modal title="Receber OS" onClose={() => setModal(null)}>
          <form onSubmit={handleReceberOS}>
            <div style={{ marginBottom: 16 }}>
              <Label required>Ordem de serviço</Label>
              <select className="input-field" value={osId} onChange={e => {
                const sel = ordensAbertas.find(o => o.id === e.target.value)
                setOsId(e.target.value)
                setOsValor(sel ? String(sel.valor_total) : '')
              }} required>
                <option value="">Selecionar OS...</option>
                {ordensAbertas.map(o => (
                  <option key={o.id} value={o.id}>{o.numero} — {o.descricao?.slice(0, 35)} {o.veiculos ? `(${o.veiculos.placa})` : ''}</option>
                ))}
              </select>
              {ordensAbertas.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 6 }}>Nenhuma OS aberta ou em andamento.</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Label required>Valor cobrado (R$)</Label>
                <input className="input-field" type="number" min="0.01" step="0.01" required value={osValor} onChange={e => setOsValor(e.target.value)} style={{ fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <select className="input-field" value={osForma} onChange={e => setOsForma(e.target.value)}>
                  {FORMAS.map(f => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <Label>Observação</Label>
              <input className="input-field" value={osObs} onChange={e => setOsObs(e.target.value)} placeholder="Nota opcional..." />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Receber e concluir OS'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal — Receber Reserva */}
      {modal === 'reserva' && (
        <Modal title="Receber reserva" onClose={() => setModal(null)}>
          <form onSubmit={handleReceberReserva}>
            <div style={{ marginBottom: 16 }}>
              <Label required>Reserva</Label>
              <select className="input-field" value={reservaId} onChange={e => {
                const sel = reservasPendentes.find(r => r.id === e.target.value)
                setReservaId(e.target.value)
                setReservaValor(sel ? String(Number(sel.valor_total) - Number(sel.valor_pago)) : '')
              }} required>
                <option value="">Selecionar reserva...</option>
                {reservasPendentes.map(r => (
                  <option key={r.id} value={r.id}>{r.nome_hospede} — Qto {r.quartos?.numero} ({r.check_in} → {r.check_out})</option>
                ))}
              </select>
              {reservasPendentes.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 6 }}>Nenhuma reserva confirmada ou em check-in.</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <Label required>Valor recebido (R$)</Label>
                <input className="input-field" type="number" min="0.01" step="0.01" required value={reservaValor} onChange={e => setReservaValor(e.target.value)} style={{ fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <select className="input-field" value={reservaForma} onChange={e => setReservaForma(e.target.value)}>
                  {FORMAS.map(f => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Receber e fazer check-out'}</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
