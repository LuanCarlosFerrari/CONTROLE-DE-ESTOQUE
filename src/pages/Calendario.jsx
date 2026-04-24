import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, X, CalendarDays, Plus, LogIn, LogOut, Wrench, Play, CheckCircle, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/ui/Modal'
import Label from '../components/ui/FormLabel'

const FORMAS = ['dinheiro', 'pix', 'cartao', 'outros']
const FORMA_LABEL = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', outros: 'Outros' }

const DAYS   = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_LABEL = {
  aberta: 'Aberta', em_andamento: 'Em andamento',
  concluida: 'Concluída', cancelada: 'Cancelada',
  confirmada: 'Confirmada', checkin: 'Check-in', checkout: 'Check-out',
  pendente: 'Pendente', atrasado: 'Atrasado',
}
const STATUS_COLOR = {
  aberta: '#60A5FA', em_andamento: '#F59E0B',
  concluida: '#34D399', cancelada: '#F87171',
  confirmada: '#60A5FA', checkin: '#34D399', checkout: '#A78BFA',
}

function toKey(date) { return date.toISOString().split('T')[0] }
function fmt(val) { return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function diffDias(a, b) { return !a || !b ? 0 : Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)) }

const btnBase = {
  background: 'var(--bg-700)', border: '1px solid var(--bg-500)',
  borderRadius: 8, cursor: 'pointer', color: 'var(--text)',
  fontFamily: 'DM Sans, sans-serif', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
}

const inp = {
  width: '100%', background: 'var(--bg-700)', border: '1px solid var(--bg-500)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text)',
  fontFamily: 'DM Sans, sans-serif', fontSize: 14, boxSizing: 'border-box',
}

const EMPTY_HOTEL = { nome_hospede: '', quarto_id: '', check_in: '', check_out: '', valor_diaria: 0, valor_total: 0 }
const EMPTY_OS    = { veiculo_id: '', cliente_id: '', descricao: '', valor_mao_obra: 0, data_previsao: '' }

