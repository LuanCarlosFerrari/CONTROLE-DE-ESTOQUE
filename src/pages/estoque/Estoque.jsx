import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'
import { formatCurrency as fmt } from '../../utils/format'
import { Plus, Pencil, Trash2, AlertTriangle, Package, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { notifyTelegram } from '../../lib/notify'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Label from '../../components/ui/FormLabel'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmModal from '../../components/ui/ConfirmModal'

const EMPTY = { nome: '', categoria: '', quantidade: 0, preco_custo: 0, preco_venda: 0, estoque_minimo: 5 }
const CATEGORIAS = ['Alimentos', 'Bebidas', 'Eletrônicos', 'Vestuário', 'Limpeza', 'Higiene', 'Papelaria', 'Ferramentas', 'Outros']



export default function Estoque() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const { toast, showToast, clearToast } = useToast()
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
    if (error) return showToast(error.message, 'error')
    if (!editing) {
      notifyTelegram('novo_produto', {
        nome: payload.nome,
        categoria: payload.categoria || '—',
        quantidade: payload.quantidade,
        preco_venda: payload.preco_venda,
      })
    }
    showToast(editing ? 'Produto atualizado!' : 'Produto cadastrado!')
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { error } = await supabase.from('produtos').delete().eq('id', deleteId)
    setDeleteId(null)
    if (error) return showToast(error.message, 'error')
    showToast('Produto removido.')
    load()
  }

  const filtered = produtos.filter(p =>
    p.nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  const criticos = produtos.filter(p => p.quantidade <= p.estoque_minimo).length

  return (
    <div style={{ width: "100%" }} className="animate-fade-in page-content">
      <PageHeader
        title="Estoque"
        subtitle={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{produtos.length} produtos</span>
            {criticos > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: '2px 10px' }}>
                <AlertTriangle size={11} /> {criticos} crítico{criticos > 1 ? 's' : ''}
              </span>
            )}
          </div>
        }
        actions={<button className="btn-primary" onClick={openCreate}><Plus size={15} /> Novo produto</button>}
      />

      {/* Toolbar */}
      <SearchBar value={search} onChange={setSearch} placeholder="Buscar produto ou categoria..." resultCount={filtered.length} style={{ marginBottom: 20 }} />

      {/* Table */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden', flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 6, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title={search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'} subtitle={search ? `Sem resultados para "${search}"` : 'Adicione seu primeiro produto'} />
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
        <ConfirmModal title="Excluir produto" message="Esta ação não pode ser desfeita." onConfirm={handleDelete} onClose={() => setDeleteId(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
