import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'
import { formatCurrency as fmt } from '../../utils/format'
import { Plus, Search, Pencil, Trash2, LayoutGrid, Users, ShoppingBag, X, Receipt, Minus, Printer, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { notifyTelegram } from '../../lib/notify'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Label from '../../components/ui/FormLabel'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmModal from '../../components/ui/ConfirmModal'
import StatCard from '../../components/ui/StatCard'

const EMPTY = { numero: '', tipo: 'salao', capacidade: 4, descricao: '', status: 'disponivel' }

const TIPOS = { salao: 'Salão', varanda: 'Varanda', reservado: 'Reservado', bar: 'Balcão / Bar' }


function StatusBadge({ status }) {
  const cfg = {
    disponivel: { label: 'Disponível', color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
    ocupada:    { label: 'Ocupada',    color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
    reservada:  { label: 'Reservada',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
  }
  const c = cfg[status] || cfg.disponivel
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px' }}>
      {c.label}
    </span>
  )
}


export default function Mesas() {
  const { user } = useAuth()
  const [mesas, setMesas]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const { toast, showToast, clearToast } = useToast()
  const [deleteId, setDeleteId]   = useState(null)

  // Comanda
  const [comandaMesa, setComandaMesa]   = useState(null)
  const [itens, setItens]               = useState([])
  const [produtos, setProdutos]         = useState([])
  const [itemDesc, setItemDesc]         = useState('')
  const [itemQtd, setItemQtd]           = useState(1)
  const [itemPreco, setItemPreco]       = useState('')
  const [itemProdId, setItemProdId]     = useState('')
  const [savingItem, setSavingItem]     = useState(false)
  const [fechandoComanda, setFechandoComanda] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('mesas').select('*').eq('user_id', user.id).order('numero')
    setMesas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal('form') }
  const openEdit   = (m) => { setForm({ ...m }); setEditing(m.id); setModal('form') }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, capacidade: Number(form.capacidade) }
    const { error } = editing
      ? await supabase.from('mesas').update(payload).eq('id', editing)
      : await supabase.from('mesas').insert({ ...payload, user_id: user.id })
    setSaving(false)
    if (error) return showToast(error.message, 'error')
    showToast(editing ? 'Mesa atualizada!' : 'Mesa cadastrada!')
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('mesas').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return showToast(error.message, 'error')
    showToast('Mesa removida.')
    load()
  }

  const openComanda = async (m) => {
    setComandaMesa(m)
    setItemDesc(''); setItemQtd(1); setItemPreco(''); setItemProdId('')
    const [{ data: its }, { data: prods }] = await Promise.all([
      supabase.from('comanda_itens').select('*').eq('mesa_id', m.id).order('created_at', { ascending: false }),
      supabase.from('produtos').select('id, nome, preco_venda').order('nome'),
    ])
    setItens(its || [])
    setProdutos(prods || [])
    // Marca mesa como ocupada automaticamente
    if (m.status === 'disponivel') {
      await supabase.from('mesas').update({ status: 'ocupada' }).eq('id', m.id)
      setMesas(prev => prev.map(x => x.id === m.id ? { ...x, status: 'ocupada' } : x))
      setComandaMesa(prev => ({ ...prev, status: 'ocupada' }))
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!comandaMesa) return
    const preco = Number(itemPreco)
    if (!itemDesc.trim() || !preco || preco <= 0) return
    setSavingItem(true)
    const { error } = await supabase.from('comanda_itens').insert({
      mesa_id: comandaMesa.id,
      descricao: itemDesc.trim(),
      quantidade: Number(itemQtd),
      preco_unitario: preco,
    })
    setSavingItem(false)
    if (error) return showToast(error.message, 'error')
    setItemDesc(''); setItemQtd(1); setItemPreco(''); setItemProdId('')
    const { data: its } = await supabase.from('comanda_itens').select('*').eq('mesa_id', comandaMesa.id).order('created_at', { ascending: false })
    setItens(its || [])
    showToast('Item adicionado!')
  }

  const handleDeleteItem = async (id) => {
    await supabase.from('comanda_itens').delete().eq('id', id)
    setItens(prev => prev.filter(x => x.id !== id))
  }

  const handleFecharComanda = async () => {
    if (!comandaMesa) return
    const total = itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.preco_unitario), 0)
    setFechandoComanda(true)
    await supabase.from('comanda_itens').delete().eq('mesa_id', comandaMesa.id)
    await supabase.from('mesas').update({ status: 'disponivel' }).eq('id', comandaMesa.id)
    setFechandoComanda(false)
    notifyTelegram('comanda_fechada', {
      mesa: `Mesa ${comandaMesa.numero}`,
      num_itens: itens.length,
      total,
    })
    setMesas(prev => prev.map(x => x.id === comandaMesa.id ? { ...x, status: 'disponivel' } : x))
    setComandaMesa(null)
    setItens([])
    showToast('Comanda fechada! Mesa liberada.')
  }

  const mesasFiltradas = mesas.filter(m => {
    const matchStatus = filterStatus === 'todos' || m.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch = !q || m.numero?.toLowerCase().includes(q) || m.tipo?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const counts = {
    todos:      mesas.length,
    disponivel: mesas.filter(m => m.status === 'disponivel').length,
    ocupada:    mesas.filter(m => m.status === 'ocupada').length,
    reservada:  mesas.filter(m => m.status === 'reservada').length,
  }

  return (
    <div style={{ width: '100%', height: '100%' }} className="animate-fade-in page-content">

      <PageHeader
        title="Mesas"
        subtitle={`${mesas.length} mesa${mesas.length !== 1 ? 's' : ''} cadastrada${mesas.length !== 1 ? 's' : ''}`}
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={15} /> Nova mesa</button>}
      />

      {/* Stats */}
      <div className="stats-grid-3" style={{ marginBottom: 20 }}>
        {[
          { key: 'disponivel', label: 'Disponíveis', sublabel: 'agora' },
          { key: 'ocupada',    label: 'Ocupadas',    sublabel: 'agora' },
          { key: 'reservada',  label: 'Reservadas',  sublabel: 'status' },
        ].map(({ key, label, sublabel }) => (
          <StatCard key={key} label={label} sublabel={sublabel} value={counts[key]}
            color="var(--amber)" border="rgba(16,185,129,0.3)" glow="rgba(16,185,129,0.06)" />
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['todos', 'Todas'], ['disponivel', 'Disponíveis'], ['ocupada', 'Ocupadas'], ['reservada', 'Reservadas']].map(([val, lbl]) => (
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

      {/* Grid de mesas */}
      {loading ? (
        <div className="quartos-grid">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ borderRadius: 14 }} />)}
        </div>
      ) : mesasFiltradas.length === 0 ? (
        <EmptyState icon={LayoutGrid} title={search || filterStatus !== 'todos' ? 'Nenhuma mesa encontrada' : 'Nenhuma mesa cadastrada'} subtitle={search || filterStatus !== 'todos' ? 'Tente outros filtros' : 'Cadastre a primeira mesa'} card />
      ) : (
        <div className="quartos-grid">
          {mesasFiltradas.map(m => {
            const statusColor = m.status === 'disponivel' ? '#34D399' : m.status === 'ocupada' ? '#60A5FA' : '#F59E0B'
            return (
              <div key={m.id} style={{
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
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{m.numero}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--text-subtle)', marginTop: 3 }}>{TIPOS[m.tipo] || m.tipo}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={12} color="var(--text-subtle)" />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.capacidade} lugar{m.capacidade !== 1 ? 'es' : ''}</span>
                </div>

                {m.descricao && (
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {m.descricao}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--bg-600)' }}>
                  <button onClick={() => openComanda(m)} style={{ flex: 1, padding: '7px', background: m.status === 'ocupada' ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, cursor: 'pointer', color: 'var(--amber)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = m.status === 'ocupada' ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)' }}
                  ><ShoppingBag size={12} /> Comanda</button>
                  <button onClick={() => openEdit(m)} style={{ flex: 1, padding: '7px', background: 'var(--bg-700)', border: '1px solid var(--bg-500)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--bg-500)' }}
                  ><Pencil size={12} /> Editar</button>
                  <button onClick={() => setDeleteId(m.id)} style={{ width: 34, padding: '7px', background: 'var(--bg-700)', border: '1px solid var(--bg-500)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--bg-500)' }}
                  ><Trash2 size={12} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal form */}
      {modal === 'form' && (
        <Modal title={editing ? 'Editar mesa' : 'Nova mesa'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Label required>Número / Nome</Label>
                <input className="input-field" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} required placeholder="1, 2, Varanda A..." autoFocus />
              </div>
              <div>
                <Label required>Tipo / Seção</Label>
                <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {Object.entries(TIPOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label>Capacidade</Label>
                <input className="input-field" type="number" min="1" max="50" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['disponivel', 'Disponível', '#34D399', 'rgba(52,211,153,0.15)', 'rgba(52,211,153,0.3)'],
                    ['reservada',  'Reservada',  '#F59E0B', 'rgba(245,158,11,0.12)', 'rgba(245,158,11,0.3)']].map(([val, lbl, color, bg, border]) => (
                    <button key={val} type="button" onClick={() => setForm(f => ({ ...f, status: val }))} style={{
                      flex: 1, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                      background: form.status === val ? bg : 'var(--bg-700)',
                      color: form.status === val ? color : 'var(--text-muted)',
                      border: `1px solid ${form.status === val ? border : 'var(--bg-500)'}`,
                      transition: 'all 0.15s',
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Observações</Label>
                <textarea className="input-field" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Vista, localização, observações..." rows={2} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bg-600)' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar mesa'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmModal title="Excluir mesa" message="Todos os itens da comanda serão removidos." onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
      )}

      {/* Painel Comanda */}
      {comandaMesa && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
          onClick={e => e.target === e.currentTarget && setComandaMesa(null)}
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
                    Comanda — Mesa {comandaMesa.numero}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2 }}>{TIPOS[comandaMesa.tipo] || comandaMesa.tipo} · {comandaMesa.capacidade} lugares</p>
                </div>
              </div>
              <button onClick={() => setComandaMesa(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--bg-500)' }}
              ><X size={15} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Adicionar item */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 12 }}>Adicionar item</p>
                <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {produtos.length > 0 && (
                    <select className="input-field" value={itemProdId} onChange={e => {
                      const pid = e.target.value
                      setItemProdId(pid)
                      if (pid) {
                        const p = produtos.find(x => x.id === pid)
                        if (p) { setItemDesc(p.nome); setItemPreco(String(p.preco_venda)) }
                      } else {
                        setItemDesc(''); setItemPreco('')
                      }
                    }} style={{ fontSize: 13 }}>
                      <option value="">— Selecionar do cardápio —</option>
                      {produtos.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} — R$ {fmt(p.preco_venda)}</option>
                      ))}
                    </select>
                  )}
                  <input className="input-field" placeholder="Descrição do item *" value={itemDesc} onChange={e => { setItemDesc(e.target.value); setItemProdId('') }} style={{ fontSize: 13 }} required />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 5 }}>Quantidade</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" onClick={() => setItemQtd(q => Math.max(1, q - 1))} style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}><Minus size={12} /></button>
                        <input className="input-field" type="number" min="1" value={itemQtd} onChange={e => setItemQtd(Math.max(1, Number(e.target.value)))} style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, padding: '6px 8px' }} />
                        <button type="button" onClick={() => setItemQtd(q => q + 1)} style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}><Plus size={12} /></button>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 5 }}>Preço unitário</p>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                        <input className="input-field" type="number" min="0" step="0.01" value={itemPreco} onChange={e => setItemPreco(e.target.value)} style={{ paddingLeft: 34, fontSize: 13 }} required placeholder="0,00" />
                      </div>
                    </div>
                  </div>
                  {itemPreco && itemQtd && (
                    <p style={{ fontSize: 12, color: 'var(--text-subtle)', textAlign: 'right' }}>
                      Subtotal: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--amber)', fontWeight: 600 }}>R$ {fmt(Number(itemPreco) * itemQtd)}</span>
                    </p>
                  )}
                  <button type="submit" className="btn-primary" disabled={savingItem} style={{ justifyContent: 'center' }}>
                    {savingItem ? 'Adicionando...' : <><Plus size={14} /> Adicionar à comanda</>}
                  </button>
                </form>
              </div>

              {/* Lista de itens */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 12 }}>
                  Itens na comanda {itens.length > 0 && <span style={{ color: 'var(--amber)' }}>({itens.length})</span>}
                </p>
                {itens.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-subtle)', fontSize: 13 }}>Nenhum item lançado ainda.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {itens.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-800)', border: '1px solid var(--bg-600)', borderRadius: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.descricao}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{item.quantidade}x R$ {fmt(item.preco_unitario)}</p>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--amber)', flexShrink: 0 }}>
                          R$ {fmt(item.quantidade * item.preco_unitario)}
                        </span>
                        <button onClick={() => handleDeleteItem(item.id)} style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', transition: 'all 0.15s', flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                        ><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              {itens.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, var(--bg-700) 0%, rgba(16,185,129,0.06) 100%)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{itens.length} item{itens.length !== 1 ? 's' : ''}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>
                      {itens.reduce((s, i) => s + i.quantidade, 0)} unid.
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bg-500)', paddingTop: 10 }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Total</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: 'var(--amber)' }}>
                      R$ {fmt(itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-600)', background: 'var(--bg-800)', flexShrink: 0, display: 'flex', gap: 10 }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '10px', background: 'var(--bg-700)', border: '1px solid var(--bg-500)', borderRadius: 10, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--bg-500)' }}
              ><Printer size={14} /> Imprimir</button>
              <button onClick={handleFecharComanda} disabled={fechandoComanda} style={{ flex: 1, padding: '10px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, cursor: 'pointer', color: '#34D399', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.1)' }}
              ><CheckCircle size={14} /> {fechandoComanda ? 'Fechando...' : 'Fechar comanda'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
