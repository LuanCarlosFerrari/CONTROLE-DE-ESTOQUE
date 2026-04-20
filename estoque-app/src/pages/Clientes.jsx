import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'

const EMPTY = { nome: '', email: '', telefone: '', endereco: '', cidade: '' }

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

function Avatar({ nome }) {
  const initials = nome ? nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'
  const colors = ['#10B981','#3B82F6','#6366F1','#8B5CF6','#EC4899','#F97316']
  const color = colors[nome?.charCodeAt(0) % colors.length] || colors[0]
  return (
    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'DM Sans, sans-serif' }}>{initials}</span>
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit = (c) => { setForm({ ...c }); setEditing(c.id); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = editing
      ? await supabase.from('clientes').update(form).eq('id', editing)
      : await supabase.from('clientes').insert(form)
    setSaving(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: editing ? 'Cliente atualizado!' : 'Cliente cadastrado!', type: 'success' })
    setModal(false)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('clientes').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: 'Cliente removido.', type: 'success' })
    load()
  }

  const filtered = clientes.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1200 }} className="animate-fade-in page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: '#3B82F6', borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Clientes</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 15 }}>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Novo cliente</button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar por nome, email ou cidade..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38, fontSize: 13 }} />
        </div>
        {search && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Users size={28} color="var(--bg-400)" />
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
              {search ? `Sem resultados para "${search}"` : 'Adicione seu primeiro cliente'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Localização</th>
                  <th>Endereço</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar nome={c.nome} />
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{c.nome}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {c.email && (
                          <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, transition: 'color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--amber)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <Mail size={12} />{c.email}
                          </a>
                        )}
                        {c.telefone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-subtle)', fontSize: 13 }}>
                            <Phone size={12} />{c.telefone}
                          </span>
                        )}
                        {!c.email && !c.telefone && <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>—</span>}
                      </div>
                    </td>
                    <td>
                      {c.cidade ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                          <MapPin size={12} color="var(--text-subtle)" />{c.cidade}
                        </span>
                      ) : <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>—</span>}
                    </td>
                    <td><span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>{c.endereco || '—'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(c)} title="Editar" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                        ><Pencil size={13} /></button>
                        <button onClick={() => setDeleteId(c.id)} title="Excluir" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                        ><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={editing ? 'Editar cliente' : 'Novo cliente'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label required>Nome completo</Label>
                <input className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required placeholder="João da Silva" autoFocus />
              </div>
              <div>
                <Label>Email</Label>
                <input className="input-field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@email.com" />
              </div>
              <div>
                <Label>Telefone</Label>
                <input className="input-field" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--bg-600)', margin: '4px 0' }} />
              <div>
                <Label>Cidade</Label>
                <input className="input-field" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="São Paulo" />
              </div>
              <div>
                <Label>Endereço</Label>
                <input className="input-field" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, bairro" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bg-600)' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Excluir cliente" onClose={() => setDeleteId(null)}>
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
