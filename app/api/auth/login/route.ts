import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createSession } from '@/lib/auth'
import { checkThrottle, registerFailure, clearThrottle, lockMessage, LOGIN_THROTTLE } from '@/lib/throttle'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
  const { username, password, userType } = await request.json()

  if (!username || !password || !userType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Brute-force lock, keyed by the login being attempted.
  const throttleKey = `login:${userType}:${String(username).toLowerCase()}`
  const lock = await checkThrottle(throttleKey)
  if (lock.locked) {
    return NextResponse.json({ error: lockMessage(lock.retryAfterSec) }, { status: 429 })
  }

  if (userType === 'admin') {
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('username', username)
      .single()

    if (!admin) {
      await registerFailure(throttleKey, LOGIN_THROTTLE)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) {
      await registerFailure(throttleKey, LOGIN_THROTTLE)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSession('admin', admin.id)
    if (!token) {
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
    }

    await clearThrottle(throttleKey)
    await logAudit(request, { action: 'login', actor: { type: 'admin', id: admin.id, name: username } })
    return NextResponse.json({ token, userType: 'admin', userName: username })
  }

  if (userType === 'teacher') {
    const { data: teacher } = await supabaseAdmin
      .from('teachers')
      .select('*')
      .eq('username', username)
      .eq('active', true)
      .single()

    if (!teacher) {
      await registerFailure(throttleKey, LOGIN_THROTTLE)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, teacher.password_hash)
    if (!valid) {
      await registerFailure(throttleKey, LOGIN_THROTTLE)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSession('teacher', teacher.id)
    if (!token) {
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
    }

    await clearThrottle(throttleKey)
    await logAudit(request, { action: 'login', school: teacher.school, actor: { type: 'teacher', id: teacher.id, name: teacher.name } })
    return NextResponse.json({ token, userType: 'teacher', userName: teacher.name, userId: teacher.id })
  }

  return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
}
