import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const noStore = { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }

// GET — the current waiting lines for a school.
// Student names are only included for authenticated staff; the public kiosk gets
// an anonymous list (positions only, no names in the payload).
export async function GET(request: Request) {
  const school = new URL(request.url).searchParams.get('school')
  const isStaff = !!(await verifySession(getTokenFromRequest(request)))
  const columns = isStaff
    ? 'id, location, gender, created_at, student:students(id, name)'
    : 'id, location, gender, created_at'
  let q = supabaseAdmin.from('pass_queue').select(columns).order('created_at', { ascending: true })
  if (school) q = q.eq('school', school)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], noStore)
}

// POST — join a waiting line. Verifies the student's PIN.
export async function POST(request: Request) {
  const { studentId, teacherId, location, pin } = await request.json()
  if (!studentId || !location || !pin) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: student } = await supabaseAdmin
    .from('students').select('id, name, gender, school, pin_hash').eq('id', studentId).eq('active', true).single()
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const ok = await bcrypt.compare(pin, student.pin_hash)
  if (!ok) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })

  // Can't queue if already out.
  const { data: out } = await supabaseAdmin
    .from('checkouts').select('id').eq('student_id', studentId).eq('is_checked_out', true).maybeSingle()
  if (out) return NextResponse.json({ error: 'You are already checked out' }, { status: 409 })

  const gender = location === 'Bathroom' ? student.gender : null

  // Already in this line? Just report the position.
  let existingQ = supabaseAdmin.from('pass_queue').select('id, student_id, created_at')
    .eq('school', student.school).eq('location', location).order('created_at')
  if (gender) existingQ = existingQ.eq('gender', gender)
  const { data: line } = await existingQ
  const list = line ?? []
  const already = list.findIndex((e) => e.student_id === studentId)
  if (already >= 0) return NextResponse.json({ success: true, position: already + 1 }, noStore)

  // Enforce the max line length.
  const { data: settingRow } = await supabaseAdmin
    .from('settings').select('value').eq('key', 'queue_max').eq('school', student.school).maybeSingle()
  const queueMax = parseInt(settingRow?.value ?? '5')
  if (list.length >= queueMax) {
    return NextResponse.json({ error: `The ${location} line is full (${queueMax} waiting).`, queueFull: true }, { status: 409 })
  }

  const { error } = await supabaseAdmin.from('pass_queue').insert({
    school: student.school, student_id: studentId, teacher_id: teacherId ?? null, location, gender,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, position: list.length + 1 }, noStore)
}

// DELETE — leave a line (by queue entry id).
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('pass_queue').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true }, noStore)
}
