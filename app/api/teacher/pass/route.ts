import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Issue a teacher pass (no student PIN, bypasses limits — staff override).
export async function POST(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { studentId, location, destinationTeacherId, reason, issuedBy } = await request.json()
  // Teachers issue as themselves; admins issue as the office (no origin classroom).
  const originTeacher = session.user_type === 'teacher' ? session.user_id : (issuedBy ?? null)
  if (!studentId || !location) return NextResponse.json({ error: 'Student and destination are required' }, { status: 400 })

  const { data: student } = await supabaseAdmin
    .from('students').select('id, school').eq('id', studentId).single()
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const { data: existing } = await supabaseAdmin
    .from('checkouts').select('id').eq('student_id', studentId).eq('is_checked_out', true).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Student is already out' }, { status: 409 })

  const { data: checkout, error } = await supabaseAdmin
    .from('checkouts')
    .insert({
      student_id: studentId,
      teacher_id: originTeacher,
      room_id: null,
      location,
      school: student.school,
      pass_type: 'teacher_issued',
      issued_by: originTeacher,
      destination_teacher_id: destinationTeacherId || null,
      reason: reason || null,
      is_checked_out: true,
      check_out_time: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !checkout) return NextResponse.json({ error: 'Failed to create pass' }, { status: 500 })
  return NextResponse.json({ success: true, checkout }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

// Close a pass / confirm arrival (no PIN — staff action).
export async function PATCH(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { checkoutId, confirmArrival } = await request.json()
  if (!checkoutId) return NextResponse.json({ error: 'Missing checkoutId' }, { status: 400 })

  const { data: checkout } = await supabaseAdmin
    .from('checkouts').select('*').eq('id', checkoutId).eq('is_checked_out', true).single()
  if (!checkout) return NextResponse.json({ error: 'Active pass not found' }, { status: 404 })

  const inTime = new Date()
  const duration = Math.max(0, Math.floor((inTime.getTime() - new Date(checkout.check_out_time).getTime()) / 1000 / 60))

  const { error } = await supabaseAdmin
    .from('checkouts')
    .update({
      check_in_time: inTime.toISOString(),
      duration_minutes: duration,
      is_checked_out: false,
      arrival_confirmed: !!confirmArrival,
    })
    .eq('id', checkoutId)

  if (error) return NextResponse.json({ error: 'Failed to close pass' }, { status: 500 })
  return NextResponse.json({ success: true })
}
