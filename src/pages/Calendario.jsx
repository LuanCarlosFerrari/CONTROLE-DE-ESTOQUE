import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DAYS   = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_LABEL = {
  aberta: 'Aberta', em_andamento: 'Em andamento',
  concluida: 'Concluída', cancelada: 'Cancelada',
  confirmada: 'Confirmada', checkin: 'Check-in', checkout: 'Check-out',
}
const STATUS_COLOR = {
  aberta: '#60A5FA', em_andamento: '#F59E0B',
  concluida: '#34D399', cancelada: '#F87171',
  confirmada: '#60A5FA', checkin: '#34D399', checkout: '#A78BFA',
}

function toKey(date) {
  return date.toISOString().split('T')[0]
}
function fmt(val) {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

const btnBase = {
  background: 'var(--bg-700)', border: '1px solid var(--bg-500)',
  borderRadius: 8, cursor: 'pointer', color: 'var(--text)',
  fontFamily: 'DM Sans, sans-serif', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
}

export default function Calendario() {
  const { businessType } = useAuth()
  const [current, setCurrent] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [events, setEvents]   = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const year  = current.getFullYear()
  const month = current.getMonth()

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const startISO  = new Date(year, month, 1).toISOString()
    const endISO    = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate   = new Date(year, month + 1, 0).toISOString().split('T')[0]

    try {
      const map = {}
      const add = (key, ev) => { if (!map[key]) map[key] = []; map[key].push(ev) }

      if (businessType === 'estoque' || businessType === 'bar') {
        const { data } = await supabase
          .from('vendas')
          .select('id, created_at, total, clientes(nome)')
          .gte('created_at', startISO).lte('created_at', endISO)
          .order('created_at')
        ;(data || []).forEach(v => add(v.created_at.split('T')[0], {
          label: v.clientes?.nome || 'Cliente',
          sublabel: 'Venda realizada',
          value: v.total,
          color: 'var(--amber)',
        }))
      }

      if (businessType === 'oficina') {
        const { data } = await supabase
          .from('ordens_servico')
          .select('id, created_at, numero, status, valor_total, clientes(nome), veiculos(placa, marca, modelo)')
          .gte('created_at', startISO).lte('created_at', endISO)
          .order('created_at')
        ;(data || []).forEach(o => add(o.created_at.split('T')[0], {
          label: o.numero,
          sublabel: o.veiculos
            ? `${o.veiculos.placa} · ${o.veiculos.marca} ${o.veiculos.modelo}`
            : (o.clientes?.nome || '—'),
          value: o.valor_total,
          color: STATUS_COLOR[o.status] || '#60A5FA',
          tag: o.status,
        }))
      }

      if (businessType === 'hotel') {
        const { data } = await supabase
          .from('reservas')
          .select('id, check_in, check_out, nome_hospede, valor_total, status, quartos(numero, tipo)')
          .lte('check_in', endDate).gte('check_out', startDate)
          .order('check_in')
        ;(data || []).forEach(r => {
          if (r.check_in >= startDate && r.check_in <= endDate)
            add(r.check_in, {
              label: r.nome_hospede,
              sublabel: `Qto ${r.quartos?.numero || '?'} · Check-in`,
              value: r.valor_total,
              color: '#34D399', tag: 'checkin',
            })
          if (r.check_out >= startDate && r.check_out <= endDate)
            add(r.check_out, {
              label: r.nome_hospede,
              sublabel: `Qto ${r.quartos?.numero || '?'} · Check-out`,
              value: r.valor_total,
              color: '#A78BFA', tag: 'checkout',
            })
        })
      }

      setEvents(map)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [year, month, businessType])

  useEffect(() => { loadEvents() }, [loadEvents])

  // Build calendar cells
  const firstDow   = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const todayKey    = toKey(new Date())

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDow + 1
    const date   = new Date(year, month, dayNum)
    const key    = toKey(date)
    return { date, key, dayNum, inMonth: dayNum >= 1 && dayNum <= daysInMonth, isToday: key === todayKey, evs: events[key] || [] }
  })

  const numWeeks    = totalCells / 7
  const selectedEvs = selected ? (events[selected] || []) : []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 12px', boxSizing: 'border-box', gap: 0 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
            {MONTHS[month]}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{year}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))} style={{ ...btnBase, width: 36, height: 36 }}>
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => { const d = new Date(); setCurrent(new Date(d.getFullYear(), d.getMonth(), 1)) }}
            style={{ ...btnBase, padding: '0 14px', height: 36, color: 'var(--amber)', fontWeight: 600, fontSize: 13 }}
          >
            Hoje
          </button>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))} style={{ ...btnBase, width: 36, height: 36 }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Day-of-week labels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3, flexShrink: 0 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: `repeat(${numWeeks}, 1fr)`,
        gap: 3,
        opacity: loading ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}>
        {cells.map(({ date, key, inMonth, isToday, evs }) => (
          <div
            key={key}
            onClick={() => inMonth && setSelected(s => s === key ? null : key)}
            style={{
              background: selected === key ? 'rgba(16,185,129,0.09)' : isToday ? 'rgba(16,185,129,0.04)' : 'var(--bg-800)',
              border: `1px solid ${selected === key ? 'rgba(16,185,129,0.5)' : isToday ? 'rgba(16,185,129,0.28)' : 'var(--bg-600)'}`,
              borderRadius: 8,
              padding: '5px 6px',
              cursor: inMonth ? 'pointer' : 'default',
              opacity: inMonth ? 1 : 0.22,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', minHeight: 0,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {/* Day number */}
            <span style={{
              fontSize: 12, fontWeight: isToday ? 700 : 400,
              color: isToday ? 'var(--amber)' : 'var(--text)',
              lineHeight: 1, marginBottom: 3, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              {isToday && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block', flexShrink: 0 }} />
              )}
              {date.getDate()}
            </span>

            {/* Event pills */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {evs.slice(0, 3).map((ev, i) => (
                <div key={i} style={{
                  background: ev.color + '22',
                  borderLeft: `2px solid ${ev.color}`,
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: 10, fontWeight: 600,
                  color: ev.color,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  flexShrink: 0,
                }}>
                  {ev.label}
                </div>
              ))}
              {evs.length > 3 && (
                <span style={{ fontSize: 10, color: 'var(--text-subtle)', paddingLeft: 4, flexShrink: 0 }}>
                  +{evs.length - 3}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', zIndex: 99 }}
            onClick={() => setSelected(null)}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(340px, 100vw)',
            background: 'var(--bg-800)',
            borderLeft: '1px solid var(--bg-500)',
            zIndex: 100,
            display: 'flex', flexDirection: 'column',
            boxShadow: '-12px 0 40px rgba(0,0,0,0.45)',
            animation: 'slideInRight 0.22s ease',
          }}>
            {/* Panel header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--bg-600)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'capitalize' }}>
                  {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                  {selectedEvs.length} evento{selectedEvs.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ ...btnBase, width: 32, height: 32, flexShrink: 0, border: 'none', background: 'var(--bg-600)' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Event list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {selectedEvs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
                  <CalendarDays size={36} color="var(--bg-500)" />
                  <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: 0 }}>Nenhum evento neste dia</p>
                </div>
              ) : selectedEvs.map((ev, i) => (
                <div key={i} style={{
                  background: 'var(--bg-700)',
                  border: '1px solid var(--bg-500)',
                  borderLeft: `3px solid ${ev.color}`,
                  borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 3px' }}>{ev.label}</p>
                  {ev.sublabel && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 6px' }}>{ev.sublabel}</p>
                  )}
                  {ev.tag && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: ev.color, background: ev.color + '20',
                      border: `1px solid ${ev.color}40`,
                      borderRadius: 20, padding: '2px 8px',
                      display: 'inline-block', marginBottom: 8,
                    }}>
                      {STATUS_LABEL[ev.tag] || ev.tag}
                    </span>
                  )}
                  {ev.value != null && Number(ev.value) > 0 && (
                    <p style={{ fontSize: 15, fontFamily: 'JetBrains Mono, monospace', color: ev.color, fontWeight: 700, margin: 0 }}>
                      R$ {fmt(ev.value)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
