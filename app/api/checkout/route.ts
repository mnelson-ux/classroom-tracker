import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  const { studentId, teacherId, roomId, location, pin } = await request.json()

  if (!studentId || !teacherId || !location || !pin) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify student PIN
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', studentId)
    .eq('active', true)
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const pinValid = await bcrypt.compare(pin, student.pin_hash)
  if (!pinValid) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  // Check if student is already checked out
  const { data: existing } = await supabaseAdmin
    .from('checkouts')
    .select('id')
    .eq('student_id', studentId)
    .eq('is_checked_out', true)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Student is already checked out' }, { status: 409 })
  }

  // Bathroom-specific checks
  if (location === 'Bathroom') {
    const { data: settingsRows } = await supabaseAdmin.from('settings').select('key, value').eq('school', student.school)
    const settings: Record<string, string> = {}
    settingsRows?.forEach((r) => { settings[r.key] = r.value })

    const { data: activeBathroom } = await supabaseAdmin
      .from('checkouts')
      .select('student_id, teacher_id, students(gender)')
      .eq('is_checked_out', true)
      .eq('location', 'Bathroom')
      .eq('school', student.school)

    const gender = student.gender
    const sameGenderOut = activeBathroom?.filter((c: any) => c.students?.gender === gender) ?? []

    // Check per-room limit
    const perRoomLimit = parseInt(
      gender === 'male'
        ? settings.max_bathroom_per_room_boys ?? '1'
        : settings.max_bathroom_per_room_girls ?? '1'
    )
    const fromSameRoom = sameGenderOut.filter((c: any) => c.teacher_id === teacherId)
    if (fromSameRoom.length >= perRoomLimit) {
      return NextResponse.json({
        error: `A ${gender === 'male' ? 'boy' : 'girl'} from this classroom is already in the bathroom`,
      }, { status: 409 })
    }

    // Check school-wide total limit
    const totalLimit = parseInt(
      gender === 'male'
        ? settings.max_bathroom_total_boys ?? '2'
        : settings.max_bathroom_total_girls ?? '2'
    )
    if (sameGenderOut.length >= totalLimit) {
      return NextResponse.json({
        error: `The bathroom is currently at capacity (${totalLimit} ${gender === 'male' ? 'boys' : 'girls'} max)`,
      }, { status: 409 })
    }

    // Check daily time limit
    const { data: settingRow } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'time_limit_minutes')
      .eq('school', student.school)
      .single()
    // Per-student accommodation (IEP/504) overrides the school default when set.
    const limitMinutes = student.bathroom_limit_minutes ?? parseInt(settingRow?.value ?? '10')

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todayRecords } = await supabaseAdmin
      .from('checkouts')
      .select('duration_minutes')
      .eq('student_id', studentId)
      .eq('location', 'Bathroom')
      .eq('is_checked_out', false)
      .eq('pass_type', 'student') // teacher-issued/excused passes don't count toward the limit
      .gte('check_out_time', todayStart.toISOString())

    const totalMinutes = todayRecords?.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0) ?? 0
    if (totalMinutes >= limitMinutes) {
      return NextResponse.json({
        error: `${student.name} has reached the ${limitMinutes}-minute daily bathroom limit`,
        limitReached: true,
      }, { status: 409 })
    }
  }

  // Create checkout
  const { data: checkout, error } = await supabaseAdmin
    .from('checkouts')
    .insert({
      student_id: studentId,
      room_id: roomId ?? null,
      teacher_id: teacherId,
      location,
      school: student.school,
      check_out_time: new Date().toISOString(),
      is_checked_out: true,
    })
    .select('*')
    .single()

  if (error || !checkout) {
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }

  return NextResponse.json({ success: true, checkout })
}
