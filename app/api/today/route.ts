import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

// Any signed-in staff member: today's checkouts, most recent first. Includes
// students still out and those already back. Teachers are locked to their school.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let school = new URL(request.url).searchParams.get('school')
  if (session.user_type === 'teacher') {
    const { data: t } = await supabaseAdmin.from('teachers').select('school').eq('id', session.user_id).single()
    if (t?.school && t.school !== 'both') school = t.school
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  let q = supabaseAdmin
    .from('checkouts')
    .select('id, location, check_out_time, check_in_time, duration_minutes, is_checked_out, school, student:students(id, name, gender), teacher:teachers!checkouts_teacher_id_fkey(id, name)')
    .gte('check_out_time', todayStart.toISOString())
    .order('check_out_time', { ascending: false })
    .limit(500)
  if (school) q = q.eq('school', school)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
