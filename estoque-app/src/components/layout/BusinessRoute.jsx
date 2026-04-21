import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function BusinessRoute({ children, allow }) {
  const { businessType } = useAuth()
  if (!allow.includes(businessType)) return <Navigate to="/app/dashboard" replace />
  return children
}
