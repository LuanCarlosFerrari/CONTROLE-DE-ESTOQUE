import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Modal from '../../../components/ui/Modal'

const FORMAS = ['dinheiro', 'pix', 'cartao', 'outros']
const FORMA_LABEL = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outros' }

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 7 }}>
    {children}{required && <span style={{ color: 'var(--amber)', marginLeft: 3 }}>*</span>}
  </label>
)

export default function ModalExtra({ tipo, caixaId, onClose, onSaved, onError }) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor]         = useState('')
  const [forma, setForma]         = useState('dinheiro')
  const [saving, setSaving]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valor || Number(valor) <= 0) return onError('Informe um valor válido.')
    setSaving(true)
    const { error } = await supabase.from('movimentacoes_extras').insert({
      caixa_id: caixaId || null, tipo, descricao, valor: Number(valor), forma_pagamento: forma,
    })
    setSaving(false)
    if (error) return onError(error.message)
    onSaved(tipo === 'entrada' ? 'Entrada registrada!' : 'Saída registrada!')
  }

  return (
    <Modal title={tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <Label required>Descrição</Label>
          <input className="input-field" required value={descricao} onChange={e => setDescricao(e.target.value)}
            placeholder={tipo === 'entrada' ? 'Ex: PIX recebido, devolução...' : 'Ex: Compra de embalagens, energia...'} autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div>
            <Label required>Valor (R$)</Label>
            <input className="input-field" type="number" min="0.01" step="0.01" required
              value={valor} onChange={e => setValor(e.target.value)}
              style={{ fontFamily: 'JetBrains Mono, monospace' }} />
          </div>
          <div>
            <Label>Forma</Label>
            <select className="input-field" value={forma} onChange={e => setForma(e.target.value)}>
              {FORMAS.map(f => <option key={f} value={f}>{FORMA_LABEL[f]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}
            style={tipo === 'saida' ? { background: '#EF4444' } : {}}>
            {saving ? 'Salvando...' : tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
