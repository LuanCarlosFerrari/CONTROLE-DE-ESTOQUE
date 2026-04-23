import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'
import { Plus, Pencil, Trash2, Users, Mail, Phone, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Label from '../../components/ui/FormLabel'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmModal from '../../components/ui/ConfirmModal'

const EMPTY = { nome: '', email: '', telefone: '', endereco: '', cidade: '' }


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
  const { toast, showToast, clearToast } = useToast()
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
    if (error) return showToast(error.message, 'error')
    showToast(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
    setModal(false)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('clientes').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return showToast(error.message, 'error')
    showToast('Cliente removido.')
    load()
  }

  const filtered = clientes.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ width: "100%" }} className="animate-fade-in page-content">
      <PageHeader
        title="Clientes"
        accent="#3B82F6"
        subtitle={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} cadastrado${clientes.length !== 1 ? 's' : ''}`}
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={15} /> Novo cliente</button>}
      />

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nome, email ou cidade..." resultCount={filtered.length} style={{ marginBottom: 20 }} />

      {/* Table */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden', flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'} subtitle={search ? `Sem resultados para "${search}"` : 'Adicione seu primeiro cliente'} />
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
                          <a
                            href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                            target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-subtle)', fontSize: 13, textDecoration: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#25D366'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
                          >
                            <Phone size={12} />{c.telefone}
                          </a>
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
        <ConfirmModal title="Excluir cliente" message="Esta ação não pode ser desfeita." onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
