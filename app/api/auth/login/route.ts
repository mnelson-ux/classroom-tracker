import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { createSession } from '@/lib/auth'

export async function POST(request: Request) {
  const { username, password, userType } = await request.json()

  if (!username || !password || !userType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (userType === 'admin') {
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('username', username)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSession('admin', admin.id)
    if (!token) {
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
    }

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
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, teacher.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createSession('teacher', teacher.id)
    if (!token) {
      return NextResponse.json({ error: 'Session creation failed' }, { status: 500 })
    }

    return NextResponse.json({ token, userType: 'teacher', userName: teacher.name, userId: teacher.id })
  }

  return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
}
