import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkThrottle, registerFailure, clearThrottle, lockMessage, PIN_THROTTLE } from '@/lib/throttle'

export const dynamic = 'force-dynamic'

// A student requests a PIN change from the kiosk. Verifies the current PIN,
// then files a PENDING request for the chosen teacher to approve.
export async function POST(request: Request) {
  const { studentId, currentPin, newPin, teacherId } = await request.json()
  if (!studentId || !currentPin || !newPin || !teacherId) {
    return NextResponse.json({ error: 'Please fill in every field.' }, { status: 400 })
  }
  if (!/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ error: 'New PIN must be exactly 4 digits.' }, { status: 400 })
  }

  const { data: student } = await supabaseAdmin
    .from('students').select('id, school, pin_hash').eq('id', studentId).eq('active', true).single()
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Same brute-force lock as the other PIN endpoints.
  const throttleKey = `pin:${studentId}`
  const lock = await checkThrottle(throttleKey)
  if (lock.locked) return NextResponse.json({ error: lockMessage(lock.retryAfterSec) }, { status: 429 })

  const ok = await bcrypt.compare(currentPin, student.pin_hash)
  if (!ok) { await registerFailure(throttleKey, PIN_THROTTLE); return NextResponse.json({ error: 'Your current PIN is incorrect.' }, { status: 401 }) }
  await clearThrottle(throttleKey)

  // The chosen teacher must exist and be at this student's school (or teach both).
  const { data: teacher } = await supabaseAdmin
    .from('teachers').select('id, name, school').eq('id', teacherId).eq('active', true).maybeSingle()
  if (!teacher || !(teacher.school === student.school || teacher.school === 'both')) {
    return NextResponse.json({ error: 'Please choose a valid teacher.' }, { status: 400 })
  }

  const newHash = await bcrypt.hash(newPin, 10)

  // Only one pending request per student — replace any older pending one.
  await supabaseAdmin.from('pin_change_requests').delete().eq('student_id', studentId).eq('status', 'pending')
  const { error } = await supabaseAdmin.from('pin_change_requests').insert({
    school: student.school, student_id: studentId, teacher_id: teacherId, new_pin_hash: newHash, status: 'pending',
  })
  if (error) return NextResponse.json({ error: 'Could not submit request.' }, { status: 500 })

  return NextResponse.json({ success: true, teacherName: teacher.name })
}
