import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

// This route only works when no admin account exists yet
export async function POST(request: Request) {
  const { data: existing } = await supabaseAdmin
    .from('admins')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Admin account already exists' }, { status: 403 })
  }

  const { username, password } = await request.json()
  if (!username || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Username required; password must be at least 8 characters' },
      { status: 400 }
    )
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { error } = await supabaseAdmin
    .from('admins')
    .insert({ username, password_hash })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function GET() {
  const { data } = await supabaseAdmin.from('admins').select('id').limit(1).single()
  return NextResponse.json({ setupRequired: !data })
}
