import { useEffect, useRef, useState } from 'react'
import { Lock, Copy, Check, MessageCircle, QrCode, RefreshCw, Clock } from 'lucide-react'
import QRCode from 'qrcode'
import { gerarPixPayload } from '../../lib/pix'
import { useAuth } from '../../contexts/AuthContext'

const PIX_CHAVE  = import.meta.env.VITE_PIX_ASSINATURA_CHAVE  || ''
const PIX_NOME   = import.meta.env.VITE_PIX_ASSINATURA_NOME   || 'STOCKTAG'
const PIX_CIDADE = import.meta.env.VITE_PIX_ASSINATURA_CIDADE || 'BRASIL'
const WHATSAPP   = import.meta.env.VITE_WHATSAPP_CONTATO      || ''

const VALOR_MENSAL = 129

const PLANS = [
  { months: 1,  label: '1 mes',    discount: 0,  perMonth: VALOR_MENSAL },
  { months: 3,  label: '3 meses',  discount: 20, perMonth: VALOR_MENSAL * 0.8 },
  { months: 12, label: '12 meses', discount: 40, perMonth: VALOR_MENSAL * 0.6 },
]

const MAX_POLLS = 72

function fmt(n) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TrialExpired() {
  const { user, signOut, loadSubscription } = useAuth()
  const canvasRef  = useRef(null)
  const pollRef    = useRef(null)
  const pollCount  = useRef(0)

  const [selectedMonths, setSelectedMonths] = useState(1)
  const [copied, setCopied]       = useState(false)
  const [pixPayload, setPixPayload] = useState('')
  const [polling, setPolling]     = useState(false)
  const [notified, setNotified]   = useState(false)
  const [notifyError, setNotifyError] = useState(false)

  const plan  = PLANS.find(p => p.months === selectedMonths)
  const total = plan.perMonth * plan.months
  const txid  = (user?.id || '').replace(/-/g, '').slice(0, 25)

  useEffect(() => {
    if (!PIX_CHAVE) return
    const payload = gerarPixPayload({
      chave: PIX_CHAVE,
      nome: PIX_NOME,
      cidade: PIX_CIDADE,
      valor: total,
      txid,
      descricao: `StockTag ${plan.label}`,
    })
    setPixPayload(payload)
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, payload, {
        width: 200, margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    }
  }, [txid, selectedMonths])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const startPolling = () => {
    pollCount.current = 0
    setPolling(true)
    pollRef.current = setInterval(async () => {
      pollCount.current += 1
      await loadSubscription(user?.id)
      if (pollCount.current >= MAX_POLLS) {
        clearInterval(pollRef.current)
        setPolling(false)
      }
    }, 5000)
  }

  const handleAlreadyPaid = async () => {
    if (notified) {
      if (!polling) startPolling()
      return
    }
    setNotified(true)
    setNotifyError(false)

    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: user?.id,
            email: user?.email,
            months: selectedMonths,
            total,
          }),
        }
      )
    } catch {
      setNotifyError(true)
    }

    startPolling()
  }

  const handleCopy = () => {
    if (!pixPayload) return
    navigator.clipboard.writeText(pixPayload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const whatsappMsg = encodeURIComponent(
    `Olá! Fiz o PIX de R$ ${fmt(total)} para assinar o StockTag (${plan.label}). Meu e-mail: ${user?.email}`
  )
  const whatsappUrl = WHATSAPP
    ? `https://wa.me/55${WHATSAPP.replace(/\D/g, '')}?text=${whatsappMsg}`
    : null

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} className="landing-grid">
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Lock size={28} color="#F87171" />
          </div>
          <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            Trial encerrado
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7 }}>
            Seu período gratuito expirou. Escolha um plano e continue usando o{' '}
            <strong style={{ color: 'var(--text)' }}>StockTag</strong>.
          </p>
        </div>

        {/* Seletor de planos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {PLANS.map(p => {
            const isActive = p.months === selectedMonths
            const planTotal = p.perMonth * p.months
            return (
              <button
                key={p.months}
                onClick={() => { setSelectedMonths(p.months); setCopied(false) }}
                style={{
                  background: isActive ? 'rgba(16,185,129,0.1)' : 'var(--bg-800)',
                  border: `1px solid ${isActive ? 'rgba(16,185,129,0.4)' : 'var(--bg-500)'}`,
                  borderRadius: 12, padding: '14px 10px', cursor: 'pointer',
                  textAlign: 'center', transition: 'all 0.2s', position: 'relative',
                }}
              >
                {p.discount > 0 && (
                  <span style={{
                    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--amber)', color: '#000', fontSize: 10, fontWeight: 700,
                    borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap',
                  }}>
                    -{p.discount}%
                  </span>
                )}
                <p style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#34D399' : 'var(--text-muted)', marginBottom: 6 }}>
                  {p.label}
                </p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  R$ {fmt(planTotal)}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '3px 0 0' }}>
                  R$ {fmt(p.perMonth)}/mês
                </p>
              </button>
            )
          })}
        </div>

        {/* Card PIX */}
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
          {/* Resumo do plano selecionado */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))',
            borderBottom: '1px solid rgba(16,185,129,0.2)',
            padding: '16px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 4 }}>
                {plan.label} {plan.discount > 0 ? `· ${plan.discount}% de desconto` : ''}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 30, fontWeight: 800, color: 'var(--text)' }}>
                  R$ {fmt(total)}
                </span>
                {plan.months > 1 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    = R$ {fmt(plan.perMonth)}/mês
                  </span>
                )}
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Todos os módulos', 'Dados ilimitados', 'Suporte via WhatsApp'].map(item => (
                <li key={item} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--amber)' }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* QR + copy */}
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {PIX_CHAVE ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <QrCode size={13} color="var(--text-subtle)" />
                  <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Escaneie com o app do banco ou copie o código</span>
                </div>

                <div style={{ background: '#fff', borderRadius: 12, padding: 8, border: '1px solid var(--bg-500)', lineHeight: 0 }}>
                  <canvas ref={canvasRef} />
                </div>

<button onClick={handleCopy} style={{
                  width: '100%', padding: '11px', borderRadius: 10,
                  background: copied ? 'rgba(52,211,153,0.1)' : 'var(--bg-700)',
                  border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'var(--bg-500)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  color: copied ? '#34D399' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Código copiado!' : 'PIX Copia e Cola'}
                </button>
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#F87171', textAlign: 'center' }}>
                Chave PIX não configurada. Entre em contato com o suporte.
              </p>
            )}
          </div>
        </div>

        {/* Após pagar */}
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--bg-500)', borderRadius: 14, padding: '20px 24px', marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 14 }}>
            Após o pagamento
          </p>

          {polling && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 10, padding: '12px 14px', marginBottom: 12,
            }}>
              <Clock size={15} color="var(--amber)" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', margin: 0 }}>
                  Aguardando confirmação…
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-subtle)', margin: '2px 0 0' }}>
                  {notifyError
                    ? 'Avise o admin pelo WhatsApp abaixo. O sistema verifica automaticamente a cada 5s.'
                    : 'Admin foi notificado. O sistema libera automaticamente assim que o pagamento for confirmado.'}
                </p>
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <RefreshCw size={14} color="var(--text-subtle)" style={{ marginLeft: 'auto', flexShrink: 0, animation: 'spin 2s linear infinite' }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleAlreadyPaid} disabled={polling} style={{
              width: '100%', padding: '11px',
              background: polling ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${polling ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.25)'}`,
              borderRadius: 10, cursor: polling ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: polling ? 'var(--text-subtle)' : 'var(--amber)',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}>
              <RefreshCw size={14} />
              {polling ? 'Verificando automaticamente…' : notified ? 'Verificar novamente' : 'Já paguei — notificar e verificar'}
            </button>

            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{
                width: '100%', padding: '11px',
                background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)',
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                color: '#25D366', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.2s',
              }}>
                <MessageCircle size={14} />
                Enviar comprovante via WhatsApp
              </a>
            )}
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 12, lineHeight: 1.6, textAlign: 'center' }}>
            Após a confirmação, seu acesso é liberado automaticamente — sem precisar fazer nada.
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', fontSize: 13, textDecoration: 'underline' }}>
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}
