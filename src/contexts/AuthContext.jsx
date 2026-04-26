import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadSubscription = async (userId) => {
    if (!userId) return setSubscription(null)

    // Expira trial no servidor antes de ler o status — não pode ser interceptado pelo cliente
    await supabase.rpc('expire_trial_if_needed', { p_user_id: userId })

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Aplica business_type pendente do onboarding (caso email confirmation esteja ativo)
    const pendingType = localStorage.getItem('pending_business_type')
    if (pendingType && data) {
      await supabase
        .from('subscriptions')
        .update({ business_type: pendingType })
        .eq('user_id', userId)
      localStorage.removeItem('pending_business_type')
      setSubscription({ ...data, business_type: pendingType })
    } else {
      setSubscription(data)
    }
  }

  const updateSubscription = async (fields) => {
    if (!user?.id) return { error: 'Não autenticado' }
    const { error } = await supabase
      .from('subscriptions')
      .update(fields)
      .eq('user_id', user.id)
    if (!error) setSubscription(prev => ({ ...prev, ...fields }))
    return { error }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        supabase.auth.signOut()
        setUser(null)
        setLoading(false)
        return
      }
      setUser(session?.user ?? null)
      await loadSubscription(session?.user?.id)
      setLoading(false)
    })

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      loadSubscription(session?.user?.id)
      if (event === 'SIGNED_OUT') navigate('/')
    })

    return () => authSub.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password, metadata = {}) =>
    supabase.auth.signUp({ email, password, options: { data: metadata } })

  const signOut = () => supabase.auth.signOut()

  const trialDaysLeft = subscription?.status === 'trial' && subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at) - new Date()) / 86400000))
    : null

  // Checa a data client-side também (belt-and-suspenders): o RPC já terá
  // atualizado o status no DB, mas na mesma sessão o estado local pode
  // ainda ter 'trial' antes do próximo loadSubscription.
  const trialExpiredLocally = subscription?.status === 'trial' && subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at) < new Date()
    : false

  const isBanned   = subscription?.status === 'banned'
                  || subscription?.status === 'expired'
                  || trialExpiredLocally
  const isActive   = subscription?.status === 'active'
  const isTrial    = subscription?.status === 'trial' && !trialExpiredLocally
  const businessType = subscription?.business_type ?? 'estoque'
  const businessName = subscription?.business_name ?? ''

  return (
    <AuthContext.Provider value={{
      user, loading, subscription,
      trialDaysLeft, isBanned, isActive, isTrial,
      businessType, businessName,
      signIn, signUp, signOut, loadSubscription, updateSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
