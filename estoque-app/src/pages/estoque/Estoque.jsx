import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, AlertTriangle, Package, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'

const EMPTY = { nome: '', categoria: '', quantidade: 0, preco_custo: 0, preco_venda: 0, estoque_minimo: 5 }
const CATEGORIAS = ['Alimentos', 'Bebidas', 'Eletrônicos', 'Vestuário', 'Limpeza', 'Higiene', 'Papelaria', 'Ferramentas', 'Outros']

function fmt(val) { return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

export default function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    setProdutos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal('form') }
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); setModal('form') }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, quantidade: Number(form.quantidade), preco_custo: Number(form.preco_custo), preco_venda: Number(form.preco_venda), estoque_minimo: Number(form.estoque_minimo) }
    const { error } = editing
      ? await supabase.from('produtos').update(payload).eq('id', editing)
      : await supabase.from('produtos').insert(payload)
    setSaving(false)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: editing ? 'Produto atualizado!' : 'Produto cadastrado!', type: 'success' })
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('produtos').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return setToast({ msg: error.message, type: 'error' })
    setToast({ msg: 'Produto removido.', type: 'success' })
    load()
  }

  const filtered = produtos.filter(p =>
    p.nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  const criticos = produtos.filter(p => p.quantidade <= p.estoque_minimo).length

  return (
    <div style={{ width: "100%" }} className="animate-fade-in page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
            <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Estoque</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 15 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{produtos.length} produtos</span>
            {criticos > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '2px 10px' }}>
                <AlertTriangle size={11} /> {criticos} crítico{criticos > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={15} /> Novo produto
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
          <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input-field" placeholder="Buscar produto ou categoria..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38, fontSize: 13 }} />
        </div>
        {search && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden', flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 6, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '72px 32px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Package size={28} color="var(--bg-400)" />
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              {search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
              {search ? `Sem resultados para "${search}"` : 'Adicione seu primeiro produto'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'right' }}>Qtd. / Mín.</th>
                  <th style={{ textAlign: 'right' }}>Custo</th>
                  <th style={{ textAlign: 'right' }}>Venda</th>
                  <th style={{ textAlign: 'right' }}>Margem</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const margem = p.preco_custo > 0 ? ((p.preco_venda - p.preco_custo) / p.preco_custo * 100).toFixed(1) : 0
                  const critico = p.quantidade <= p.estoque_minimo
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, background: critico ? 'rgba(239,68,68,0.1)' : 'var(--bg-600)', border: `1px solid ${critico ? 'rgba(239,68,68,0.2)' : 'var(--bg-500)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {critico ? <AlertTriangle size={13} color="#F87171" /> : <Package size={13} color="var(--text-subtle)" />}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.nome}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-gray" style={{ fontSize: 11 }}>{p.categoria || '—'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: critico ? '#F87171' : 'var(--text)' }}>{p.quantidade}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-subtle)' }}> /{p.estoque_minimo}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-muted)' }}>R$ {fmt(p.preco_custo)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>R$ {fmt(p.preco_venda)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: Number(margem) >= 30 ? '#34D399' : Number(margem) >= 0 ? 'var(--amber)' : '#F87171' }}>
                          {margem}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${critico ? 'badge-red' : 'badge-green'}`} style={{ fontSize: 11 }}>
                          {critico ? 'Crítico' : 'Normal'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={() => openEdit(p)} title="Editar" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' }}
                          ><Pencil size={13} /></button>
                          <button onClick={() => setDeleteId(p.id)} title="Excluir" style={{ width: 30, height: 30, background: 'none', border: '1px solid transparent', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
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

      {/* Form Modal */}
      {modal === 'form' && (
        <Modal title={editing ? 'Editar produto' : 'Novo produto'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label required>Nome do produto</Label>
                <input className="input-field" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required placeholder="Ex: Notebook Dell Inspiron" autoFocus />
              </div>
              <div>
                <Label>Categoria</Label>
                <select className="input-field" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  <option value="">Sem categoria</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Estoque mínimo</Label>
                <input className="input-field" type="number" min="0" value={form.estoque_minimo} onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--bg-600)', margin: '4px 0' }} />
              <div>
                <Label>Quantidade em estoque</Label>
                <input className="input-field" type="number" min="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div />
              <div>
                <Label>Preço de custo</Label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.preco_custo} onChange={e => setForm(f => ({ ...f, preco_custo: e.target.value }))} style={{ paddingLeft: 38 }} />
                </div>
              </div>
              <div>
                <Label>Preço de venda</Label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>R$</span>
                  <input className="input-field" type="number" min="0" step="0.01" value={form.preco_venda} onChange={e => setForm(f => ({ ...f, preco_venda: e.target.value }))} style={{ paddingLeft: 38 }} />
                </div>
              </div>
              {form.preco_custo > 0 && form.preco_venda > 0 && (
                <div style={{ gridColumn: '1 / -1', background: 'var(--bg-700)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--bg-500)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Margem de lucro calculada</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: ((form.preco_venda - form.preco_custo) / form.preco_custo * 100) >= 0 ? '#34D399' : '#F87171' }}>
                    {((form.preco_venda - form.preco_custo) / form.preco_custo * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--bg-600)' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar produto'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Excluir produto" onClose={() => setDeleteId(null)}>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#F87171" />
            </div>
            <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500, marginBottom: 8 }}>Tem certeza?</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Esta ação não pode ser desfeita.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
            <button className="btn-secondary" onClick={() => setDeleteId(null)} style={{ flex: 1 }}>Cancelar</button>
            <button className="btn-danger" onClick={handleDelete} style={{ flex: 1, padding: '10px 20px', justifyContent: 'center' }}>Excluir</button>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
