import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Excuse a student (late arrival / kept after class) and issue a pass they can show.
export async function POST(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { studentId, kind, reason, issuedBy } = await request.json()
  const originTeacher = session.user_type === 'teacher' ? session.user_id : (issuedBy ?? null)
  if (!studentId || !kind) return NextResponse.json({ error: 'Student and excuse type are required' }, { status: 400 })

  const { data: student } = await supabaseAdmin
    .from('students').select('id, school').eq('id', studentId).single()
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const { data: existing } = await supabaseAdmin
    .from('checkouts').select('id').eq('student_id', studentId).eq('is_checked_out', true).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Student already has an active pass' }, { status: 409 })

  const location = kind === 'late' ? 'Late Arrival (excused)' : 'Kept After Class (excused)'

  const { data: checkout, error } = await supabaseAdmin
    .from('checkouts')
    .insert({
      student_id: studentId,
      teacher_id: originTeacher,
      room_id: null,
      location,
      school: student.school,
      pass_type: 'excuse',
      issued_by: originTeacher,
      reason: reason || null,
      is_checked_out: true,
      check_out_time: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !checkout) return NextResponse.json({ error: 'Failed to issue excuse pass' }, { status: 500 })
  return NextResponse.json({ success: true, checkout }, { headers: { 'Cache-Control': 'no-store' } })
}
