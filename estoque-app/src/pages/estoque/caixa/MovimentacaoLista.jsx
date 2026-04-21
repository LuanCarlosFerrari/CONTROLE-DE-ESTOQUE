import { useState } from 'react'
import { Receipt, ArrowUpCircle, ArrowDownCircle, ChevronDown, Package, DollarSign } from 'lucide-react'

function fmt(val) { return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const FORMA_LABEL = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outros' }

export default function MovimentacaoLista({ filtered, loading, semCaixa, search }) {
  const [expanded, setExpanded] = useState(null)

  if (loading) {
    return (
      <div style={{ padding: '24px 20px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8, marginBottom: 10, opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div style={{ padding: '72px 32px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <DollarSign size={28} color="var(--bg-400)" />
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
          {semCaixa ? 'Caixa não aberto' : search ? 'Nenhum resultado' : 'Sem movimentações hoje'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
          {semCaixa ? 'Abra o caixa para começar a registrar' : search ? `Sem resultados para "${search}"` : 'Registre sua primeira venda ou movimentação'}
        </p>
      </div>
    )
  }

  return filtered.map((mov, idx) => {
    const isVenda   = mov._tipo === 'venda'
    const isEntrada = mov._tipo === 'entrada'
    const isSaida   = mov._tipo === 'saida'
    const isOpen    = expanded === mov.id
    const valor     = isVenda ? mov.total : mov.valor
    const valorColor = isSaida ? '#F87171' : 'var(--amber)'
    const sinal     = isSaida ? '-' : '+'
    const hora      = new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const forma     = FORMA_LABEL[mov.forma_pagamento] || '—'

    return (
      <div key={mov.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--bg-600)' : 'none' }}>
        <div
          onClick={() => isVenda ? setExpanded(isOpen ? null : mov.id) : null}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: isVenda ? 'pointer' : 'default', transition: 'background 0.15s' }}
          onMouseEnter={e => { if (isVenda) e.currentTarget.style.background = 'rgba(255,255,255,0.015)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isSaida ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${isSaida ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}`,
            }}>
              {isVenda   ? <Receipt size={16} color="var(--amber)" /> :
               isEntrada ? <ArrowUpCircle size={16} color="var(--amber)" /> :
                           <ArrowDownCircle size={16} color="#F87171" />}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                {isVenda ? (mov.clientes?.nome || '—') : mov.descricao}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)', background: 'var(--bg-600)', borderRadius: 4, padding: '1px 6px' }}>
                  {isVenda ? 'Venda' : isEntrada ? 'Entrada' : 'Saída'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{forma}</span>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{hora}</span>
                {isVenda && <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{mov.venda_itens?.length || 0} item(s)</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 700, color: valorColor }}>
              {sinal} R$ {fmt(valor)}
            </span>
            {isVenda && (
              <ChevronDown size={14} color="var(--text-subtle)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            )}
          </div>
        </div>

        {isVenda && isOpen && (
          <div style={{ padding: '14px 20px 18px', borderTop: '1px solid var(--bg-600)', background: 'rgba(0,0,0,0.12)' }}>
            {mov.observacao && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, fontStyle: 'italic' }}>"{mov.observacao}"</p>
            )}
            <div style={{ background: 'var(--bg-800)', borderRadius: 10, border: '1px solid var(--bg-500)', overflow: 'hidden' }}>
              {(mov.venda_itens || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < (mov.venda_itens?.length - 1) ? '1px solid var(--bg-600)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={11} color="var(--text-subtle)" />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{item.produtos?.nome || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {item.quantidade}× R$ {fmt(item.preco_unitario)}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--text)', minWidth: 80, textAlign: 'right' }}>
                      R$ {fmt(item.quantidade * item.preco_unitario)}
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', background: 'rgba(16,185,129,0.04)', borderTop: '1px solid rgba(16,185,129,0.1)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 16 }}>Total</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, fontWeight: 800, color: 'var(--amber)' }}>R$ {fmt(mov.total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  })
}
