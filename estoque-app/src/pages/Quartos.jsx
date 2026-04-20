import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, BedDouble, Users, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY = { numero: '', tipo: 'casal', capacidade: 2, preco_diaria: 0, descricao: '', status: 'disponivel' }

const TIPOS = {
  solteiro: 'Solteiro',
  casal: 'Casal',
  duplo: 'Duplo',
  suite: 'Suíte',
  familia: 'Família',
}

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

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

function fmt(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

export default function Quartos() {
  const [quartos, setQuartos] = useState([])
  const [ocupados, setOcupados] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    const hoje = new Date().toISOString().split('T')[0]
    const [{ data: q }, { data: r }] = await Promise.all([
      supabase.from('quartos').select('*').order('numero'),
      supabase.from('reservas')
        .select('quarto_id')
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
      : await supabase.from('quartos').insert(payload)
    setSaving(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: editing ? 'Quarto atualizado!' : 'Quarto cadastrado!', type: 'success' })
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('quartos').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: 'Quarto removido.', type: 'success' })
    load()
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
    <div style={{ width: "100%" }} className="animate-fade-in page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Quartos</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 15 }}>
            {quartos.length} quarto{quartos.length !== 1 ? 's' : ''} cadastrado{quartos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Novo quarto</button>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { key: 'disponivel', label: 'Disponíveis', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
          { key: 'ocupado',    label: 'Ocupados',    color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
          { key: 'manutencao', label: 'Manutenção',  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
        ].map(({ key, label, color, bg, border }) => (
          <div key={key} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 28, fontWeight: 700, color }}>{counts[key]}</span>
          </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '72px 32px', textAlign: 'center', background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BedDouble size={28} color="var(--bg-400)" />
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            {search || filterStatus !== 'todos' ? 'Nenhum quarto encontrado' : 'Nenhum quarto cadastrado'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
            {search || filterStatus !== 'todos' ? 'Tente outros filtros' : 'Cadastre o primeiro quarto'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {filtered.map(q => {
            const statusColor = q.statusReal === 'disponivel' ? '#34D399' : q.statusReal === 'ocupado' ? '#60A5FA' : '#F59E0B'
            return (
              <div key={q.id} style={{
                background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = statusColor + '50'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-500)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: statusColor, borderRadius: '14px 14px 0 0', opacity: 0.8 }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
                      {q.numero}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 3 }}>{TIPOS[q.tipo] || q.tipo}</p>
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
        <Modal title="Excluir quarto" onClose={() => setDeleteId(null)}>
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
