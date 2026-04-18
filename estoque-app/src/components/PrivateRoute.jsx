import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TrialExpired from '../pages/TrialExpired'

export default function PrivateRoute({ children }) {
  const { user, loading, isBanned } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-900)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--bg-500)', borderTop: '2px solid var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (isBanned) return <TrialExpired />

  return children
}
