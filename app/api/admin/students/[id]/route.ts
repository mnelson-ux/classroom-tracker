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
  if (body.gender) update.gender = body.gender
  if (typeof body.active === 'boolean') update.active = body.active
  if (body.pin) update.pin_hash = await bcrypt.hash(body.pin, 10)

  const { data, error } = await supabaseAdmin
    .from('students')
    .update(update)
    .eq('id', params.id)
    .select('id, name, gender, active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', params.id)

  if (error) {
    // Foreign-key violation — student is referenced by checkout history.
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'This student has checkout history and cannot be deleted. Use Deactivate to hide them instead.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
