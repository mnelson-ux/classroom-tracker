import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkThrottle, registerFailure, clearThrottle, lockMessage, PIN_THROTTLE } from '@/lib/throttle'
import { getActiveProtectedWindow } from '@/lib/protected'
import { isUuid } from '@/lib/validate'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
const noStore = { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }

async function limits(school: string) {
  const { data } = await supabaseAdmin.from('settings').select('key, value').eq('school', school).in('key', ['nurse_capacity', 'queue_max'])
  const s: Record<string, string> = {}
  data?.forEach((r) => { s[r.key] = r.value })
  return { capacity: parseInt(s.nurse_capacity || '2'), queueMax: parseInt(s.queue_max || '5') }
}

async function rowsFor(school: string) {
  const { data } = await supabaseAdmin.from('nurse_visits').select('id, token, status, created_at').eq('school', school).order('created_at', { ascending: true })
  const all = data ?? []
  return { out: all.filter((r) => r.status === 'out'), waiting: all.filter((r) => r.status === 'waiting') }
}

// GET — anonymous summary for a school; if ?token= is given, that device's own status.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const school = url.searchParams.get('school')
  const token = url.searchParams.get('token')
  if (!school) return NextResponse.json({ error: 'Missing school' }, { status: 400 })
  const { capacity } = await limits(school)
  const { out, waiting } = await rowsFor(school)
  const resp: Record<string, unknown> = { capacity, out: out.length, waiting: waiting.length }
  if (token) {
    if (out.some((r) => r.token === token)) { resp.state = 'out' }
    else {
      const idx = waiting.findIndex((r) => r.token === token)
      if (idx < 0) resp.inLine = false
      else { resp.inLine = true; resp.position = idx + 1; resp.ready = idx === 0 && out.length < capacity }
    }
  }
  return NextResponse.json(resp, noStore)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { action, school } = body
  if (!school) return NextResponse.json({ error: 'Missing school' }, { status: 400 })

  // Is a signed-in staff member making this request? (teachers/admins skip the PIN)
  const staff = !!(await verifySession(getTokenFromRequest(request)))

  // Close / leave — identified only by the device's token.
  if (action === 'checkin' || action === 'leave') {
    if (!body.token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    await supabaseAdmin.from('nurse_visits').delete().eq('token', body.token)
    return NextResponse.json({ success: true }, noStore)
  }

  // Staff check one anonymous nurse visit back in (oldest first).
  if (action === 'checkin_one') {
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { out } = await rowsFor(school)
    if (out[0]) await supabaseAdmin.from('nurse_visits').delete().eq('id', out[0].id)
    const after = await rowsFor(school)
    return NextResponse.json({ out: after.out.length, waiting: after.waiting.length }, noStore)
  }

  // Claim an open spot when it's this device's turn.
  if (action === 'claim') {
    if (!body.token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    const { capacity } = await limits(school)
    const { out, waiting } = await rowsFor(school)
    const front = waiting[0]
    if (front && front.token === body.token && out.length < capacity) {
      await supabaseAdmin.from('nurse_visits').update({ status: 'out', created_at: new Date().toISOString() }).eq('token', body.token)
      return NextResponse.json({ state: 'out', token: body.token }, noStore)
    }
    const idx = waiting.findIndex((r) => r.token === body.token)
    return NextResponse.json({ notReady: true, position: idx >= 0 ? idx + 1 : null }, noStore)
  }

  // Kiosk (student) path: prove the student is real (PIN) but store NOTHING about
  // them. Staff-initiated passes skip this — a teacher's request is its own proof,
  // and it stays just as anonymous (still no student is recorded).
  if (!staff) {
    const { studentId, pin } = body
    if (!isUuid(studentId) || !pin) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { data: student } = await supabaseAdmin.from('students').select('id, school, pin_hash').eq('id', studentId).eq('active', true).single()
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const throttleKey = `pin:${studentId}`
    const lock = await checkThrottle(throttleKey)
    if (lock.locked) return NextResponse.json({ error: lockMessage(lock.retryAfterSec) }, { status: 429 })
    const ok = await bcrypt.compare(pin, student.pin_hash)
    if (!ok) { await registerFailure(throttleKey, PIN_THROTTLE); return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 }) }
    await clearThrottle(throttleKey)

    const active = await getActiveProtectedWindow(school)
    if (active) return NextResponse.json({ error: `Passes are paused right now${active.label ? ` (${active.label})` : ''}.`, protectedTime: true }, { status: 409 })
  }

  const { capacity, queueMax } = await limits(school)
  const { out, waiting } = await rowsFor(school)

  if (action === 'go') {
    // A spot is only free if there's room AND nobody is already waiting.
    if (out.length < capacity && waiting.length === 0) {
      const token = randomUUID()
      await supabaseAdmin.from('nurse_visits').insert({ token, school, status: 'out' })
      return NextResponse.json({ state: 'out', token }, noStore)
    }
    return NextResponse.json({ full: true, waiting: waiting.length, canQueue: waiting.length < queueMax }, noStore)
  }

  if (action === 'join') {
    if (waiting.length >= queueMax) return NextResponse.json({ error: `The nurse line is full (${queueMax} waiting).`, queueFull: true }, { status: 409 })
    const token = randomUUID()
    await supabaseAdmin.from('nurse_visits').insert({ token, school, status: 'waiting' })
    return NextResponse.json({ token, position: waiting.length + 1 }, noStore)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
