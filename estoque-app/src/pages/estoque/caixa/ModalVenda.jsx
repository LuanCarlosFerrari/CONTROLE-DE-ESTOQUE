import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import Modal from '../../../components/ui/Modal'

function fmt(val) { return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const FORMAS = ['dinheiro', 'pix', 'cartao', 'outros']
const FORMA_LABEL = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outros' }

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

export default function ModalVenda({ clientes, produtos, title = 'Registrar venda', onClose, onSaved, onError }) {
  const [clienteId, setClienteId]   = useState('')
  const [observacao, setObservacao] = useState('')
  const [formaVenda, setFormaVenda] = useState('dinheiro')
  const [itens, setItens]           = useState([{ produto_id: '', quantidade: 1, preco_unitario: 0 }])
  const [saving, setSaving]         = useState(false)

  const addItem    = () => setItens(i => [...i, { produto_id: '', quantidade: 1, preco_unitario: 0 }])
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

  const totalVenda = itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.preco_unitario), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clienteId) return onError('Selecione um cliente.')
    const validItens = itens.filter(i => i.produto_id && Number(i.quantidade) > 0)
    if (validItens.length === 0) return onError('Adicione pelo menos um produto.')
    setSaving(true)
    const { data: venda, error: errV } = await supabase.from('vendas')
      .insert({ cliente_id: clienteId, total: totalVenda, observacao, forma_pagamento: formaVenda })
      .select().single()
    if (errV) { setSaving(false); return onError(errV.message) }
    const { error: errI } = await supabase.from('venda_itens').insert(
      validItens.map(i => ({ venda_id: venda.id, produto_id: i.produto_id, quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario) }))
    )
    if (errI) { setSaving(false); return onError(errI.message) }
    for (const item of validItens) {
      const prod = produtos.find(p => p.id === item.produto_id)
      if (prod) await supabase.from('produtos').update({ quantidade: Math.max(0, prod.quantidade - Number(item.quantidade)) }).eq('id', item.produto_id)
    }
    setSaving(false)
    onSaved('Venda registrada!')
  }

  return (
    <Modal title={title} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <Label required>Cliente</Label>
            <select className="input-field" value={clienteId} onChange={e => setClienteId(e.target.value)} required>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <select className="input-field" value={formaVenda} onChange={e => setFormaVenda(e.target.value)}>
              {FORMAS.map(f => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Label>Observação</Label>
          <input className="input-field" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Nota opcional..." />
        </div>

        <div style={{ background: 'var(--bg-700)', borderRadius: 10, border: '1px solid var(--bg-500)', padding: 16, marginBottom: 16 }}>
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
              <button type="button" onClick={() => removeItem(idx)}
                style={{ width: 30, height: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-subtle)'; e.currentTarget.style.background = 'none' }}
              ><X size={13} /></button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 2 }}>Total da venda</p>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>{itens.filter(i => i.produto_id).length} produto(s)</p>
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--amber)', letterSpacing: '-0.02em' }}>R$ {fmt(totalVenda)}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar venda'}</button>
        </div>
      </form>
    </Modal>
  )
}
