import { supabaseAdmin } from './supabase'
import type { Session } from './types'

export async function createSession(
  userType: 'admin' | 'teacher',
  userId: string
): Promise<string | null> {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({ user_type: userType, user_id: userId, expires_at: expiresAt })
    .select('token')
    .single()

  if (error || !data) return null
  return data.token
}

export async function verifySession(
  token: string | null
): Promise<Session | null> {
  if (!token) return null

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null
  return data as Session
}

export async function verifyAdminSession(token: string | null): Promise<boolean> {
  const session = await verifySession(token)
  return session?.user_type === 'admin'
}

export async function deleteSession(token: string): Promise<void> {
  await supabaseAdmin.from('sessions').delete().eq('token', token)
}

export function getTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}
