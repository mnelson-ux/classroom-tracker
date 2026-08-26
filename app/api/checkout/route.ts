import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { minutesOfDayInTz, minutesToLabel } from '@/lib/timeWindows'
import { checkThrottle, registerFailure, clearThrottle, lockMessage, PIN_THROTTLE } from '@/lib/throttle'
import { isUuid } from '@/lib/validate'
import { partnerIsOut } from '@/lib/keepApart'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { studentId, teacherId, roomId, location, pin } = await request.json()

  if (!studentId || !teacherId || !location || !pin) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!isUuid(studentId) || !isUuid(teacherId) || (roomId != null && !isUuid(roomId))) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
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

  // Brute-force lock on this student's PIN (shared across checkout/checkin/my-pass/queue).
  const throttleKey = `pin:${studentId}`
  const lock = await checkThrottle(throttleKey)
  if (lock.locked) {
    return NextResponse.json({ error: lockMessage(lock.retryAfterSec) }, { status: 429 })
  }

  const pinValid = await bcrypt.compare(pin, student.pin_hash)
  if (!pinValid) {
    await registerFailure(throttleKey, PIN_THROTTLE)
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }
  await clearThrottle(throttleKey)

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

  // ---- KEEP-APART ----
  // Certain students may not be out at the same time (anti-meet-up). If a paired
  // partner is currently out, this student is "blocked": for the bathroom they may
  // still wait in line (they just aren't let through until the partner returns);
  // for other destinations there's no line, so it's a hard stop.
  const blocked = await partnerIsOut(studentId, student.school)
  const keepApartResp = NextResponse.json({
    error: `You can't check out right now. Please try again in a little while, or ask your teacher.`,
    keepApart: true,
  }, { status: 409 })
  if (blocked && location !== 'Bathroom') return keepApartResp

  // Load this school's settings once (used by protected time, queue, and limits).
  const { data: settingsRows } = await supabaseAdmin.from('settings').select('key, value').eq('school', student.school)
  const settings: Record<string, string> = {}
  settingsRows?.forEach((r) => { settings[r.key] = r.value })

  // ---- PROTECTED TIME ----
  // Students may not self-check-out during a protected window. (Teachers issuing a
  // pass go through /api/teacher/pass, which is not affected.)
  const tz = settings.timezone || 'America/New_York'
  const { data: windows } = await supabaseAdmin
    .from('protected_times')
    .select('label, start_minute, end_minute')
    .eq('school', student.school)
    .eq('active', true)
  const nowMin = minutesOfDayInTz(tz)
  const active = (windows ?? []).find((w) => nowMin >= w.start_minute && nowMin < w.end_minute)
  if (active) {
    return NextResponse.json({
      error: `Passes are paused right now${active.label ? ` (${active.label})` : ''}. They reopen at ${minutesToLabel(active.end_minute)}.`,
      protectedTime: true,
    }, { status: 409 })
  }

  // Shared helper: decide whether this student may go now, or must wait in line.
  // Returns { allow: true } or { allow: false, resp } (a 409 body).
  const queueMax = parseInt(settings.queue_max || '5')
  async function queueDecision(loc: string, gender: string | null, capacity: number, occupancy: number) {
    let q = supabaseAdmin.from('pass_queue').select('id, student_id').eq('school', student.school).eq('location', loc).order('created_at')
    if (gender) q = q.eq('gender', gender)
    const { data: queue } = await q
    const list = queue ?? []
    const idx = list.findIndex((e) => e.student_id === studentId)
    const spotOpen = occupancy < capacity

    // First eligible person in line = first one NOT held back by keep-apart. A blocked
    // student is skipped so they don't stall everyone behind them.
    const ahead = (idx >= 0 ? list.slice(0, idx) : list).map((e) => e.student_id)
    let someoneEligibleAhead = false
    for (const id of ahead) { if (!(await partnerIsOut(id, student.school))) { someoneEligibleAhead = true; break } }

    // You may go now only if you're not blocked, there's room, and nobody eligible is ahead.
    if (!blocked && spotOpen && !someoneEligibleAhead) {
      return { allow: true as const }
    }
    if (idx >= 0) {
      return { allow: false as const, resp: { error: `You're in line for the ${loc}. Watch the screen — we'll show when it's your turn.`, inQueue: true, position: idx + 1 } }
    }
    if (list.length >= queueMax) {
      return { allow: false as const, resp: { error: `The ${loc} line is full (${queueMax} waiting). Please try again in a few minutes.`, queueFull: true } }
    }
    // Blocked (or full): offer the line so they can wait their turn.
    return { allow: false as const, resp: { error: `The ${loc} is full right now.`, canQueue: true, location: loc, position: list.length + 1 } }
  }

  // ---- BATHROOM ----
  if (location === 'Bathroom') {
    const { data: activeBathroom } = await supabaseAdmin
      .from('checkouts')
      .select('student_id, teacher_id, students(gender), teacher:teachers!checkouts_teacher_id_fkey(has_private_bathroom)')
      .eq('is_checked_out', true)
      .eq('location', 'Bathroom')
      .eq('school', student.school)

    // Does the teacher this student is leaving from run a private (non-shared) bathroom?
    const { data: checkoutTeacher } = await supabaseAdmin
      .from('teachers').select('has_private_bathroom').eq('id', teacherId).maybeSingle()
    const isPrivate = !!checkoutTeacher?.has_private_bathroom

    const gender = student.gender
    const sameGenderOut = activeBathroom?.filter((c: any) => c.students?.gender === gender) ?? []

    // Per-room limit (applies to everyone incl. private bathrooms) — a hard stop, not queued.
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

    // School-wide shared limit — queued when full (private bathrooms are exempt).
    if (!isPrivate) {
      const totalLimit = parseInt(
        gender === 'male'
          ? settings.max_bathroom_total_boys ?? '2'
          : settings.max_bathroom_total_girls ?? '2'
      )
      const sharedOut = sameGenderOut.filter((c: any) => !c.teacher?.has_private_bathroom)
      const decision = await queueDecision('Bathroom', gender, totalLimit, sharedOut.length)
      if (!decision.allow) return NextResponse.json(decision.resp, { status: 409 })
    } else if (blocked) {
      // Private bathroom has no shared line — a kept-apart student simply waits.
      return keepApartResp
    }

    // Daily time limit
    const limitMinutes = student.bathroom_limit_minutes ?? parseInt(settings.time_limit_minutes ?? '10')
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
      // They can't go — don't leave them blocking the line.
      await supabaseAdmin.from('pass_queue').delete().eq('student_id', studentId).eq('location', 'Bathroom')
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

  // They're out now — clear them from any waiting line.
  await supabaseAdmin.from('pass_queue').delete().eq('student_id', studentId).eq('school', student.school)

  return NextResponse.json({ success: true, checkout })
}
