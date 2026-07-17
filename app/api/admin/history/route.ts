import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

// Never cache or pre-render this route — always query the database live.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dateFrom = url.searchParams.get('from')
  const dateTo = url.searchParams.get('to')
  const studentId = url.searchParams.get('studentId')
  const school = url.searchParams.get('school')

  let query = supabaseAdmin
    .from('checkouts')
    .select(`
      *,
      student:students(id, name, gender),
      teacher:teachers!checkouts_teacher_id_fkey(id, name),
      room:rooms(id, name)
    `)
    .eq('is_checked_out', false)
    .order('check_out_time', { ascending: false })
    .limit(500)

  if (dateFrom) query = query.gte('check_out_time', dateFrom)
  if (dateTo) query = query.lte('check_out_time', dateTo)
  if (studentId) query = query.eq('student_id', studentId)
  if (school) query = query.eq('school', school)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
