import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const school = new URL(request.url).searchParams.get('school')
  let query = supabaseAdmin
    .from('teachers')
    .select('id, name, username, room_id, active, school, has_private_bathroom, is_support, rooms(name)')
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

  const { name, username, password, room_id, school, has_private_bathroom, is_support } = await request.json()
  if (!name || !username || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .insert({ name, username, password_hash, room_id: room_id || null, active: true, school: school ?? 'hs', has_private_bathroom: !!has_private_bathroom, is_support: !!is_support })
    .select('id, name, username, room_id, active, school, has_private_bathroom, is_support')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
