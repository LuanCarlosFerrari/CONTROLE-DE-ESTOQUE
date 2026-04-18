import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadSubscription = async (userId) => {
    if (!userId) return setSubscription(null)
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
    setSubscription(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadSubscription(session?.user?.id)
      setLoading(false)
    })

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadSubscription(session?.user?.id)
    })

    return () => authSub.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signOut = () => supabase.auth.signOut()

  // Dias restantes de trial
  const trialDaysLeft = subscription?.status === 'trial' && subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at) - new Date()) / 86400000))
    : null

  const isBanned = subscription?.status === 'banned' || subscription?.status === 'expired'
  const isActive = subscription?.status === 'active'
  const isTrial = subscription?.status === 'trial'

  return (
    <AuthContext.Provider value={{
      user, loading, subscription,
      trialDaysLeft, isBanned, isActive, isTrial,
      signIn, signUp, signOut, loadSubscription
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
