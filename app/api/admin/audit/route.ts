import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '300'), 2000)

  let q = supabaseAdmin.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit)
  if (action) q = q.eq('action', action)
  if (from) q = q.gte('created_at', from)
  if (to) q = q.lte('created_at', to)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
