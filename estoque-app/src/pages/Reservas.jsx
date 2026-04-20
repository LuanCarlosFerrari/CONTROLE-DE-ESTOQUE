import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Calendar } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY = {
  quarto_id: '', cliente_id: '', nome_hospede: '', telefone_hospede: '',
  status: 'confirmada', check_in: '', check_out: '',
  valor_diaria: 0, valor_total: 0, valor_pago: 0,
  forma_pagamento: '', observacao: '',
}

const STATUS_CFG = {
  confirmada: { label: 'Confirmada', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
  checkin:    { label: 'Check-in',   color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
  checkout:   { label: 'Check-out',  color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
  cancelada:  { label: 'Cancelada',  color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
}

const PAGAMENTOS = {
  dinheiro: 'Dinheiro', pix: 'Pix',
  cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Débito',
  transferencia: 'Transferência',
}

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.confirmada
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  )
}

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

function fmt(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

function diffDias(a, b) {
  if (!a || !b) return 0
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000))
}

export default function Reservas() {
  const [reservas, setReservas] = useState([])
  const [quartos, setQuartos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [conflito, setConflito] = useState(false)

  const load = useCallback(async () => {
    const [{ data: r }, { data: q }, { data: c }] = await Promise.all([
      supabase.from('reservas')
        .select('*, quartos(numero, tipo), clientes(nome)')
        .order('check_in', { ascending: false }),
      supabase.from('quartos').select('id, numero, tipo, preco_diaria').order('numero'),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    setReservas(r || [])
    setQuartos(q || [])
    setClientes(c || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Recalcula total quando mudam datas, quarto ou valor_diaria
  useEffect(() => {
    const dias = diffDias(form.check_in, form.check_out)
    const total = dias * Number(form.valor_diaria || 0)
    setForm(f => ({ ...f, valor_total: total }))
  }, [form.check_in, form.check_out, form.valor_diaria])

  // Verifica conflito quando muda quarto ou datas
  useEffect(() => {
    if (!form.quarto_id || !form.check_in || !form.check_out) { setConflito(false); return }
    checkConflito(form.quarto_id, form.check_in, form.check_out, editing).then(setConflito)
  }, [form.quarto_id, form.check_in, form.check_out, editing])

  const checkConflito = async (quartoId, checkIn, checkOut, excludeId) => {
    let q = supabase.from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('quarto_id', quartoId)
      .in('status', ['confirmada', 'checkin'])
      .lt('check_in', checkOut)
      .gt('check_out', checkIn)
    if (excludeId) q = q.neq('id', excludeId)
    const { count } = await q
    return (count || 0) > 0
  }

  const onQuartoChange = (quarto_id) => {
    const q = quartos.find(q => q.id === quarto_id)
    setForm(f => ({ ...f, quarto_id, valor_diaria: q?.preco_diaria || 0 }))
  }

  const onClienteChange = (cliente_id) => {
    const c = clientes.find(c => c.id === cliente_id)
    setForm(f => ({ ...f, cliente_id, nome_hospede: c?.nome || f.nome_hospede }))
  }

  const openCreate = () => { setForm(EMPTY); setEditing(null); setConflito(false); setModal('form') }
  const openEdit = (r) => {
    setEditing(r.id)
    setForm({
      quarto_id: r.quarto_id || '',
      cliente_id: r.cliente_id || '',
      nome_hospede: r.nome_hospede || '',
      telefone_hospede: r.telefone_hospede || '',
      status: r.status || 'confirmada',
      check_in: r.check_in || '',
      check_out: r.check_out || '',
      valor_diaria: r.valor_diaria || 0,
      valor_total: r.valor_total || 0,
      valor_pago: r.valor_pago || 0,
      forma_pagamento: r.forma_pagamento || '',
      observacao: r.observacao || '',
    })
    setConflito(false)
    setModal('form')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (conflito) return setToast({ msg: 'Quarto já reservado neste período!', type: 'error' })
    setSaving(true)
    const payload = {
      quarto_id: form.quarto_id || null,
      cliente_id: form.cliente_id || null,
      nome_hospede: form.nome_hospede,
      telefone_hospede: form.telefone_hospede || null,
      status: form.status,
      check_in: form.check_in,
      check_out: form.check_out,
      valor_diaria: Number(form.valor_diaria) || 0,
      valor_total: Number(form.valor_total) || 0,
      valor_pago: Number(form.valor_pago) || 0,
      forma_pagamento: form.forma_pagamento || null,
      observacao: form.observacao || null,
    }
    const { error } = editing
      ? await supabase.from('reservas').update(payload).eq('id', editing)
      : await supabase.from('reservas').insert(payload)
    setSaving(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: editing ? 'Reserva atualizada!' : 'Reserva criada!', type: 'success' })
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('reservas').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: 'Reserva removida.', type: 'success' })
    load()
  }

  const counts = {
    todos: reservas.length,
    confirmada: reservas.filter(r => r.status === 'confirmada').length,
    checkin: reservas.filter(r => r.status === 'checkin').length,
    checkout: reservas.filter(r => r.status === 'checkout').length,
    cancelada: reservas.filter(r => r.status === 'cancelada').length,
  }

  const filtered = reservas.filter(r => {
    const matchStatus = filterStatus === 'todos' || r.status === filterStatus
    const q = search.toLowerCase()
    const matchSearch = !q ||
      r.nome_hospede?.toLowerCase().includes(q) ||
      r.quartos?.numero?.toLowerCase().includes(q) ||
      r.clientes?.nome?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const dias = diffDias(form.check_in, form.check_out)

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Reservas</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 15 }}>{reservas.length} reserva{reservas.length !== 1 ? 's' : ''} no total</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Nova reserva</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['todos','Todos'],['confirmada','Confirmadas'],['checkin','Check-in'],['checkout','Check-out'],['cancelada','Canceladas']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilterStatus(val)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filterStatus === val ? 'var(--amber)' : 'var(--bg-700)',
            color: filterStatus === val ? '#000' : 'var(--text-muted)',
            border: filterStatus === val ? '1px solid transparent' : '1px solid var(--bg-500)',
            transition: 'all 0.15s',
          }}>
            {lbl} <span style={{ opacity: 0.65 }}>({counts[val]})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar por hóspede, quarto..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38, fontSize: 13 }} />
        </div>
        {search && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>}
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Calendar size={28} color="var(--bg-400)" />
            </div>
            <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              {search || filterStatus !== 'todos' ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva ainda'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
              {search || filterStatus !== 'todos' ? 'Tente outros filtros' : 'Crie a primeira reserva'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hóspede</th>
                  <th>Quarto</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th style={{ textAlign: 'center' }}>Noites</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const noites = diffDias(r.check_in, r.check_out)
                  const hoje = new Date().toISOString().split('T')[0]
                  const checkInHoje = r.check_in === hoje
                  const checkOutHoje = r.check_out === hoje
                  return (
                    <tr key={r.id}>
                      <td>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{r.nome_hospede}</p>
                          {r.telefone_hospede && <p style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{r.telefone_hospede}</p>}
                        </div>
                      </td>
                      <td>
                        {r.quartos ? (
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Quarto {r.quartos.numero}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-subtle)', marginLeft: 6 }}>{r.quartos.tipo}</span>
                          </div>
                        ) : <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>—</span>}
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: checkInHoje ? '#34D399' : 'var(--text-muted)', fontWeight: checkInHoje ? 600 : 400 }}>
                          {new Date(r.check_in + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {checkInHoje && <span style={{ fontSize: 10, marginLeft: 4, color: '#34D399' }}>hoje</span>}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, color: checkOutHoje ? '#F59E0B' : 'var(--text-muted)', fontWeight: checkOutHoje ? 600 : 400 }}>
                          {new Date(r.check_out + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {checkOutHoje && <span style={{ fontSize: 10, marginLeft: 4, color: '#F59E0B' }}>hoje</span>}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>{noites}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}><StatusBadge status={r.status} /></td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        R$ {fmt(r.valor_total)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={() => openEdit(r)} title="Editar" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                          ><Pencil size={13} /></button>
                          <button onClick={() => setDeleteId(r.id)} title="Excluir" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                          ><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal === 'form' && (
        <Modal title={editing ? 'Editar reserva' : 'Nova reserva'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            {/* Quarto + Cliente */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Label required>Quarto</Label>
                <select className="input-field" value={form.quarto_id} onChange={e => onQuartoChange(e.target.value)} required>
                  <option value="">Selecione o quarto</option>
                  {quartos.map(q => <option key={q.id} value={q.id}>Quarto {q.numero} ({q.tipo}) — R$ {fmt(q.preco_diaria)}/noite</option>)}
                </select>
              </div>
              <div>
                <Label>Cliente (opcional)</Label>
                <select className="input-field" value={form.cliente_id} onChange={e => onClienteChange(e.target.value)}>
                  <option value="">Hóspede avulso</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <Label required>Nome do hóspede</Label>
                <input className="input-field" value={form.nome_hospede} onChange={e => setForm(f => ({ ...f, nome_hospede: e.target.value }))} required placeholder="Nome completo" />
              </div>
              <div>
                <Label>Telefone</Label>
                <input className="input-field" value={form.telefone_hospede} onChange={e => setForm(f => ({ ...f, telefone_hospede: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--bg-600)', margin: '0 0 16px' }} />

            {/* Datas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Label required>Check-in</Label>
                <input className="input-field" type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} required />
              </div>
              <div>
                <Label required>Check-out</Label>
                <input className="input-field" type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} required min={form.check_in} />
              </div>
            </div>

            {/* Alerta de conflito */}
            {conflito && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>
                ⚠️ Este quarto já possui reserva confirmada neste período.
              </div>
            )}

            {/* Resumo de diárias */}
            {dias > 0 && (
              <div style={{ background: 'var(--bg-700)', border: '1px solid var(--bg-600)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text)' }}>{dias}</span> noite{dias !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>×</span>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.valor_diaria} onChange={e => setForm(f => ({ ...f, valor_diaria: e.target.value }))} style={{ paddingLeft: 34, width: 130, fontSize: 13 }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>=</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--amber)' }}>
                  R$ {fmt(form.valor_total)}
                </span>
              </div>
            )}

            {/* Status + Pagamento */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <Label>Status</Label>
                <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="confirmada">Confirmada</option>
                  <option value="checkin">Check-in realizado</option>
                  <option value="checkout">Check-out realizado</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <select className="input-field" value={form.forma_pagamento} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))}>
                  <option value="">Não informado</option>
                  {Object.entries(PAGAMENTOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Valor pago</Label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.valor_pago} onChange={e => setForm(f => ({ ...f, valor_pago: e.target.value }))} style={{ paddingLeft: 38 }} />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Observação</Label>
                <textarea className="input-field" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Pedidos especiais, observações..." rows={2} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--bg-600)' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving || conflito}>
                {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar reserva'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Excluir reserva" onClose={() => setDeleteId(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#F87171" />
            </div>
            <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, marginBottom: 8 }}>Tem certeza?</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Esta ação não pode ser desfeita.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setDeleteId(null)} style={{ flex: 1 }}>Cancelar</button>
            <button className="btn-danger" onClick={handleDelete} style={{ flex: 1, padding: '10px 20px', justifyContent: 'center' }}>Excluir</button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
