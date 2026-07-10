import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const school = new URL(request.url).searchParams.get('school')
  let query = supabaseAdmin
    .from('students')
    .select('id, name, gender, active, school, created_at')
    .order('name')
  if (school) query = query.eq('school', school)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, gender, pin, school } = await request.json()
  if (!name || !gender || !pin) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const pin_hash = await bcrypt.hash(pin, 10)

  const { data, error } = await supabaseAdmin
    .from('students')
    .insert({ name, gender, pin_hash, active: true, school: school ?? 'hs' })
    .select('id, name, gender, active, school')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
