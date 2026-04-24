import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency as fmt } from '../../utils/format'
import { Lock, Unlock, DollarSign, AlertTriangle } from 'lucide-react'
import Label from '../ui/FormLabel'

function GateModal({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-800)',
        border: '1px solid var(--bg-500)',
        borderRadius: 16,
        width: '100%', maxWidth: 460,
        boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
      }}>
        {children}
      </div>
    </div>
  )
}

export default function CaixaGatekeeper({ children }) {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const sessionKey = `st_caixa_gate_${user?.id}_${today}`

  const [step, setStep]               = useState('checking') // checking | close | open | done
  const [previousCaixa, setPreviousCaixa] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  // Close previous caixa
  const [saldoContado, setSaldoContado] = useState('')
  const [obs, setObs]                   = useState('')

  // Open today's caixa
  const [saldoInicial, setSaldoInicial] = useState('')

  useEffect(() => {
    if (!user) return
    if (sessionStorage.getItem(sessionKey) === 'done') {
      setStep('done')
      return
    }
    checkCaixa()
  }, [user])

  async function checkCaixa() {
    // 1. Look for an open caixa from a previous day for this user
    const { data: prev } = await supabase
      .from('caixas')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'aberto')
      .lt('data', today)
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (prev) {
      setPreviousCaixa(prev)
      setStep('close')
      return
    }

    // 2. Check if today's caixa already exists
    const { data: todayCaixa } = await supabase
      .from('caixas')
      .select('id')
      .eq('user_id', user.id)
      .eq('data', today)
      .maybeSingle()

    if (todayCaixa) {
      markDone()
    } else {
      setStep('open')
    }
  }

  async function handleClosePrevious(e) {
    e.preventDefault()
    if (!saldoContado) return setError('Informe o saldo contado.')
    setError('')
    setSaving(true)
    const { error: err } = await supabase
      .from('caixas')
      .update({
        status: 'fechado',
        saldo_final: Number(saldoContado),
        observacoes: obs || null,
        fechado_at: new Date().toISOString(),
      })
      .eq('id', previousCaixa.id)
    setSaving(false)
    if (err) return setError(err.message)

    // After closing, check if today's caixa exists
    const { data: todayCaixa } = await supabase
      .from('caixas')
      .select('id')
      .eq('user_id', user.id)
      .eq('data', today)
      .maybeSingle()

    if (todayCaixa) {
      markDone()
    } else {
      setStep('open')
    }
  }

  async function handleOpenToday(e) {
    e.preventDefault()
    if (!saldoInicial && saldoInicial !== '0') return setError('Informe o valor inicial do caixa.')
    setError('')
    setSaving(true)
    const { error: err } = await supabase
      .from('caixas')
      .insert({ data: today, saldo_inicial: Number(saldoInicial), status: 'aberto', user_id: user.id })
    setSaving(false)
    if (err) return setError(err.message)
    markDone()
  }

  function markDone() {
    sessionStorage.setItem(sessionKey, 'done')
    setStep('done')
  }

  if (step === 'checking') return null
  if (step === 'done') return children

  // ── Modal: Fechar caixa anterior ──────────────────────────
  if (step === 'close') return (
    <>
      {children}
      <GateModal>
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8, padding: '6px 12px', marginBottom: 16,
          }}>
            <AlertTriangle size={14} color="var(--red)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>Caixa pendente</span>
          </div>
          <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Fechar caixa anterior
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
            O caixa do dia <strong style={{ color: 'var(--text)' }}>
              {new Date(previousCaixa.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </strong> ainda está aberto. Feche-o antes de continuar.
          </p>

          <div style={{
            background: 'var(--bg-700)', border: '1px solid var(--bg-500)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            display: 'flex', gap: 24,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 4 }}>Saldo inicial</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {fmt(previousCaixa.saldo_inicial || 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginBottom: 4 }}>Data</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                {new Date(previousCaixa.data + 'T12:00:00').toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleClosePrevious} style={{ padding: '0 24px 24px' }}>
          <div style={{ marginBottom: 14 }}>
            <Label>Saldo contado (R$) *</Label>
            <input
              type="number" step="0.01" min="0"
              value={saldoContado}
              onChange={e => setSaldoContado(e.target.value)}
              placeholder="0,00"
              className="input"
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <Label>Observações</Label>
            <input
              type="text"
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Opcional"
              className="input"
            />
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, border: 'none', opacity: saving ? 0.7 : 1 }}
          >
            <Lock size={15} /> {saving ? 'Fechando...' : 'Fechar caixa e continuar'}
          </button>
        </form>
      </GateModal>
    </>
  )

  // ── Modal: Abrir caixa de hoje ────────────────────────────
  return (
    <>
      {children}
      <GateModal>
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 8, padding: '6px 12px', marginBottom: 16,
          }}>
            <DollarSign size={14} color="var(--amber)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)' }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Abrir caixa do dia
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
            Informe o valor inicial em dinheiro disponível no caixa para começar o dia.
          </p>
        </div>

        <form onSubmit={handleOpenToday} style={{ padding: '0 24px 24px' }}>
          <div style={{ marginBottom: 20 }}>
            <Label>Troco inicial / Saldo em caixa (R$) *</Label>
            <input
              type="number" step="0.01" min="0"
              value={saldoInicial}
              onChange={e => setSaldoInicial(e.target.value)}
              placeholder="0,00"
              className="input"
              autoFocus
            />
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, border: 'none', opacity: saving ? 0.7 : 1 }}
          >
            <Unlock size={15} /> {saving ? 'Abrindo...' : 'Abrir caixa e entrar'}
          </button>
        </form>
      </GateModal>
    </>
  )
}
