import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

export async function GET(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dateFrom = url.searchParams.get('from')
  const dateTo = url.searchParams.get('to')
  const studentId = url.searchParams.get('studentId')

  let query = supabaseAdmin
    .from('checkouts')
    .select(`
      *,
      student:students(id, name, gender),
      teacher:teachers(id, name),
      room:rooms(id, name)
    `)
    .eq('is_checked_out', false)
    .order('check_out_time', { ascending: false })
    .limit(500)

  if (dateFrom) query = query.gte('check_out_time', dateFrom)
  if (dateTo) query = query.lte('check_out_time', dateTo)
  if (studentId) query = query.eq('student_id', studentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
