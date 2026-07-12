import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Log a documented excuse (late arrival or kept after class). Closed immediately.
export async function POST(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { studentId, kind, reason, issuedBy } = await request.json()
  const originTeacher = session.user_type === 'teacher' ? session.user_id : issuedBy
  if (!originTeacher) return NextResponse.json({ error: 'An issuing teacher is required' }, { status: 400 })
  if (!studentId || !kind) return NextResponse.json({ error: 'Student and excuse type are required' }, { status: 400 })

  const { data: student } = await supabaseAdmin
    .from('students').select('id, school').eq('id', studentId).single()
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const location = kind === 'late' ? 'Late Arrival (excused)' : 'Kept After Class (excused)'
  const now = new Date().toISOString()

  const { error } = await supabaseAdmin
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
      is_checked_out: false,
      check_out_time: now,
      check_in_time: now,
      duration_minutes: 0,
    })

  if (error) return NextResponse.json({ error: 'Failed to log excuse' }, { status: 500 })
  return NextResponse.json({ success: true })
}
