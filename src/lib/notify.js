import { supabase } from './supabase'

export async function notifyTelegram(type, payload = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token || !session?.user?.id) return
    const { error } = await supabase.functions.invoke('telegram-notify', {
      body: { type, payload, user_id: session.user.id },
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
    if (error) console.error('[telegram-notify]', type, error)
  } catch (e) {
    console.error('[telegram-notify]', type, e)
  }
}
