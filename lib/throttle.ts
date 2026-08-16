import { supabaseAdmin } from './supabaseAdmin'

// Brute-force protection: count failed attempts per identity (a username or a
// student id) and lock that identity for a cooldown after too many failures.
// Keyed by identity — NOT by IP — so one student's typos never lock a whole
// school that shares one public IP. All calls fail OPEN (a DB hiccup never
// blocks a legitimate login).

export interface ThrottleOpts { max: number; windowMs: number; lockMs: number }

// Staff passwords: 5 tries, then a 15-minute lock.
export const LOGIN_THROTTLE: ThrottleOpts = { max: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 }
// Student 4-digit PINs: 5 tries, then a 10-minute lock.
export const PIN_THROTTLE: ThrottleOpts = { max: 5, windowMs: 10 * 60 * 1000, lockMs: 10 * 60 * 1000 }

// Is this identity currently locked? Returns seconds remaining if so.
export async function checkThrottle(key: string): Promise<{ locked: boolean; retryAfterSec: number }> {
  try {
    const { data } = await supabaseAdmin.from('auth_throttle').select('locked_until').eq('key', key).maybeSingle()
    if (data?.locked_until) {
      const ms = new Date(data.locked_until).getTime() - Date.now()
      if (ms > 0) return { locked: true, retryAfterSec: Math.ceil(ms / 1000) }
    }
  } catch {}
  return { locked: false, retryAfterSec: 0 }
}

// Record one failed attempt; lock the identity once it hits the limit.
export async function registerFailure(key: string, opts: ThrottleOpts): Promise<void> {
  try {
    const now = Date.now()
    const { data } = await supabaseAdmin.from('auth_throttle').select('fail_count, last_failed_at').eq('key', key).maybeSingle()
    let count = 1
    if (data?.last_failed_at) {
      const gap = now - new Date(data.last_failed_at).getTime()
      count = gap > opts.windowMs ? 1 : (data.fail_count ?? 0) + 1
    }
    const locked = count >= opts.max
    await supabaseAdmin.from('auth_throttle').upsert({
      key,
      fail_count: locked ? 0 : count, // reset after locking, so a fresh set of tries follows the cooldown
      locked_until: locked ? new Date(now + opts.lockMs).toISOString() : null,
      last_failed_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    })
  } catch {}
}

// Clear the counter on a successful login / PIN so normal users never trip it.
export async function clearThrottle(key: string): Promise<void> {
  try { await supabaseAdmin.from('auth_throttle').delete().eq('key', key) } catch {}
}

export function lockMessage(retryAfterSec: number): string {
  const min = Math.max(1, Math.ceil(retryAfterSec / 60))
  return `Too many incorrect attempts. Please try again in ${min} minute${min === 1 ? '' : 's'}.`
}
