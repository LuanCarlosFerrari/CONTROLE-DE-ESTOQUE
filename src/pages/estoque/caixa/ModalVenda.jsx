import { useState } from 'react'
import { formatCurrency as fmt } from '../../../utils/format'
import { nextMonthDate, calcularCrediario } from '../../../utils/finance'
import { Plus, X, CreditCard, QrCode, Printer, CheckCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { notifyTelegram } from '../../../lib/notify'
import { imprimirRecibo } from '../../../lib/recibo'
import Modal from '../../../components/ui/Modal'
import Label from '../../../components/ui/FormLabel'
import PixModal from '../../../components/ui/PixModal'

const FORMAS = ['dinheiro', 'pix', 'cartao', 'crediario', 'outros']
const FORMA_LABEL = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', crediario: 'Crediário', outros: 'Outros' }

export default function ModalVenda({ clientes, produtos, caixaId, title = 'Registrar venda', onClose, onSaved, onError }) {
  const { user, subscription } = useAuth()
  const [clienteId, setClienteId]   = useState('')
  const [observacao, setObservacao] = useState('')
  const [formaVenda, setFormaVenda] = useState('dinheiro')
  const [itens, setItens]           = useState([{ produto_id: '', quantidade: 1, preco_unitario: 0 }])
  const [saving, setSaving]         = useState(false)
  const [showPix, setShowPix]       = useState(false)
  const [vendaSalva, setVendaSalva] = useState(null)

  // Crediário
  const hoje = new Date().toISOString().split('T')[0]
  const [numParcelas, setNumParcelas]           = useState(3)
  const [entrada, setEntrada]                   = useState(0)
  const [dataFirstParcela, setDataFirstParcela] = useState(() => nextMonthDate(hoje, 1))

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

  const { totalVenda, valorRestante, valorParcela, parcelas: previewParcelas } =
    calcularCrediario({ itens, entrada, numParcelas, dataFirstParcela })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!clienteId) return onError('Selecione um cliente.')
    const validItens = itens.filter(i => i.produto_id && Number(i.quantidade) > 0)
    if (validItens.length === 0) return onError('Adicione pelo menos um produto.')
    if (formaVenda === 'crediario' && !dataFirstParcela) return onError('Informe a data da 1ª parcela.')

    setSaving(true)
    const { data: venda, error: errV } = await supabase.from('vendas')
      .insert({ cliente_id: clienteId, total: totalVenda, observacao, forma_pagamento: formaVenda, user_id: user.id })
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

    if (formaVenda === 'crediario') {
      const clienteNome = clientes.find(c => c.id === clienteId)?.nome || ''

      // Só cria parcelas se houver valor restante a pagar
      if (valorRestante > 0) {
        const { error: errC } = await supabase.from('parcelas_crediario').insert(
          previewParcelas.map(p => ({
            venda_id: venda.id,
            cliente_id: clienteId,
            cliente_nome: clienteNome,
            numero: p.num,
            total_parcelas: Number(numParcelas),
            valor: p.valor,
            data_vencimento: p.data,
            status: 'pendente',
          }))
        )
        if (errC) { setSaving(false); return onError(errC.message) }
      }

      // Registra a entrada no caixa quando o cliente paga algo na hora
      if (Number(entrada) > 0) {
        await supabase.from('movimentacoes_extras').insert({
          caixa_id: caixaId || null,
          tipo: 'entrada',
          descricao: `Entrada crediário — ${clienteNome}`,
          valor: Number(entrada),
          forma_pagamento: 'dinheiro',
          user_id: user.id,
        })
      }
    }

    setSaving(false)
    const cliente = clientes.find(c => c.id === clienteId) || {}
    notifyTelegram('nova_venda', {
      cliente_nome: cliente.nome || '—',
      forma_pagamento: FORMA_LABEL[formaVenda] || formaVenda,
      total: totalVenda,
      itens: validItens.map(i => ({
        nome: produtos.find(p => p.id === i.produto_id)?.nome || '—',
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario),
      })),
      crediario: formaVenda === 'crediario'
        ? { num_parcelas: Number(numParcelas), valor_parcela: valorParcela }
        : null,
    })
    setVendaSalva({
      venda: { ...venda, forma_pagamento: formaVenda, observacao },
      itens: validItens.map(i => ({
        nome: produtos.find(p => p.id === i.produto_id)?.nome || '—',
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario),
      })),
      cliente,
    })
  }

  if (vendaSalva) {
    return (
      <Modal title="Venda registrada" onClose={() => onSaved('Venda registrada!')} size="sm">
        <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={26} color="#34D399" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Venda registrada com sucesso!</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            {vendaSalva.cliente.nome} · {FORMA_LABEL[vendaSalva.venda.forma_pagamento] || vendaSalva.venda.forma_pagamento}
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--amber)', letterSpacing: '-0.02em', marginBottom: 28 }}>
            R$ {fmt(vendaSalva.venda.total)}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => imprimirRecibo({
                venda: vendaSalva.venda,
                itens: vendaSalva.itens,
                cliente: vendaSalva.cliente,
                negocio: { nome: subscription?.business_name, pix_chave: subscription?.pix_chave },
              })}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Printer size={14} /> Imprimir recibo
            </button>
            <button type="button" className="btn-primary" onClick={() => onSaved('Venda registrada!')}>
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={title} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="modal-2col">
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

        {/* ── Seção Crediário ── */}
        {formaVenda === 'crediario' && (
          <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <CreditCard size={14} color="#60A5FA" />
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#60A5FA', margin: 0 }}>
                Configurar crediário
              </p>
            </div>
            <div className="modal-3col">
              <div>
                <Label>Entrada (R$)</Label>
                <input className="input-field" type="number" min="0" step="0.01"
                  value={entrada} onChange={e => setEntrada(e.target.value)}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <div>
                <Label>Nº de parcelas</Label>
                <select className="input-field" value={numParcelas} onChange={e => setNumParcelas(Number(e.target.value))}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
              <div>
                <Label>1ª parcela em</Label>
                <input className="input-field" type="date" value={dataFirstParcela}
                  onChange={e => setDataFirstParcela(e.target.value)} />
              </div>
            </div>

            {/* Preview parcelas */}
            {totalVenda > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Preview das parcelas
                  {Number(entrada) > 0 && <span style={{ marginLeft: 8, color: '#60A5FA', textTransform: 'none', letterSpacing: 0 }}>
                    (entrada R$ {fmt(entrada)} + {numParcelas}x R$ {fmt(valorParcela)})
                  </span>}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
                  {previewParcelas.map(p => (
                    <div key={p.num} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-700)', borderRadius: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Parcela <strong style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{p.num}/{numParcelas}</strong>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#60A5FA' }}>
                        R$ {fmt(p.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
          <div className="modal-item-header">
            {['Produto', 'Qtd.', 'Preço unit.', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '0 4px' }}>{h}</div>
            ))}
          </div>
          {itens.map((item, idx) => (
            <div key={idx} className="modal-item-row">
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '14px 20px', marginBottom: formaVenda === 'pix' && subscription?.pix_chave ? 12 : 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 2 }}>Total da venda</p>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
              {itens.filter(i => i.produto_id).length} produto(s)
              {formaVenda === 'crediario' && numParcelas > 0 && totalVenda > 0 &&
                <> · <span style={{ color: '#60A5FA' }}>{numParcelas}x R$ {fmt(valorParcela)}</span></>
              }
            </p>
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--amber)', letterSpacing: '-0.02em' }}>R$ {fmt(totalVenda)}</span>
        </div>

        {formaVenda === 'pix' && subscription?.pix_chave && totalVenda > 0 && (
          <button
            type="button"
            onClick={() => setShowPix(true)}
            style={{
              width: '100%', padding: '10px', marginBottom: 16, borderRadius: 10,
              background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: '#34D399', fontSize: 13, fontWeight: 600,
            }}
          >
            <QrCode size={15} />
            Gerar QR Code PIX
          </button>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar venda'}</button>
        </div>
      </form>

      {showPix && (
        <PixModal
          chave={subscription.pix_chave}
          nome={subscription.pix_nome || ''}
          cidade={subscription.pix_cidade || ''}
          valor={totalVenda}
          onClose={() => setShowPix(false)}
        />
      )}
    </Modal>
  )
}
