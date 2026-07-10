import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const school = new URL(request.url).searchParams.get('school')
  let query = supabaseAdmin
    .from('rooms')
    .select('*')
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

  const { name, school } = await request.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('rooms')
    .insert({ name, school: school ?? 'hs' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
