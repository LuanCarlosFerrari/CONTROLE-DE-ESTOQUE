import { useState } from 'react'
import { Lock, Zap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { createPaymentPreference } from '../../lib/mercadopago'

export default function TrialExpired() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePagar = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = await createPaymentPreference()
      window.location.href = url
    } catch (err) {
      setError('Não foi possível iniciar o pagamento. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} className="landing-grid">
      <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Lock size={32} color="var(--red)" />
        </div>

        <h1 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
          Período de trial encerrado
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
          Seu trial de 7 dias expirou. Para continuar usando o <strong style={{ color: 'var(--text)' }}>StockTag</strong>, assine um plano e mantenha seu negócio sempre organizado.
        </p>

        <div style={{
          background: 'var(--bg-800)', border: '1px solid var(--bg-500)',
          borderRadius: 12, padding: '24px', marginBottom: 28, textAlign: 'left'
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 16 }}>
            Plano mensal
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 36, fontWeight: 800, color: 'var(--text)' }}>R$ 129</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>/mês</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {['Estoque ilimitado', 'Clientes ilimitados', 'Relatórios completos', 'Suporte prioritário'].map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span style={{ color: 'var(--emerald)', fontSize: 16 }}>✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handlePagar}
          disabled={loading}
          className="btn-primary"
          style={{ display: 'inline-flex', padding: '13px 28px', fontSize: 15, marginBottom: 8, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', border: 'none' }}
        >
          <Zap size={16} /> {loading ? 'Redirecionando...' : 'Pagar com MercadoPago'}
        </button>

        {error && (
          <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ marginTop: 8 }}>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, textDecoration: 'underline' }}>
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}
