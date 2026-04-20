import { useEffect, useState } from 'react'
import { Wrench, Car, CheckCircle, TrendingUp, ArrowUpRight, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'

function fmt(v) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

const STATUS_CFG = {
  aberta:       { label: 'Aberta',       color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
  em_andamento: { label: 'Em andamento', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  concluida:    { label: 'Concluída',    color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
  cancelada:    { label: 'Cancelada',    color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
}

const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || STATUS_CFG.aberta
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: '3px 10px' }}>
      {c.label}
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-600)', border: '1px solid var(--bg-400)', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ color: 'var(--amber)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 15 }}>
          R$ {fmt(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export default function DashboardOficina() {
  const [stats, setStats] = useState({ abertas: 0, em_andamento: 0, concluidas_hoje: 0, veiculos: 0, receita_mes: 0 })
  const [recentOS, setRecentOS] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const hoje = new Date().toDateString()
      const inicioMes = new Date(Date.now() - 30 * 86400000).toISOString()

      const [
        { count: abertas },
        { count: em_andamento },
        { count: veiculos },
        { data: osRecentes },
        { data: osMes },
      ] = await Promise.all([
        supabase.from('ordens_servico').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
        supabase.from('ordens_servico').select('*', { count: 'exact', head: true }).eq('status', 'em_andamento'),
        supabase.from('veiculos').select('*', { count: 'exact', head: true }),
        supabase.from('ordens_servico')
          .select('*, veiculos(placa, marca, modelo), clientes(nome)')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('ordens_servico')
          .select('valor_total, status, data_conclusao, created_at')
          .gte('created_at', inicioMes),
      ])

      const concluidasHoje = (osMes || []).filter(o => o.status === 'concluida' && o.data_conclusao && new Date(o.data_conclusao).toDateString() === hoje).length
      const receitaMes = (osMes || []).filter(o => o.status === 'concluida').reduce((s, o) => s + Number(o.valor_total), 0)

      setStats({ abertas: abertas || 0, em_andamento: em_andamento || 0, concluidas_hoje: concluidasHoje, veiculos: veiculos || 0, receita_mes: receitaMes })
      setRecentOS(osRecentes || [])

      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
        const total = (osMes || [])
          .filter(o => o.status === 'concluida' && o.data_conclusao && new Date(o.data_conclusao).toDateString() === d.toDateString())
          .reduce((s, o) => s + Number(o.valor_total), 0)
        days.push({ name: label, total })
      }
      setChartData(days)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const G = { color: 'var(--amber)', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.06)' }
  const statCards = [
    { label: 'OS Abertas',   sublabel: 'aguardando',  value: stats.abertas,         icon: Clock,       ...G },
    { label: 'Em andamento', sublabel: 'em execução', value: stats.em_andamento,    icon: Wrench,      ...G },
    { label: 'Concluídas',   sublabel: 'hoje',        value: stats.concluidas_hoje, icon: CheckCircle, ...G },
    { label: 'Veículos',     sublabel: 'cadastrados', value: stats.veiculos,        icon: Car,         ...G },
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
    <div style={{ width: "100%" }} className="animate-fade-in page-content">
      {/* Header */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--bg-600)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 3, height: 22, background: 'var(--amber)', borderRadius: 2 }} />
          <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Dashboard</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', paddingLeft: 15 }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid-4" style={{ marginBottom: 28 }}>
        {statCards.map(({ label, sublabel, value, icon: Icon, color, border, glow }) => (
          <div key={label} style={{
            background: `linear-gradient(135deg, var(--bg-700) 0%, ${glow} 100%)`,
            border: `1px solid ${border}`, borderRadius: 14, padding: '20px 22px', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${glow}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-subtle)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.04em' }}>{sublabel}</span>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={17} color={color} />
              </div>
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 32, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Chart + OS recentes */}
      <div className="chart-grid" style={{ marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: '24px 24px 16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
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
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={chartData} barSize={24} barCategoryGap="35%">
              <XAxis dataKey="name" tick={{ fill: 'var(--text-subtle)', fontSize: 10, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 4 }} />
              <Bar dataKey="total" fill="var(--amber)" radius={[5, 5, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* OS recentes */}
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>OS recentes</p>
            <Wrench size={15} color="var(--text-subtle)" />
          </div>
          {recentOS.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Wrench size={32} color="var(--bg-500)" />
              <p style={{ color: 'var(--text-subtle)', fontSize: 13 }}>Nenhuma OS ainda</p>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {recentOS.map((o, i) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < recentOS.length - 1 ? '1px solid var(--bg-600)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wrench size={12} color="var(--text-subtle)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{o.numero}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.veiculos ? `${o.veiculos.placa} · ${o.veiculos.marca} ${o.veiculos.modelo}` : o.clientes?.nome || '—'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    <StatusBadge status={o.status} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                      R$ {fmt(o.valor_total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receita do mês */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.03) 50%, transparent 100%)',
        border: '1px solid rgba(16,185,129,0.18)',
        borderRadius: 14, padding: '24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(16,185,129,0.04)', pointerEvents: 'none' }} />
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 8 }}>Receita do mês (OS concluídas)</p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 38, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            R$ {fmt(stats.receita_mes)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 16px' }}>
          <ArrowUpRight size={20} color="var(--amber)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>30 dias</span>
        </div>
      </div>
    </div>
  )
}
