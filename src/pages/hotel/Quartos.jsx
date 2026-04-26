import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'
import { formatCurrency as fmt } from '../../utils/format'
import { Plus, Search, Pencil, Trash2, BedDouble, Users, ShoppingBag, X, Receipt, Calendar, Clock, Minus, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Label from '../../components/ui/FormLabel'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmModal from '../../components/ui/ConfirmModal'
import StatCard from '../../components/ui/StatCard'

const EMPTY = { numero: '', tipo: 'casal', capacidade: 2, preco_diaria: 0, descricao: '', status: 'disponivel' }

const TIPOS = {
  solteiro: 'Solteiro',
  casal: 'Casal',
  duplo: 'Duplo',
  suite: 'Suíte',
  familia: 'Família',
}


function StatusBadge({ status }) {
  const cfg = {
    disponivel: { label: 'Disponível', color: '#34D399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
    ocupado:    { label: 'Ocupado',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)' },
    manutencao: { label: 'Manutenção', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  }
  const c = cfg[status] || cfg.disponivel
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px' }}>
      {c.label}
    </span>
  )
}


export default function Quartos() {
  const { user } = useAuth()
  const [quartos, setQuartos] = useState([])
  const [ocupados, setOcupados] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { toast, showToast, clearToast } = useToast()
  const [deleteId, setDeleteId] = useState(null)

  // Comanda do quarto
  const [comandaQuarto, setComandaQuarto] = useState(null) // quarto selecionado
  const [reservaAtiva, setReservaAtiva]   = useState(null) // reserva em checkin do quarto
  const [consumos, setConsumos]           = useState([])   // consumos já lançados
  const [produtos, setProdutos]           = useState([])
  const [consumoDesc, setConsumoDesc]     = useState('')
  const [consumoQtd, setConsumoQtd]       = useState(1)
  const [consumoPreco, setConsumoPreco]   = useState('')
  const [consumoProdId, setConsumoProdId] = useState('')
  const [savingConsumo, setSavingConsumo] = useState(false)

  const load = useCallback(async () => {
    const hoje = new Date().toISOString().split('T')[0]
    const [{ data: q }, { data: r }] = await Promise.all([
      supabase.from('quartos').select('*').eq('user_id', user.id).order('numero'),
      supabase.from('reservas')
        .select('quarto_id')
        .eq('user_id', user.id)
        .eq('status', 'checkin')
        .lte('check_in', hoje)
        .gte('check_out', hoje),
    ])
    setQuartos(q || [])
    setOcupados(new Set((r || []).map(r => r.quarto_id)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const getStatusReal = (q) => {
    if (q.status === 'manutencao') return 'manutencao'
    if (ocupados.has(q.id)) return 'ocupado'
    return 'disponivel'
  }

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal('form') }
  const openEdit = (q) => { setForm({ ...q }); setEditing(q.id); setModal('form') }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, capacidade: Number(form.capacidade), preco_diaria: Number(form.preco_diaria) }
    const { error } = editing
      ? await supabase.from('quartos').update(payload).eq('id', editing)
      : await supabase.from('quartos').insert({ ...payload, user_id: user.id })
    setSaving(false)
    if (error) return showToast(error.message, 'error')
    showToast(editing ? 'Quarto atualizado!' : 'Quarto cadastrado!')
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('quartos').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return showToast(error.message, 'error')
    showToast('Quarto removido.')
    load()
  }

  const openComanda = async (q) => {
    setComandaQuarto(q)
    setConsumoDesc(''); setConsumoQtd(1); setConsumoPreco(''); setConsumoProdId('')
    const hoje = new Date().toISOString().split('T')[0]
    const [{ data: res }, { data: prods }, ] = await Promise.all([
      supabase.from('reservas').select('id, nome_hospede, check_in, check_out, valor_total, valor_pago')
        .eq('quarto_id', q.id).eq('user_id', user.id).eq('status', 'checkin').lte('check_in', hoje).gte('check_out', hoje).maybeSingle(),
      supabase.from('produtos').select('id, nome, preco_venda').eq('user_id', user.id).order('nome'),
    ])
    setReservaAtiva(res || null)
    setProdutos(prods || [])
    if (res) {
      const { data: cons } = await supabase.from('reserva_consumos')
        .select('*').eq('reserva_id', res.id).order('created_at', { ascending: false })
      setConsumos(cons || [])
    } else {
      setConsumos([])
    }
  }

  const handleAddConsumo = async (e) => {
    e.preventDefault()
    if (!reservaAtiva) return
    const preco = Number(consumoPreco)
    if (!consumoDesc.trim() || !preco || preco <= 0) return
    setSavingConsumo(true)
    const { error } = await supabase.from('reserva_consumos').insert({
      reserva_id: reservaAtiva.id,
      descricao: consumoDesc.trim(),
      quantidade: Number(consumoQtd),
      preco_unitario: preco,
    })
    setSavingConsumo(false)
    if (error) return showToast(error.message, 'error')
    setConsumoDesc(''); setConsumoQtd(1); setConsumoPreco(''); setConsumoProdId('')
    const { data: cons } = await supabase.from('reserva_consumos')
      .select('*').eq('reserva_id', reservaAtiva.id).order('created_at', { ascending: false })
    setConsumos(cons || [])
    showToast('Consumo adicionado à comanda!')
  }

  const handleDeleteConsumo = async (id) => {
    await supabase.from('reserva_consumos').delete().eq('id', id)
    setConsumos(c => c.filter(x => x.id !== id))
  }

  const quartosComStatus = quartos.map(q => ({ ...q, statusReal: getStatusReal(q) }))

  const filtered = quartosComStatus.filter(q => {
    const matchStatus = filterStatus === 'todos' || q.statusReal === filterStatus
    const q2 = search.toLowerCase()
    const matchSearch = !q2 || q.numero?.toLowerCase().includes(q2) || q.tipo?.toLowerCase().includes(q2)
    return matchStatus && matchSearch
  })

  const counts = {
    todos: quartosComStatus.length,
    disponivel: quartosComStatus.filter(q => q.statusReal === 'disponivel').length,
    ocupado: quartosComStatus.filter(q => q.statusReal === 'ocupado').length,
    manutencao: quartosComStatus.filter(q => q.statusReal === 'manutencao').length,
  }

  return (
    <div style={{ width: "100%", height: "100%" }} className="animate-fade-in page-content">
      <PageHeader
        title="Quartos"
        subtitle={`${quartos.length} quarto${quartos.length !== 1 ? 's' : ''} cadastrado${quartos.length !== 1 ? 's' : ''}`}
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={15} /> Novo quarto</button>}
      />

      {/* Stats rápidas */}
      <div className="stats-grid-3" style={{ marginBottom: 20 }}>
        {[
          { key: 'disponivel', label: 'Disponíveis', sublabel: 'agora'  },
          { key: 'ocupado',    label: 'Ocupados',    sublabel: 'agora'  },
          { key: 'manutencao', label: 'Manutenção',  sublabel: 'status' },
        ].map(({ key, label, sublabel }) => (
          <StatCard key={key} label={label} sublabel={sublabel} value={counts[key]}
            color="var(--amber)" border="rgba(16,185,129,0.3)" glow="rgba(16,185,129,0.06)" />
        ))}
      </div>

      {/* Filtros + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['todos', 'Todos'], ['disponivel', 'Disponíveis'], ['ocupado', 'Ocupados'], ['manutencao', 'Manutenção']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterStatus(val)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filterStatus === val ? 'var(--amber)' : 'var(--bg-700)',
              color: filterStatus === val ? '#000' : 'var(--text-muted)',
              border: filterStatus === val ? '1px solid transparent' : '1px solid var(--bg-500)',
              transition: 'all 0.15s',
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar número ou tipo..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, fontSize: 13 }} />
        </div>
      </div>

      {/* Grid de quartos */}
      {loading ? (
        <div className="quartos-grid">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BedDouble} title={search || filterStatus !== 'todos' ? 'Nenhum quarto encontrado' : 'Nenhum quarto cadastrado'} subtitle={search || filterStatus !== 'todos' ? 'Tente outros filtros' : 'Cadastre o primeiro quarto'} card />
      ) : (
        <div className="quartos-grid">
          {filtered.map(q => {
            const statusColor = q.statusReal === 'disponivel' ? '#34D399' : q.statusReal === 'ocupado' ? '#60A5FA' : '#F59E0B'
            return (
              <div key={q.id} style={{
                background: 'linear-gradient(135deg, var(--bg-700) 0%, rgba(16,185,129,0.06) 100%)',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s', height: '100%', boxSizing: 'border-box',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(16,185,129,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: statusColor, borderRadius: '14px 14px 0 0', opacity: 0.8 }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
                      {q.numero}
                    </p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-subtle)', marginTop: 3 }}>{TIPOS[q.tipo] || q.tipo}</p>
                  </div>
                  <StatusBadge status={q.statusReal} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                    <Users size={12} />{q.capacidade} pessoa{q.capacidade !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
                    R$ {fmt(q.preco_diaria)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-subtle)' }}>/noite</span>
                  </span>
                </div>

                {q.descricao && (
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {q.descricao}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--bg-600)' }}>
                  {q.statusReal === 'ocupado' && (
                    <button onClick={() => openComanda(q)} style={{ flex: 1, padding: '7px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, cursor: 'pointer', color: 'var(--amber)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)' }}
                    ><ShoppingBag size={12} /> Comanda</button>
                  )}
                  <button onClick={() => openEdit(q)} style={{ flex: 1, padding: '7px', background: 'var(--bg-700)', border: '1px solid var(--bg-500)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--bg-500)' }}
                  ><Pencil size={12} /> Editar</button>
                  <button onClick={() => setDeleteId(q.id)} style={{ width: 34, padding: '7px', background: 'var(--bg-700)', border: '1px solid var(--bg-500)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--bg-500)' }}
                  ><Trash2 size={12} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal === 'form' && (
        <Modal title={editing ? 'Editar quarto' : 'Novo quarto'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Label required>Número / Nome</Label>
                <input className="input-field" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} required placeholder="101, Suite A..." autoFocus />
              </div>
              <div>
                <Label required>Tipo</Label>
                <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {Object.entries(TIPOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label>Capacidade</Label>
                <input className="input-field" type="number" min="1" max="20" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} />
              </div>
              <div>
                <Label>Preço / noite</Label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.preco_diaria} onChange={e => setForm(f => ({ ...f, preco_diaria: e.target.value }))} style={{ paddingLeft: 38 }} />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Descrição</Label>
                <textarea className="input-field" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Comodidades, vista, características..." rows={2} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Status manual</Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['disponivel', 'Disponível'], ['manutencao', 'Manutenção']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, status: v }))} style={{
                      flex: 1, padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      background: form.status === v ? (v === 'disponivel' ? 'rgba(52,211,153,0.15)' : 'rgba(245,158,11,0.15)') : 'var(--bg-700)',
                      color: form.status === v ? (v === 'disponivel' ? '#34D399' : '#F59E0B') : 'var(--text-muted)',
                      border: `1px solid ${form.status === v ? (v === 'disponivel' ? 'rgba(52,211,153,0.3)' : 'rgba(245,158,11,0.3)') : 'var(--bg-500)'}`,
                      transition: 'all 0.15s',
                    }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bg-600)' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar quarto'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmModal title="Excluir quarto" message="Esta ação não pode ser desfeita." onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
      )}

      {/* Painel Comanda */}
      {comandaQuarto && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => e.target === e.currentTarget && setComandaQuarto(null)}
        >
          <div style={{ width: '100%', maxWidth: 500, background: 'var(--bg-900)', borderLeft: '1px solid var(--bg-600)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* Header do painel */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--bg-800)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={18} color="var(--amber)" />
                </div>
                <div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
                    Comanda — Quarto {comandaQuarto.numero}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{TIPOS[comandaQuarto.tipo] || comandaQuarto.tipo}</p>
                </div>
              </div>
              <button onClick={() => setComandaQuarto(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--bg-500)' }}
              ><X size={15} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Info da reserva */}
              {reservaAtiva ? (() => {
                const ci = new Date(reservaAtiva.check_in + 'T12:00:00')
                const co = new Date(reservaAtiva.check_out + 'T12:00:00')
                const nights = Math.max(1, Math.round((co - ci) / 86400000))
                const fmtDate = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                const totalConsumos = consumos.reduce((s, c) => s + (c.quantidade * c.preco_unitario), 0)
                const totalGeral = (reservaAtiva.valor_total || 0) + totalConsumos

                return (
                  <>
                    {/* Card do hóspede */}
                    <div style={{ background: 'linear-gradient(135deg, var(--bg-700) 0%, rgba(16,185,129,0.06) 100%)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 10 }}>Hóspede</p>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{reservaAtiva.nome_hospede}</p>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                          <Calendar size={12} /> {fmtDate(ci)} → {fmtDate(co)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                          <Clock size={12} /> {nights} noite{nights !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Adicionar consumo */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 12 }}>Adicionar item</p>
                      <form onSubmit={handleAddConsumo} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {produtos.length > 0 && (
                          <select className="input-field" value={consumoProdId} onChange={e => {
                            const pid = e.target.value
                            setConsumoProdId(pid)
                            if (pid) {
                              const p = produtos.find(x => x.id === pid)
                              if (p) { setConsumoDesc(p.nome); setConsumoPreco(String(p.preco_venda)) }
                            } else {
                              setConsumoDesc(''); setConsumoPreco('')
                            }
                          }} style={{ fontSize: 13 }}>
                            <option value="">— Selecionar produto do estoque —</option>
                            {produtos.map(p => (
                              <option key={p.id} value={p.id}>{p.nome} — R$ {fmt(p.preco_venda)}</option>
                            ))}
                          </select>
                        )}
                        <input className="input-field" placeholder="Descrição do item *" value={consumoDesc} onChange={e => { setConsumoDesc(e.target.value); setConsumoProdId('') }} style={{ fontSize: 13 }} required />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 5 }}>Quantidade</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button type="button" onClick={() => setConsumoQtd(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}><Minus size={12} /></button>
                              <input className="input-field" type="number" min="1" value={consumoQtd} onChange={e => setConsumoQtd(Math.max(1, Number(e.target.value)))} style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, padding: '6px 8px' }} />
                              <button type="button" onClick={() => setConsumoQtd(q => q + 1)} style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}><Plus size={12} /></button>
                            </div>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 5 }}>Preço unitário</p>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                              <input className="input-field" type="number" min="0" step="0.01" value={consumoPreco} onChange={e => setConsumoPreco(e.target.value)} style={{ paddingLeft: 34, fontSize: 13 }} required placeholder="0,00" />
                            </div>
                          </div>
                        </div>
                        {consumoPreco && consumoQtd && (
                          <p style={{ fontSize: 12, color: 'var(--text-subtle)', textAlign: 'right' }}>
                            Subtotal: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--amber)', fontWeight: 600 }}>R$ {fmt(Number(consumoPreco) * consumoQtd)}</span>
                          </p>
                        )}
                        <button type="submit" className="btn-primary" disabled={savingConsumo} style={{ justifyContent: 'center' }}>
                          {savingConsumo ? 'Adicionando...' : <><Plus size={14} /> Adicionar à comanda</>}
                        </button>
                      </form>
                    </div>

                    {/* Lista de consumos */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 12 }}>
                        Itens lançados {consumos.length > 0 && <span style={{ color: 'var(--amber)' }}>({consumos.length})</span>}
                      </p>
                      {consumos.length === 0 ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>Nenhum item lançado ainda.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {consumos.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-800)', border: '1px solid var(--bg-600)', borderRadius: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.descricao}</p>
                                <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>
                                  {c.quantidade}x R$ {fmt(c.preco_unitario)}
                                </p>
                              </div>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--amber)', flexShrink: 0 }}>
                                R$ {fmt(c.quantidade * c.preco_unitario)}
                              </span>
                              <button onClick={() => handleDeleteConsumo(c.id)} style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', transition: 'all 0.15s', flexShrink: 0 }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                              ><Trash2 size={13} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resumo financeiro */}
                    <div style={{ background: 'linear-gradient(135deg, var(--bg-700) 0%, rgba(16,185,129,0.06) 100%)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16, marginTop: 'auto' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 14 }}>Resumo</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hospedagem ({nights} noite{nights !== 1 ? 's' : ''})</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text)' }}>R$ {fmt(reservaAtiva.valor_total || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Consumos ({consumos.length} item{consumos.length !== 1 ? 's' : ''})</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text)' }}>R$ {fmt(totalConsumos)}</span>
                        </div>
                        {(reservaAtiva.valor_pago || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Já pago</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#34D399' }}>− R$ {fmt(reservaAtiva.valor_pago)}</span>
                          </div>
                        )}
                        <div style={{ borderTop: '1px solid var(--bg-500)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Total</span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--amber)' }}>
                            R$ {fmt(totalGeral - (reservaAtiva.valor_pago || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })() : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={24} color="var(--bg-400)" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>Nenhuma reserva ativa</p>
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Este quarto não possui check-in registrado.</p>
                </div>
              )}
            </div>

            {/* Footer com botão imprimir */}
            {reservaAtiva && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-600)', background: 'var(--bg-800)', flexShrink: 0 }}>
                <button onClick={() => window.print()} style={{ width: '100%', padding: '10px', background: 'var(--bg-700)', border: '1px solid var(--bg-500)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--bg-500)' }}
                ><Printer size={14} /> Imprimir comanda</button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
