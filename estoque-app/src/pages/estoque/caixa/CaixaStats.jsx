import { Wallet, ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react'

function fmt(val) { return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

export default function CaixaStats({ saldoEsperado, totalVendas, totalEntradas, totalSaidas, vendas, extras, caixa }) {
  const stats = [
    { label: 'Saldo atual',  value: `R$ ${fmt(saldoEsperado)}`,  icon: Wallet,       sub: `Inicial: R$ ${fmt(caixa?.saldo_inicial)}` },
    { label: 'Vendas hoje',  value: `R$ ${fmt(totalVendas)}`,    icon: ShoppingCart, sub: `${vendas.length} venda${vendas.length !== 1 ? 's' : ''}` },
    { label: 'Entradas',     value: `R$ ${fmt(totalEntradas)}`,  icon: TrendingUp,   sub: `${extras.filter(e => e.tipo === 'entrada').length} lançamentos` },
    { label: 'Saídas',       value: `R$ ${fmt(totalSaidas)}`,    icon: TrendingDown, sub: `${extras.filter(e => e.tipo === 'saida').length} lançamentos` },
  ]

  return (
    <div className="stats-grid-4" style={{ marginBottom: 24 }}>
      {stats.map(({ label, value, icon: Icon, sub }) => (
        <div key={label} style={{
          background: 'linear-gradient(135deg, var(--bg-700) 0%, rgba(16,185,129,0.04) 100%)',
          border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{label}</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} color="var(--amber)" />
            </div>
          </div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>{value}</p>
          <p style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{sub}</p>
        </div>
      ))}
    </div>
  )
}
