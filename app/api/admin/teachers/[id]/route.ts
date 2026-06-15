import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const update: Record<string, unknown> = {}

  if (body.name) update.name = body.name
  if (body.username) update.username = body.username
  if (typeof body.active === 'boolean') update.active = body.active
  if (body.password) update.password_hash = await bcrypt.hash(body.password, 10)
  if ('room_id' in body) update.room_id = body.room_id || null

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .update(update)
    .eq('id', params.id)
    .select('id, name, username, room_id, active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('teachers')
    .update({ active: false })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
