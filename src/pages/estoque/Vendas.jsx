import { useEffect, useState, useCallback } from 'react'
import { useToast } from '../../hooks/useToast'
import { formatCurrency as fmt } from '../../utils/format'
import { Plus, ShoppingCart, X, ChevronDown, Receipt, Package, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { imprimirRecibo } from '../../lib/recibo'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Label from '../../components/ui/FormLabel'
import PageHeader from '../../components/ui/PageHeader'
import SearchBar from '../../components/ui/SearchBar'
import EmptyState from '../../components/ui/EmptyState'



const statusMap = {
  pago:      { label: 'Pago',      cls: 'badge-green', dot: '#34D399' },
  pendente:  { label: 'Pendente',  cls: 'badge-amber', dot: '#FCD34D' },
  cancelado: { label: 'Cancelado', cls: 'badge-red',   dot: '#F87171' },
}

export default function Vendas() {
  const { subscription, user } = useAuth()
  const [vendas, setVendas] = useState([])
  const [clientes, setClientes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [search, setSearch] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [observacao, setObservacao] = useState('')
  const [itens, setItens] = useState([{ produto_id: '', quantidade: 1, preco_unitario: 0 }])
  const [formaVenda, setFormaVenda] = useState('dinheiro')
  const [saving, setSaving] = useState(false)
  const { toast, showToast, clearToast } = useToast()
  const [expanded, setExpanded] = useState(null)

  const loadVendas = useCallback(async () => {
    const { data } = await supabase
      .from('vendas')
      .select('*, clientes(nome), venda_itens(*, produtos(nome))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setVendas(data || [])
    setLoading(false)
  }, [])

  const loadOptions = useCallback(async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('clientes').select('id, nome').eq('user_id', user.id).order('nome'),
      supabase.from('produtos').select('id, nome, preco_venda, quantidade').eq('user_id', user.id).order('nome'),
    ])
    setClientes(c || [])
    setProdutos(p || [])
  }, [])

  useEffect(() => { loadVendas(); loadOptions() }, [loadVendas, loadOptions])

  const openModal = () => {
    setClienteId(''); setObservacao(''); setFormaVenda('dinheiro')
    setItens([{ produto_id: '', quantidade: 1, preco_unitario: 0 }])
    setModal(true)
  }

  const addItem = () => setItens(i => [...i, { produto_id: '', quantidade: 1, preco_unitario: 0 }])
  const removeItem = (idx) => setItens(i => i.filter((_, j) => j !== idx))

  const updateItem = (idx, field, value) => {
    setItens(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'produto_id') {
        const prod = produtos.find(p => p.id === value)
        updated.preco_unitario = prod?.preco_venda || 0
      }
      return updated
    }))
  }

  const total = itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.preco_unitario), 0)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!clienteId) return showToast('Selecione um cliente.', 'error')
    const validItens = itens.filter(i => i.produto_id && Number(i.quantidade) > 0)
    if (validItens.length === 0) return showToast('Adicione pelo menos um produto.', 'error')
    setSaving(true)
    const { data: venda, error: errVenda } = await supabase.from('vendas').insert({ cliente_id: clienteId, total, observacao, forma_pagamento: formaVenda, user_id: user.id }).select().single()
    if (errVenda) { setSaving(false); return showToast(errVenda.message, 'error') }
    const { error: errItens } = await supabase.from('venda_itens').insert(
      validItens.map(i => ({ venda_id: venda.id, produto_id: i.produto_id, quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario) }))
    )
    if (errItens) { setSaving(false); return showToast(errItens.message, 'error') }
    for (const item of validItens) {
      const prod = produtos.find(p => p.id === item.produto_id)
      if (prod) await supabase.from('produtos').update({ quantidade: Math.max(0, prod.quantidade - Number(item.quantidade)) }).eq('id', item.produto_id)
    }
    setSaving(false)
    showToast('Venda registrada com sucesso!')
    setModal(false)
    loadVendas(); loadOptions()
  }

  const filtered = vendas.filter(v =>
    v.clientes?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    String(v.id).includes(search)
  )

  return (
    <div style={{ width: "100%" }} className="animate-fade-in page-content">
      <PageHeader
        title="Vendas"
        accent="#10B981"
        subtitle={
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {vendas.length} venda{vendas.length !== 1 ? 's' : ''} · Total:{' '}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#34D399', fontWeight: 600 }}>
              R$ {fmt(vendas.reduce((s, v) => s + Number(v.total), 0))}
            </span>
          </p>
        }
        actions={<button className="btn-primary" onClick={openModal}><Plus size={15} /> Nova venda</button>}
      />

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por cliente ou número..." resultCount={filtered.length} style={{ marginBottom: 20 }} />

      {/* List */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, overflow: 'hidden', flex: 1, minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '24px 20px' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title={search ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'} subtitle={search ? `Sem resultados para "${search}"` : 'Registre sua primeira venda'} />
        ) : (
          filtered.map((v, idx) => {
            const st = statusMap[v.status] || statusMap.pago
            const isOpen = expanded === v.id
            const itemCount = v.venda_itens?.length || 0
            return (
              <div key={v.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--bg-600)' : 'none' }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : v.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', transition: 'background 0.15s', background: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Receipt size={17} color="#34D399" />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{v.clientes?.nome || '—'}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>#{String(v.id).slice(-8).toUpperCase()}</span>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--bg-400)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--bg-400)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span className={`badge ${st.cls}`} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.dot }} />
                      {st.label}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: '#34D399', minWidth: 90, textAlign: 'right' }}>
                      R$ {fmt(v.total)}
                    </span>
                    <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)' }}>
                      <ChevronDown size={15} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--bg-600)', background: 'rgba(0,0,0,0.15)' }}>
                    {v.observacao && (
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontStyle: 'italic' }}>"{v.observacao}"</p>
                    )}
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 10 }}>Itens da venda</p>
                    <div style={{ background: 'var(--bg-800)', borderRadius: 10, border: '1px solid var(--bg-500)', overflow: 'hidden' }}>
                      {(v.venda_itens || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < (v.venda_itens?.length - 1) ? '1px solid var(--bg-600)' : 'none', transition: 'background 0.1s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={12} color="var(--text-subtle)" />
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{item.produtos?.nome || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {item.quantidade}× R$ {fmt(item.preco_unitario)}
                            </span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: 'var(--text)', minWidth: 80, textAlign: 'right' }}>
                              R$ {fmt(item.quantidade * item.preco_unitario)}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', background: 'rgba(16,185,129,0.04)', borderTop: '1px solid rgba(16,185,129,0.1)' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 16 }}>Total</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 800, color: '#34D399' }}>R$ {fmt(v.total)}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 7 }}
                        onClick={() => imprimirRecibo({
                          venda: { ...v, forma_pagamento: v.forma_pagamento },
                          itens: (v.venda_itens || []).map(i => ({
                            nome: i.produtos?.nome || '—',
                            quantidade: i.quantidade,
                            preco_unitario: i.preco_unitario,
                          })),
                          cliente: v.clientes || {},
                          negocio: { nome: subscription?.business_name, pix_chave: subscription?.pix_chave },
                        })}
                      >
                        <Printer size={13} /> Imprimir recibo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* New Sale Modal */}
      {modal && (
        <Modal title="Registrar venda" onClose={() => setModal(false)} size="lg">
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <Label required>Cliente</Label>
                <select className="input-field" value={clienteId} onChange={e => setClienteId(e.target.value)} required>
                  <option value="">Selecionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <Label required>Forma de pagamento</Label>
                <select className="input-field" value={formaVenda} onChange={e => setFormaVenda(e.target.value)}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="cartao">Cartão</option>
                  <option value="crediario">Crediário</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <Label>Observação</Label>
                <input className="input-field" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Nota opcional..." />
              </div>
            </div>

            {/* Items */}
            <div style={{ background: 'var(--bg-700)', borderRadius: 10, border: '1px solid var(--bg-500)', padding: '16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Produtos</p>
                <button type="button" className="btn-secondary" onClick={addItem} style={{ padding: '5px 12px', fontSize: 12 }}>
                  <Plus size={12} /> Adicionar
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 32px', gap: 4, marginBottom: 6 }}>
                {['Produto', 'Qtd.', 'Preço unit.', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '0 4px' }}>{h}</div>
                ))}
              </div>

              {itens.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 32px', gap: 4, marginBottom: 6, alignItems: 'center' }}>
                  <select className="input-field" value={item.produto_id} onChange={e => updateItem(idx, 'produto_id', e.target.value)} style={{ fontSize: 13 }}>
                    <option value="">Selecionar...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.quantidade} em estq.)</option>)}
                  </select>
                  <input className="input-field" type="number" min="1" value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', e.target.value)} style={{ fontSize: 13, textAlign: 'center' }} />
                  <input className="input-field" type="number" min="0" step="0.01" value={item.preco_unitario} onChange={e => updateItem(idx, 'preco_unitario', e.target.value)} style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }} />
                  <button type="button" onClick={() => removeItem(idx)} style={{ width: 30, height: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none' }}
                  ><X size={13} /></button>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399', marginBottom: 2 }}>Total da venda</p>
                <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{itens.filter(i => i.produto_id).length} produto{itens.filter(i => i.produto_id).length !== 1 ? 's' : ''}</p>
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 800, color: '#34D399', letterSpacing: '-0.02em' }}>
                R$ {fmt(total)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar venda'}</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </div>
  )
}
