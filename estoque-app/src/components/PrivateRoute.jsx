import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TrialExpired from '../pages/TrialExpired'

export default function PrivateRoute({ children }) {
  const { user, loading, isBanned, loadSubscription } = useAuth()
  const location = useLocation()
  const paymentSuccess = new URLSearchParams(location.search).get('payment') === 'success'

  // Quando o usuário retorna do MercadoPago após pagar, recarrega a subscription
  // após um breve delay para dar tempo ao webhook processar
  useEffect(() => {
    if (paymentSuccess && isBanned && user?.id) {
      const t = setTimeout(() => loadSubscription(user.id), 3000)
      return () => clearTimeout(t)
    }
  }, [paymentSuccess, isBanned, user?.id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-900)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--bg-500)', borderTop: '2px solid var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (isBanned && paymentSuccess) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-900)', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '2px solid var(--bg-500)', borderTop: '2px solid var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Pagamento recebido! Ativando sua conta...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (isBanned) return <TrialExpired />

  return children
}
