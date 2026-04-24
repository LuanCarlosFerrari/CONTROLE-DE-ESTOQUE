import { useState, useEffect } from 'react'
import { Clock, X, Zap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { createPaymentPreference } from '../../lib/mercadopago'

function pad(n) {
  return String(n).padStart(2, '0')
}

export default function TrialBanner() {
  const { subscription, isTrial } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [loadingPay, setLoadingPay] = useState(false)

  const handlePagar = async () => {
    setLoadingPay(true)
    try {
      const url = await createPaymentPreference()
      window.location.href = url
    } catch {
      setLoadingPay(false)
    }
  }

  useEffect(() => {
    if (!isTrial || !subscription?.trial_ends_at) return

    const calc = () => {
      const diff = new Date(subscription.trial_ends_at) - new Date()
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
      const days    = Math.floor(diff / 86400000)
      const hours   = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ days, hours, minutes, seconds, expired: false })
    }

    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [isTrial, subscription])

  if (!isTrial || !timeLeft || dismissed) return null

  const isUrgent  = timeLeft.days <= 1
  const isWarning = timeLeft.days <= 3

  const color     = isUrgent ? 'var(--red)' : isWarning ? '#FB923C' : 'var(--warning)'
  const bg        = isUrgent ? 'rgba(239,68,68,0.08)' : isWarning ? 'rgba(249,115,22,0.08)' : 'rgba(245,158,11,0.08)'
  const borderCol = isUrgent ? 'rgba(239,68,68,0.25)' : isWarning ? 'rgba(249,115,22,0.25)' : 'rgba(245,158,11,0.2)'

  const dismissBtn = (
    <button
      onClick={() => setDismissed(true)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', display: 'flex', padding: 2, flexShrink: 0 }}
      title="Dispensar"
    >
      <X size={14} />
    </button>
  )

  const countdown = (
    <div className="trial-banner-center" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {[
        { val: pad(timeLeft.days),    label: 'dias' },
        { val: pad(timeLeft.hours),   label: 'horas' },
        { val: pad(timeLeft.minutes), label: 'min' },
        { val: pad(timeLeft.seconds), label: 'seg' },
      ].map(({ val, label }, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            background: 'var(--bg-700)',
            border: `1px solid ${borderCol}`,
            borderRadius: 6,
            padding: '4px 8px',
            textAlign: 'center',
            minWidth: 42,
          }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>
              {val}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
              {label}
            </div>
          </div>
          {i < 3 && <span style={{ color: 'var(--text-subtle)', fontSize: 14, fontWeight: 700 }}>:</span>}
        </div>
      ))}
    </div>
  )

  const assinarbtn = (
    <button
      onClick={handlePagar}
      disabled={loadingPay}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: color, color: '#000',
        fontWeight: 700, fontSize: 12,
        padding: '6px 14px', borderRadius: 6,
        border: 'none', whiteSpace: 'nowrap',
        cursor: loadingPay ? 'not-allowed' : 'pointer',
        opacity: loadingPay ? 0.7 : 1,
        transition: 'opacity 0.2s',
        flexShrink: 0,
      }}
    >
      <Zap size={12} /> {loadingPay ? 'Aguarde...' : 'Assinar agora'}
    </button>
  )

  return (
    <div className="trial-banner-wrap" style={{
      background: bg,
      borderBottom: `1px solid ${borderCol}`,
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      position: 'relative',
    }}>

      {/* Linha 1 desktop / Linha 1 mobile: label + dismiss */}
      <div className="trial-banner-left" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Clock size={15} color={color} />
        <span style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>
          {timeLeft.expired ? 'Trial expirado!' : 'Trial gratuito —'}
        </span>
        {!timeLeft.expired && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {timeLeft.days > 0
              ? `${timeLeft.days}d ${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m restantes`
              : `${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s restantes`}
          </span>
        )}
        {/* X visível só no mobile, dentro da linha 1 */}
        <span className="trial-banner-dismiss-mobile" style={{ display: 'none', marginLeft: 'auto' }}>
          {dismissBtn}
        </span>
      </div>

      {/* Contador central (desktop: absolute center; mobile: linha 2 via .trial-banner-bottom) */}
      {countdown}

      {/* Linha direita desktop / Linha 2 mobile: contador + botão */}
      <div className="trial-banner-bottom" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {assinarbtn}
        {/* X visível só no desktop */}
        <span className="trial-banner-dismiss-desktop">
          {dismissBtn}
        </span>
      </div>

    </div>
  )
}
