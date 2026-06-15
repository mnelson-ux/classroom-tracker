import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.from('settings').select('*').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates: { key: string; value: string }[] = await request.json()

  const errors: string[] = []
  for (const { key, value } of updates) {
    const { error } = await supabaseAdmin
      .from('settings')
      .update({ value })
      .eq('key', key)
    if (error) errors.push(`${key}: ${error.message}`)
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(', ') }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
