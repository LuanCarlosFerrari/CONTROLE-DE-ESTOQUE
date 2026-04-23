import { useEffect, useState } from 'react'
import { formatCurrency as fmt } from '../../utils/format'
import { BedDouble, Calendar, LogIn, LogOut, TrendingUp, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import StatCard from '../../components/ui/StatCard'
import PageHeader from '../../components/ui/PageHeader'


const STATUS_CFG = {
  confirmada: { label: 'Confirmada', color: '#60A5FA' },
  checkin:    { label: 'Check-in',   color: '#34D399' },
  checkout:   { label: 'Check-out',  color: '#A78BFA' },
  cancelada:  { label: 'Cancelada',  color: '#F87171' },
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div style={{ background: 'var(--bg-600)', border: '1px solid var(--bg-400)', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ color: 'var(--amber)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 15 }}>R$ {fmt(payload[0].value)}</p>
    </div>
  )
  return null
}

export default function DashboardHotel() {
  const [stats, setStats] = useState({ disponiveis: 0, ocupados: 0, checkins_hoje: 0, checkouts_hoje: 0, receita_mes: 0, total_quartos: 0 })
  const [recentReservas, setRecentReservas] = useState([])
  const [proximosCheckins, setProximosCheckins] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const inicioMes = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

      const [
        { count: totalQuartos },
        { data: checkins_ativos },
        { count: checkins_hoje },
        { count: checkouts_hoje },
        { data: reservasMes },
        { data: recentes },
        { data: proximos },
      ] = await Promise.all([
        supabase.from('quartos').select('*', { count: 'exact', head: true }),
        supabase.from('reservas').select('quarto_id').eq('status', 'checkin').lte('check_in', hoje).gte('check_out', hoje),
        supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('check_in', hoje).in('status', ['confirmada', 'checkin']),
        supabase.from('reservas').select('*', { count: 'exact', head: true }).eq('check_out', hoje).eq('status', 'checkin'),
        supabase.from('reservas').select('valor_total, check_out, status').gte('check_out', inicioMes),
        supabase.from('reservas').select('*, quartos(numero, tipo), clientes(nome)').order('check_in', { ascending: false }).limit(6),
        supabase.from('reservas').select('*, quartos(numero, tipo)').eq('status', 'confirmada').gte('check_in', hoje).order('check_in').limit(5),
      ])

      const ocupados = (checkins_ativos || []).length
      const receita = (reservasMes || []).filter(r => r.status === 'checkout').reduce((s, r) => s + Number(r.valor_total), 0)
      const total = totalQuartos || 0

      setStats({
        total_quartos: total,
        ocupados,
        disponiveis: Math.max(0, total - ocupados),
        checkins_hoje: checkins_hoje || 0,
        checkouts_hoje: checkouts_hoje || 0,
        receita_mes: receita,
      })
      setRecentReservas(recentes || [])
      setProximosCheckins(proximos || [])

      // Gráfico: receita por dia dos últimos 7 dias (check-outs concluídos)
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const dateStr = d.toISOString().split('T')[0]
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
        const total = (reservasMes || [])
          .filter(r => r.status === 'checkout' && r.check_out === dateStr)
          .reduce((s, r) => s + Number(r.valor_total), 0)
        days.push({ name: label, total })
      }
      setChartData(days)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const ocupacaoPct = stats.total_quartos > 0 ? Math.round((stats.ocupados / stats.total_quartos) * 100) : 0

  const G = { color: 'var(--amber)', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.06)' }
  const statCards = [
    { label: 'Disponíveis', sublabel: 'agora', value: stats.disponiveis,    icon: BedDouble, ...G },
    { label: 'Ocupados',    sublabel: 'agora', value: stats.ocupados,       icon: BedDouble, ...G },
    { label: 'Check-ins',   sublabel: 'hoje',  value: stats.checkins_hoje,  icon: LogIn,     ...G },
    { label: 'Check-outs',  sublabel: 'hoje',  value: stats.checkouts_hoje, icon: LogOut,    ...G },
  ]

  if (loading) return (
    <div className="page-content">
      <div style={{ height: 60, background: 'var(--bg-700)', borderRadius: 8, marginBottom: 32, width: 240 }} className="skeleton" />
      <div className="stats-grid-4" style={{ marginBottom: 24 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
      </div>
      <div className="chart-grid">
        {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 12 }} />)}
      </div>
    </div>
  )

  return (
    <div style={{ width: "100%", height: "100%" }} className="animate-fade-in page-content">
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} />

      {/* Stat cards */}
      <div className="stats-grid-4" style={{ marginBottom: 28 }}>
        {statCards.map(card => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Chart + Reservas recentes */}
      <div className="chart-grid" style={{ flex: 1, minHeight: 0, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: '24px 24px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexShrink: 0 }}>
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>Receita — últimos 7 dias</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Total: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--amber)', fontWeight: 600 }}>
                  R$ {fmt(chartData.reduce((s, d) => s + d.total, 0))}
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '4px 10px' }}>
              <TrendingUp size={13} color="var(--amber)" />
              <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>7d</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={24} barCategoryGap="35%">
              <XAxis dataKey="name" tick={{ fill: 'var(--text-subtle)', fontSize: 10, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 4 }} />
              <Bar dataKey="total" fill="var(--amber)" radius={[5, 5, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Próximos check-ins */}
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Próximos check-ins</p>
            <Calendar size={15} color="var(--text-subtle)" />
          </div>
          {proximosCheckins.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Calendar size={32} color="var(--bg-500)" />
              <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>Sem check-ins previstos</p>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {proximosCheckins.map((r, i) => {
                const hoje = new Date().toISOString().split('T')[0]
                const isHoje = r.check_in === hoje
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < proximosCheckins.length - 1 ? '1px solid var(--bg-600)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: isHoje ? 'rgba(52,211,153,0.15)' : 'var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <LogIn size={12} color={isHoje ? '#34D399' : 'var(--text-subtle)'} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 1 }}>{r.nome_hospede}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                          Qto {r.quartos?.numero} · {new Date(r.check_in + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {isHoje && <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '2px 7px' }}>HOJE</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ocupação + receita do mês */}
      <div className="bottom-grid-hotel">
        {/* Taxa de ocupação */}
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>Taxa de ocupação</p>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 100, height: 100 }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg-600)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#60A5FA" strokeWidth="3"
                strokeDasharray={`${ocupacaoPct} ${100 - ocupacaoPct}`}
                strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: '#60A5FA' }}>{ocupacaoPct}%</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
            {stats.ocupados} de {stats.total_quartos} quartos ocupados
          </p>
        </div>

        {/* Receita do mês */}
        <div className="billing-card" style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 50%, transparent 100%)',
          border: '1px solid rgba(16,185,129,0.18)', borderRadius: 14, padding: '24px 28px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(16,185,129,0.04)', pointerEvents: 'none' }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>Receita do mês (check-outs)</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 34, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              R$ {fmt(stats.receita_mes)}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 16px' }}>
            <ArrowUpRight size={20} color="var(--amber)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>30 dias</span>
          </div>
        </div>
      </div>
    </div>
  )
}