export default function Calendario() {
  const { businessType, user } = useAuth()
  const [current, setCurrent] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [events, setEvents]   = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const loadSeqRef = useRef(0)

  // Creation / action state
  const [modal, setModal]     = useState(null) // 'hotel' | 'oficina'
  const [form, setForm]       = useState({})
  const [auxData, setAuxData] = useState({ quartos: [], veiculos: [], clientes: [] })
  const [saving, setSaving]   = useState(false)
  const [payModal, setPayModal] = useState(null) // { ev, valor, forma }

  const year  = current.getFullYear()
  const month = current.getMonth()

  const loadEvents = useCallback(async () => {
    const seq = ++loadSeqRef.current
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
          .from('vendas').select('id, created_at, total, forma_pagamento, clientes(nome)')
          .gte('created_at', startISO).lte('created_at', endISO).order('created_at')
        ;(data || []).forEach(v => add(v.created_at.split('T')[0], {
          label: v.clientes?.nome || 'Cliente',
          sublabel: v.forma_pagamento === 'crediario' ? 'Venda · Crediário' : 'Venda realizada',
          value: v.total, color: 'var(--amber)',
        }))
      }

      if (businessType === 'estoque') {
        const todayStr = new Date().toISOString().split('T')[0]
        const { data: parcelas } = await supabase
          .from('parcelas_crediario')
          .select('id, data_vencimento, valor, status, numero, total_parcelas, cliente_nome, cliente_id')
          .eq('status', 'pendente')
          .gte('data_vencimento', startDate)
          .lte('data_vencimento', endDate)
        ;(parcelas || []).forEach(p => {
          const atrasado = p.data_vencimento < todayStr
          const isHoje   = p.data_vencimento === todayStr
          add(p.data_vencimento, {
            id: p.id, type: 'parcela',
            status: atrasado ? 'atrasado' : 'pendente',
            label: p.cliente_nome || 'Cliente',
            sublabel: `Parcela ${p.numero}/${p.total_parcelas} · Crediário`,
            value: p.valor,
            color: atrasado ? '#F87171' : isHoje ? '#F59E0B' : '#60A5FA',
            tag: atrasado ? 'atrasado' : 'pendente',
          })
        })
      }

      if (businessType === 'oficina') {
        const { data } = await supabase
          .from('ordens_servico')
          .select('id, created_at, numero, status, valor_total, clientes(nome), veiculos(placa, marca, modelo)')
          .gte('created_at', startISO).lte('created_at', endISO).order('created_at')
        ;(data || []).forEach(o => add(o.created_at.split('T')[0], {
          id: o.id, type: 'os', status: o.status,
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
          .lte('check_in', endDate).gte('check_out', startDate).order('check_in')
        ;(data || []).forEach(r => {
          if (r.check_in >= startDate && r.check_in <= endDate)
            add(r.check_in, {
              id: r.id, type: 'reserva', status: r.status,
              label: r.nome_hospede,
              sublabel: `Qto ${r.quartos?.numero || '?'} · Check-in`,
              value: r.valor_total, color: '#34D399', tag: 'checkin',
            })
          if (r.check_out >= startDate && r.check_out <= endDate)
            add(r.check_out, {
              id: r.id, type: 'reserva', status: r.status,
              label: r.nome_hospede,
              sublabel: `Qto ${r.quartos?.numero || '?'} · Check-out`,
              value: r.valor_total, color: '#A78BFA', tag: 'checkout',
            })
        })
      }

      if (loadSeqRef.current === seq) setEvents(map)
    } catch (e) { console.error(e) }
    finally { if (loadSeqRef.current === seq) setLoading(false) }
  }, [year, month, businessType])

  useEffect(() => { loadEvents() }, [loadEvents])

  // Auto-calc hotel total
  useEffect(() => {
    if (modal !== 'hotel') return
    const dias = diffDias(form.check_in, form.check_out)
    setForm(f => ({ ...f, valor_total: dias * Number(f.valor_diaria || 0) }))
  }, [form.check_in, form.check_out, form.valor_diaria, modal])

  // ── Open creation modal ──
  const openCreate = async () => {
    if (businessType === 'hotel') {
      const { data: q } = await supabase.from('quartos').select('id, numero, tipo, preco_diaria').order('numero')
      setAuxData(a => ({ ...a, quartos: q || [] }))
      setForm({ ...EMPTY_HOTEL, check_in: selected || '' })
      setModal('hotel')
    } else if (businessType === 'oficina') {
      const [{ data: v }, { data: c }] = await Promise.all([
        supabase.from('veiculos').select('id, placa, marca, modelo, cliente_id').order('placa'),
        supabase.from('clientes').select('id, nome').order('nome'),
      ])
      setAuxData(a => ({ ...a, veiculos: v || [], clientes: c || [] }))
      setForm({ ...EMPTY_OS, data_previsao: selected || '' })
      setModal('oficina')
    }
  }

  // ── Save hotel reservation ──
  const saveHotel = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await supabase.from('reservas').insert({
        nome_hospede: form.nome_hospede,
        quarto_id: form.quarto_id || null,
        check_in: form.check_in,
        check_out: form.check_out,
        valor_diaria: Number(form.valor_diaria) || 0,
        valor_total: Number(form.valor_total) || 0,
        status: 'confirmada',
      })
      setModal(null)
      await loadEvents()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  // ── Save OS ──
  const saveOS = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { count } = await supabase.from('ordens_servico').select('*', { count: 'exact', head: true })
      const numero = `OS-${String((count || 0) + 1).padStart(4, '0')}`
      await supabase.from('ordens_servico').insert({
        numero,
        veiculo_id: form.veiculo_id || null,
        cliente_id: form.cliente_id || null,
        descricao: form.descricao,
        valor_mao_obra: Number(form.valor_mao_obra) || 0,
        valor_total: Number(form.valor_mao_obra) || 0,
        data_previsao: form.data_previsao || null,
        status: 'aberta',
      })
      setModal(null)
      await loadEvents()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  // ── Status quick-change ──
  const changeStatus = async (ev, newStatus) => {
    try {
      if (ev.type === 'reserva') {
        await supabase.from('reservas').update({ status: newStatus }).eq('id', ev.id)
      } else if (ev.type === 'os') {
        const upd = { status: newStatus }
        if (newStatus === 'concluida') upd.data_conclusao = new Date().toISOString()
        await supabase.from('ordens_servico').update(upd).eq('id', ev.id)
      } else if (ev.type === 'parcela') {
        await supabase.from('parcelas_crediario').update({
          status: newStatus,
          data_pagamento: new Date().toISOString().split('T')[0],
        }).eq('id', ev.id)
      }
      await loadEvents()
    } catch (e) { console.error(e) }
  }

  // ── Open payment modal ──
  const openPayModal = (ev) => {
    setPayModal({ ev, valor: String(ev.value || ''), forma: 'dinheiro', step: 'payment', saldoInicial: '' })
  }

  // ── Confirm payment → movimentacao_extra + status update ──
  const confirmPayment = async (e) => {
    e.preventDefault()
    const { ev, valor, forma, step, saldoInicial } = payModal
    const today = new Date().toISOString().split('T')[0]
    setSaving(true)
    try {
      // Find user's open caixa for today
      let { data: caixaHoje } = await supabase
        .from('caixas')
        .select('id')
        .eq('user_id', user.id)
        .eq('data', today)
        .eq('status', 'aberto')
        .maybeSingle()

      // No open caixa → ask user to open one first
      if (!caixaHoje && step === 'payment') {
        setPayModal(p => ({ ...p, step: 'open_caixa' }))
        setSaving(false)
        return
      }

      // User just filled saldo_inicial → open caixa now
      if (!caixaHoje && step === 'open_caixa') {
        const { data: novo, error } = await supabase
          .from('caixas')
          .insert({ data: today, saldo_inicial: Number(saldoInicial) || 0, status: 'aberto', user_id: user.id })
          .select('id').single()
        if (error) { setSaving(false); return }
        caixaHoje = novo
      }

      const descricao = ev.type === 'os'
        ? `OS ${ev.label}${ev.sublabel ? ' — ' + ev.sublabel : ''}`
        : ev.type === 'reserva'
        ? `Check-out — ${ev.label}`
        : `Crediário — ${ev.label} (${ev.sublabel || ''})`

      // Register in caixa
      await supabase.from('movimentacoes_extras').insert({
        caixa_id: caixaHoje?.id || null,
        tipo: 'entrada',
        descricao,
        valor: Number(valor),
        forma_pagamento: forma,
      })

      // Update record status
      const newStatus = ev.type === 'os' ? 'concluida' : ev.type === 'reserva' ? 'checkout' : 'pago'
      await changeStatus(ev, newStatus)

      setPayModal(null)
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  // ── Calendar cells ──
  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const todayKey    = toKey(new Date())
  const numWeeks    = totalCells / 7

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDow + 1
    const date   = new Date(year, month, dayNum)
    const key    = toKey(date)
    return { date, key, dayNum, inMonth: dayNum >= 1 && dayNum <= daysInMonth, isToday: key === todayKey, evs: events[key] || [] }
  })

  const selectedEvs = selected ? (events[selected] || []) : []
  const canCreate   = businessType === 'hotel' || businessType === 'oficina'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 20px 12px', boxSizing: 'border-box' }}>

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

      {/* ── Day labels ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3, flexShrink: 0 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-subtle)', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${numWeeks}, 1fr)`,
        gap: 3, opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s',
      }}>
        {cells.map(({ date, key, inMonth, isToday, evs }) => (
          <div
            key={key}
            onClick={() => inMonth && setSelected(s => s === key ? null : key)}
            style={{
              background: selected === key ? 'rgba(16,185,129,0.09)' : isToday ? 'rgba(16,185,129,0.04)' : 'var(--bg-800)',
              border: `1px solid ${selected === key ? 'rgba(16,185,129,0.5)' : isToday ? 'rgba(16,185,129,0.28)' : 'var(--bg-600)'}`,
              borderRadius: 8, padding: '5px 6px',
              cursor: inMonth ? 'pointer' : 'default',
              opacity: inMonth ? 1 : 0.22,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', minHeight: 0,
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <span style={{
              fontSize: 12, fontWeight: isToday ? 700 : 400,
              color: isToday ? 'var(--amber)' : 'var(--text)',
              lineHeight: 1, marginBottom: 3, flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              {isToday && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', display: 'inline-block', flexShrink: 0 }} />}
              {date.getDate()}
            </span>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {evs.slice(0, 3).map((ev, i) => (
                <div key={i} style={{
                  background: ev.color + '22', borderLeft: `2px solid ${ev.color}`,
                  borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 600,
                  color: ev.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0,
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
            background: 'var(--bg-800)', borderLeft: '1px solid var(--bg-500)',
            zIndex: 100, display: 'flex', flexDirection: 'column',
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
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {canCreate && (
                  <button
                    onClick={openCreate}
                    style={{ ...btnBase, width: 32, height: 32, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--amber)' }}
                    title="Novo agendamento"
                  >
                    <Plus size={15} />
                  </button>
                )}
                <button onClick={() => setSelected(null)} style={{ ...btnBase, width: 32, height: 32, border: 'none', background: 'var(--bg-600)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Event list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {selectedEvs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 10 }}>
                  <CalendarDays size={36} color="var(--bg-500)" />
                  <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: 0 }}>Nenhum evento neste dia</p>
                  {canCreate && (
                    <button
                      onClick={openCreate}
                      style={{ ...btnBase, padding: '8px 16px', fontSize: 13, gap: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--amber)', borderRadius: 8 }}
                    >
                      <Plus size={14} />
                      {businessType === 'hotel' ? 'Nova reserva' : 'Nova OS'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {selectedEvs.map((ev, i) => (
                    <div key={i} style={{
                      background: 'var(--bg-700)', border: '1px solid var(--bg-500)',
                      borderLeft: `3px solid ${ev.color}`,
                      borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 3px' }}>{ev.label}</p>
                      {ev.sublabel && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 6px' }}>{ev.sublabel}</p>}
                      {ev.tag && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: ev.color, background: ev.color + '20', border: `1px solid ${ev.color}40`,
                          borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginBottom: 8,
                        }}>
                          {STATUS_LABEL[ev.tag] || ev.tag}
                        </span>
                      )}
                      {ev.value != null && Number(ev.value) > 0 && (
                        <p style={{ fontSize: 15, fontFamily: 'JetBrains Mono, monospace', color: ev.color, fontWeight: 700, margin: '0 0 10px' }}>
                          R$ {fmt(ev.value)}
                        </p>
                      )}

                      {/* ── Hotel quick actions ── */}
                      {ev.type === 'reserva' && ev.status === 'confirmada' && (
                        <button onClick={() => changeStatus(ev, 'checkin')} style={actionBtn('#34D399')}>
                          <LogIn size={13} /> Fazer Check-in
                        </button>
                      )}
                      {ev.type === 'reserva' && ev.status === 'checkin' && (
                        <button onClick={() => openPayModal(ev)} style={actionBtn('#A78BFA')}>
                          <LogOut size={13} /> Fazer Check-out
                        </button>
                      )}

                      {/* ── Oficina quick actions ── */}
                      {ev.type === 'os' && ev.status === 'aberta' && (
                        <button onClick={() => changeStatus(ev, 'em_andamento')} style={actionBtn('#F59E0B')}>
                          <Play size={13} /> Iniciar OS
                        </button>
                      )}
                      {ev.type === 'os' && ev.status === 'em_andamento' && (
                        <button onClick={() => openPayModal(ev)} style={actionBtn('#34D399')}>
                          <Wrench size={13} /> Concluir OS
                        </button>
                      )}

                      {/* ── Crediário quick action ── */}
                      {ev.type === 'parcela' && (
                        <button onClick={() => openPayModal(ev)} style={actionBtn('#34D399')}>
                          <CheckCircle size={13} /> Registrar pagamento
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add more button */}
                  {canCreate && (
                    <button
                      onClick={openCreate}
                      style={{ ...btnBase, width: '100%', padding: '9px 0', fontSize: 13, gap: 6, marginTop: 4, color: 'var(--text-muted)', border: '1px dashed var(--bg-500)', background: 'transparent', borderRadius: 8 }}
                    >
                      <Plus size={14} />
                      {businessType === 'hotel' ? 'Nova reserva neste dia' : 'Nova OS neste dia'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Pagamento ── */}
      {payModal && (
        <Modal
          title={
            payModal.step === 'open_caixa' ? 'Abrir caixa para continuar'
            : payModal.ev.type === 'os' ? 'Concluir OS — Receber pagamento'
            : payModal.ev.type === 'reserva' ? 'Check-out — Receber pagamento'
            : 'Registrar pagamento de parcela'
          }
          onClose={() => setPayModal(null)}
        >
          <form onSubmit={confirmPayment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Etapa: sem caixa aberto ── */}
            {payModal.step === 'open_caixa' ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <DollarSign size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Nenhum caixa aberto hoje. Informe o saldo inicial para abrir o caixa e registrar o pagamento em seguida.
                  </p>
                </div>
                <div>
                  <Label>Troco inicial / Saldo em caixa (R$)</Label>
                  <input
                    type="number" step="0.01" min="0"
                    style={inp}
                    value={payModal.saldoInicial}
                    onChange={e => setPayModal(p => ({ ...p, saldoInicial: e.target.value }))}
                    placeholder="0,00"
                    autoFocus
                  />
                </div>
              </>
            ) : (
              <>
                {/* Info do evento */}
                <div style={{
                  background: 'var(--bg-700)', border: '1px solid var(--bg-500)',
                  borderRadius: 10, padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{payModal.ev.label}</p>
                  {payModal.ev.sublabel && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{payModal.ev.sublabel}</p>
                  )}
                </div>

                {/* Valor */}
                <div>
                  <Label>Valor recebido (R$) *</Label>
                  <input
                    type="number" step="0.01" min="0.01" required
                    style={inp}
                    value={payModal.valor}
                    onChange={e => setPayModal(p => ({ ...p, valor: e.target.value }))}
                    autoFocus
                  />
                </div>

                {/* Forma de pagamento */}
                <div>
                  <Label>Forma de pagamento *</Label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {FORMAS.map(f => (
                      <button
                        key={f} type="button"
                        onClick={() => setPayModal(p => ({ ...p, forma: f }))}
                        style={{
                          padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          border: payModal.forma === f ? '1px solid var(--amber)' : '1px solid var(--bg-500)',
                          background: payModal.forma === f ? 'rgba(16,185,129,0.12)' : 'var(--bg-700)',
                          color: payModal.forma === f ? 'var(--amber)' : 'var(--text-muted)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {FORMA_LABEL[f]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
              <button type="button" onClick={() => setPayModal(null)} style={{ ...btnBase, padding: '9px 18px', fontSize: 14 }}>
                Cancelar
              </button>
              <button
                type="submit" disabled={saving}
                style={{ ...btnBase, padding: '9px 18px', fontSize: 14, fontWeight: 600, background: 'var(--amber)', border: 'none', color: '#fff', gap: 6, opacity: saving ? 0.7 : 1 }}
              >
                <DollarSign size={14} />
                {saving ? 'Processando...'
                  : payModal.step === 'open_caixa' ? 'Abrir caixa e registrar'
                  : 'Confirmar pagamento'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Nova Reserva (Hotel) ── */}
      {modal === 'hotel' && (
        <Modal title="Nova Reserva" onClose={() => setModal(null)}>
          <form onSubmit={saveHotel} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>Nome do hóspede *</Label>
              <input required style={inp} value={form.nome_hospede}
                onChange={e => setForm(f => ({ ...f, nome_hospede: e.target.value }))}
                placeholder="Nome completo" />
            </div>
            <div>
              <Label>Quarto</Label>
              <select style={inp} value={form.quarto_id}
                onChange={e => {
                  const q = auxData.quartos.find(q => q.id === e.target.value)
                  setForm(f => ({ ...f, quarto_id: e.target.value, valor_diaria: q?.preco_diaria || 0 }))
                }}>
                <option value="">Selecione...</option>
                {auxData.quartos.map(q => (
                  <option key={q.id} value={q.id}>
                    Qto {q.numero} — {q.tipo} — R$ {fmt(q.preco_diaria)}/dia
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label>Check-in *</Label>
                <input required type="date" style={inp} value={form.check_in}
                  onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} />
              </div>
              <div>
                <Label>Check-out *</Label>
                <input required type="date" style={inp} value={form.check_out}
                  min={form.check_in}
                  onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label>Valor/dia (R$)</Label>
                <input type="number" min="0" step="0.01" style={inp} value={form.valor_diaria}
                  onChange={e => setForm(f => ({ ...f, valor_diaria: e.target.value }))} />
              </div>
              <div>
                <Label>Total (R$)</Label>
                <input readOnly style={{ ...inp, opacity: 0.6 }} value={fmt(form.valor_total)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
              <button type="button" onClick={() => setModal(null)} style={{ ...btnBase, padding: '9px 18px', fontSize: 14 }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ ...btnBase, padding: '9px 18px', fontSize: 14, fontWeight: 600, background: 'var(--amber)', border: 'none', color: '#fff', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Criar reserva'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Nova OS (Oficina) ── */}
      {modal === 'oficina' && (
        <Modal title="Nova Ordem de Serviço" onClose={() => setModal(null)}>
          <form onSubmit={saveOS} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>Veículo</Label>
              <select style={inp} value={form.veiculo_id}
                onChange={e => {
                  const v = auxData.veiculos.find(v => v.id === e.target.value)
                  setForm(f => ({ ...f, veiculo_id: e.target.value, cliente_id: v?.cliente_id || f.cliente_id }))
                }}>
                <option value="">Selecione...</option>
                {auxData.veiculos.map(v => (
                  <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Cliente</Label>
              <select style={inp} value={form.cliente_id}
                onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {auxData.clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Descrição do serviço *</Label>
              <textarea required rows={3} style={{ ...inp, resize: 'vertical' }} value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o serviço a realizar..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label>Mão de obra (R$)</Label>
                <input type="number" min="0" step="0.01" style={inp} value={form.valor_mao_obra}
                  onChange={e => setForm(f => ({ ...f, valor_mao_obra: e.target.value }))} />
              </div>
              <div>
                <Label>Previsão de entrega</Label>
                <input type="date" style={inp} value={form.data_previsao}
                  onChange={e => setForm(f => ({ ...f, data_previsao: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
              <button type="button" onClick={() => setModal(null)} style={{ ...btnBase, padding: '9px 18px', fontSize: 14 }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ ...btnBase, padding: '9px 18px', fontSize: 14, fontWeight: 600, background: 'var(--amber)', border: 'none', color: '#fff', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Criar OS'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function actionBtn(color) {
  return {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    color, background: color + '18', border: `1px solid ${color}40`,
    borderRadius: 6, padding: '6px 12px',
    fontFamily: 'DM Sans, sans-serif',
  }
}
