import { supabase } from './supabase'

export async function notifyTelegram(type, payload = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const headers = {}
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    const { error } = await supabase.functions.invoke('telegram-notify', {
      body: { type, payload },
      headers,
    })
    if (error) console.error('[telegram-notify]', type, error)
  } catch (e) {
    console.error('[telegram-notify]', type, e)
  }
}
