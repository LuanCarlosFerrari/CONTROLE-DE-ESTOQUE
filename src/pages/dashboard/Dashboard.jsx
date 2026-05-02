import { useAuth } from '../../contexts/AuthContext'
import DashboardOficina from './DashboardOficina'
import DashboardHotel from './DashboardHotel'
import { useEffect, useState } from 'react'
import { Package, Users, ShoppingCart, AlertTriangle, TrendingUp, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/ui/StatCard'
import PageHeader from '../../components/ui/PageHeader'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--bg-600)', border: '1px solid var(--bg-400)',
        borderRadius: 8, padding: '10px 14px', fontSize: 13,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ color: 'var(--amber)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 15 }}>
          R$ {Number(payload[0].value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>
    )
  }
  return null
}


export default function Dashboard() {
  const { businessType } = useAuth()
  if (businessType === 'oficina') return <DashboardOficina />
  if (businessType === 'hotel') return <DashboardHotel />

  const [stats, setStats] = useState({ produtos: 0, clientes: 0, vendas_hoje: 0, estoque_baixo: 0, total_mes: 0 })
  const [salesChart, setSalesChart] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    try {
      const [{ count: produtos }, { count: clientes }, { data: vendas }, { data: estoqueBaixo }, { data: vendasMes }] = await Promise.all([
        supabase.from('produtos').select('*', { count: 'exact', head: true }),
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('vendas').select('total, created_at, clientes(nome)').order('created_at', { ascending: false }).limit(5),
        supabase.from('produtos').select('*'),
        supabase.from('vendas').select('total, created_at').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ])
      const hoje = new Date().toDateString()
      const vendasHoje = (vendas || []).filter(v => new Date(v.created_at).toDateString() === hoje)
      const totalHoje = vendasHoje.reduce((s, v) => s + Number(v.total), 0)
      const totalMes = (vendasMes || []).reduce((s, v) => s + Number(v.total), 0)
      const estoqueCritico = (estoqueBaixo || []).filter(p => p.quantidade <= p.estoque_minimo)
      setStats({ produtos: produtos || 0, clientes: clientes || 0, vendas_hoje: totalHoje, estoque_baixo: estoqueCritico.length, total_mes: totalMes })
      setRecentSales(vendas || [])
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
        const total = (vendasMes || []).filter(v => new Date(v.created_at).toDateString() === d.toDateString()).reduce((s, v) => s + Number(v.total), 0)
        days.push({ name: label, total })
      }
      setSalesChart(days)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const G = { color: 'var(--amber)', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.06)' }
  const R = { color: '#EF4444',      border: 'rgba(239,68,68,0.3)',  glow: 'rgba(239,68,68,0.06)'  }
  const statCards = [
    { label: 'Produtos', sublabel: 'cadastrados', value: stats.produtos,   icon: Package,       ...G },
    { label: 'Clientes', sublabel: 'ativos',       value: stats.clientes,   icon: Users,         ...G },
    { label: 'Vendas',   sublabel: 'hoje',          value: `R$ ${stats.vendas_hoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: ShoppingCart, ...G },
    { label: 'Estoque',  sublabel: 'crítico',       value: stats.estoque_baixo, icon: AlertTriangle, ...(stats.estoque_baixo > 0 ? R : G) },
  ]

  if (loading) return (
    <div className="page-content">
      <div style={{ height: 60, background: 'var(--bg-700)', borderRadius: 8, marginBottom: 32, width: 200 }} className="skeleton" />
      <div className="stats-grid-4" style={{ marginBottom: 24 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
      </div>
      <div className="chart-grid">
        {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 12 }} />)}
      </div>
    </div>
  )

  return (
    <div style={{ width: "100%" }} className="animate-fade-in page-content">
      <PageHeader title="Dashboard" subtitle={`${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`} />

      {/* Stat cards */}
      <div className="stats-grid-4" style={{ marginBottom: 28 }}>
        {statCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Charts */}
      <div className="chart-grid" style={{ marginBottom: 20 }}>
        {/* Bar chart */}
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: '24px 24px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexShrink: 0 }}>
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Receita — últimos 7 dias</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Total acumulado: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--amber)', fontWeight: 600 }}>
                  R$ {salesChart.reduce((s, d) => s + d.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '4px 10px' }}>
              <TrendingUp size={13} color="var(--amber)" />
              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>7d</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesChart} barSize={24} barCategoryGap="35%">
              <XAxis dataKey="name" tick={{ fill: 'var(--text-subtle)', fontSize: 10, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 4 }} />
              <Bar dataKey="total" fill="var(--amber)" radius={[5, 5, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent sales */}
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Vendas recentes</p>
            <ShoppingCart size={15} color="var(--text-subtle)" />
          </div>
          {recentSales.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ShoppingCart size={32} color="var(--bg-500)" />
              <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>Nenhuma venda ainda</p>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {recentSales.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < recentSales.length - 1 ? '1px solid var(--bg-600)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                        {(v.clientes?.nome || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 1 }}>{v.clientes?.nome || '—'}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: '#34D399' }}>
                    R$ {Number(v.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Month total */}
      <div className="billing-card" style={{
        background: 'var(--bg-700)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 14, padding: '24px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(16,185,129,0.04)', pointerEvents: 'none' }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>Faturamento do mês</p>
          <p className="billing-value">
            R$ {stats.total_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 16px', flexShrink: 0 }}>
          <ArrowUpRight size={20} color="var(--amber)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>30 dias</span>
        </div>
      </div>
    </div>
  )
}
