import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'
import { Plus, Search, Pencil, Trash2, Truck, Mail, Phone, MapPin, Building2, CheckCircle, XCircle } from 'lucide-react'
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

const CATEGORIAS = {
  estoque: ['Alimentação', 'Bebidas', 'Higiene', 'Limpeza', 'Eletrônicos', 'Vestuário', 'Outro'],
  oficina: ['Peças Automotivas', 'Ferramentas', 'Óleo / Lubrificantes', 'Elétrica Automotiva', 'Outro'],
  hotel:   ['Limpeza / Higiene', 'Alimentação', 'Manutenção', 'Amenities', 'Lavanderia', 'Outro'],
  bar:     ['Bebidas', 'Alimentos', 'Descartáveis', 'Limpeza', 'Equipamentos', 'Outro'],
}

const EMPTY = { nome: '', cnpj: '', telefone: '', email: '', categoria: '', cidade: '', observacoes: '', ativo: true }


function Avatar({ nome }) {
  const initials = nome ? nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'
  const colors = ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F97316']
  const color = colors[nome?.charCodeAt(0) % colors.length] || colors[0]
  return (
    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'DM Sans, sans-serif' }}>{initials}</span>
    </div>
  )
}

export default function Fornecedores() {
  const { businessType, user } = useAuth()
  const categorias = CATEGORIAS[businessType] || CATEGORIAS.estoque

  const [fornecedores, setFornecedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('todas')
  const [filterAtivo, setFilterAtivo] = useState('todos')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY, categoria: categorias[0] })
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { toast, showToast, clearToast } = useToast()
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    setFornecedores(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm({ ...EMPTY, categoria: categorias[0] })
    setEditing(null)
    setModal(true)
  }
  const openEdit = (f) => { setForm({ ...f }); setEditing(f.id); setModal(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = editing
      ? await supabase.from('fornecedores').update(form).eq('id', editing)
      : await supabase.from('fornecedores').insert({ ...form, user_id: user.id })
    setSaving(false)
    if (error) return showToast(error.message, 'error')
    showToast(editing ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!')
    setModal(false)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('fornecedores').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return showToast(error.message, 'error')
    showToast('Fornecedor removido.')
    load()
  }

  const filtered = fornecedores.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q || f.nome?.toLowerCase().includes(q) || f.cnpj?.includes(q) || f.cidade?.toLowerCase().includes(q) || f.categoria?.toLowerCase().includes(q)
    const matchCat   = filterCat === 'todas' || f.categoria === filterCat
    const matchAtivo = filterAtivo === 'todos' || (filterAtivo === 'ativos' ? f.ativo : !f.ativo)
    return matchSearch && matchCat && matchAtivo
  })

  const total   = fornecedores.length
  const ativos  = fornecedores.filter(f => f.ativo).length
  const inativos = total - ativos

  return (
    <div style={{ width: '100%' }} className="animate-fade-in page-content">

      <PageHeader
        title="Fornecedores"
        subtitle={`${total} fornecedor${total !== 1 ? 'es' : ''} cadastrado${total !== 1 ? 's' : ''}`}
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={15} /> Novo fornecedor</button>}
      />

      {/* Stats */}
      <div className="stats-grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total',    sublabel: 'cadastrados',   value: total },
          { label: 'Ativos',   sublabel: 'habilitados',   value: ativos },
          { label: 'Inativos', sublabel: 'desabilitados', value: inativos },
        ].map(({ label, sublabel, value }) => (
          <StatCard key={label} label={label} sublabel={sublabel} value={value}
            color="var(--amber)" border="rgba(16,185,129,0.3)" glow="rgba(16,185,129,0.06)" />
        ))}
      </div>

      {/* Filtros + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['todas', 'Todas'], ...categorias.map(c => [c, c])].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterCat(val)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filterCat === val ? 'var(--amber)' : 'var(--bg-700)',
              color: filterCat === val ? '#000' : 'var(--text-muted)',
              border: filterCat === val ? '1px solid transparent' : '1px solid var(--bg-500)',
              transition: 'all 0.15s',
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['todos', 'Todos'], ['ativos', 'Ativos'], ['inativos', 'Inativos']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilterAtivo(val)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filterAtivo === val ? 'var(--bg-500)' : 'var(--bg-700)',
              color: filterAtivo === val ? 'var(--text)' : 'var(--text-muted)',
              border: '1px solid var(--bg-500)', transition: 'all 0.15s',
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar nome, CNPJ, cidade..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, fontSize: 13 }} />
        </div>
        {search && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>}
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden', flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Truck} title={search || filterCat !== 'todas' ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'} subtitle={search || filterCat !== 'todas' ? 'Tente outros filtros' : 'Adicione o primeiro fornecedor'} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Categoria</th>
                  <th>Contato</th>
                  <th>Localização</th>
                  <th>CNPJ / CPF</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar nome={f.nome} />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', lineHeight: 1.2 }}>{f.nome}</p>
                          {f.observacoes && (
                            <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.observacoes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>{f.categoria || '—'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {f.email && (
                          <a href={`mailto:${f.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, transition: 'color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--amber)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                          ><Mail size={12} />{f.email}</a>
                        )}
                        {f.telefone && (
                          <a
                            href={`https://wa.me/55${f.telefone.replace(/\D/g, '')}`}
                            target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-subtle)', fontSize: 13, textDecoration: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#25D366'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-subtle)'}
                          >
                            <Phone size={12} />{f.telefone}
                          </a>
                        )}
                        {!f.email && !f.telefone && <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>—</span>}
                      </div>
                    </td>
                    <td>
                      {f.cidade
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}><MapPin size={12} color="var(--text-subtle)" />{f.cidade}</span>
                        : <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>—</span>}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>{f.cnpj || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {f.ativo
                        ? <span className="badge badge-green" style={{ fontSize: 11 }}><CheckCircle size={10} style={{ display: 'inline', marginRight: 4 }} />Ativo</span>
                        : <span className="badge badge-red" style={{ fontSize: 11 }}><XCircle size={10} style={{ display: 'inline', marginRight: 4 }} />Inativo</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(f)} title="Editar" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                        ><Pencil size={13} /></button>
                        <button onClick={() => setDeleteId(f.id)} title="Excluir" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
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

      {/* Modal form */}
      {modal && (
        <Modal title={editing ? 'Editar fornecedor' : 'Novo fornecedor'} onClose={() => setModal(false)}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label required>Nome / Razão Social</Label>
                <input className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required placeholder="Distribuidora XYZ Ltda" autoFocus />
              </div>
              <div>
                <Label>CNPJ / CPF</Label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input className="input-field" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" style={{ paddingLeft: 34 }} />
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <select className="input-field" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Telefone</Label>
                <div style={{ position: 'relative' }}>
                  <Phone size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input className="input-field" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" style={{ paddingLeft: 34 }} />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <div style={{ position: 'relative' }}>
                  <Mail size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input className="input-field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@fornecedor.com" style={{ paddingLeft: 34 }} />
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--bg-600)', margin: '4px 0' }} />
              <div>
                <Label>Cidade</Label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input className="input-field" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="São Paulo" style={{ paddingLeft: 34 }} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    [true,  'Ativo',   '#34D399', 'rgba(52,211,153,0.15)',  'rgba(52,211,153,0.3)'],
                    [false, 'Inativo', '#F87171', 'rgba(239,68,68,0.1)',    'rgba(239,68,68,0.25)'],
                  ].map(([val, lbl, color, bg, border]) => (
                    <button key={String(val)} type="button" onClick={() => setForm(f => ({ ...f, ativo: val }))} style={{
                      flex: 1, padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      background: form.ativo === val ? bg : 'var(--bg-700)',
                      color: form.ativo === val ? color : 'var(--text-muted)',
                      border: `1px solid ${form.ativo === val ? border : 'var(--bg-500)'}`,
                      transition: 'all 0.15s',
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Observações</Label>
                <textarea className="input-field" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Prazo de entrega, condições, contato preferencial..." rows={2} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bg-600)' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar fornecedor'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmModal title="Excluir fornecedor" message="Esta ação não pode ser desfeita." onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
