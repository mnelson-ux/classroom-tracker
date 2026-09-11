import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getActiveProtectedWindow } from '@/lib/protected'
import { partnerIsOut } from '@/lib/keepApart'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const noStore = { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }

// A student's OWN queue status, for their own device. Returns only whether they're
// still in line and whether it's their turn — never other students' names or a
// position number, so there's nothing to fixate on or coordinate around.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const studentId = url.searchParams.get('studentId')
  const school = url.searchParams.get('school')
  if (!studentId || !school) return NextResponse.json({ inLine: false }, noStore)

  // Blackout clears the line.
  const active = await getActiveProtectedWindow(school)
  if (active) {
    await supabaseAdmin.from('pass_queue').delete().eq('school', school)
    return NextResponse.json({ inLine: false, cleared: true }, noStore)
  }

  const { data: mine } = await supabaseAdmin
    .from('pass_queue').select('id, location, gender, teacher_id').eq('student_id', studentId).eq('school', school).maybeSingle()
  if (!mine) return NextResponse.json({ inLine: false }, noStore)

  let lineQ = supabaseAdmin.from('pass_queue').select('student_id, teacher_id').eq('school', school).eq('location', mine.location).order('created_at')
  if (mine.gender) lineQ = lineQ.eq('gender', mine.gender)
  const { data: line } = await lineQ
  const ordered = (line ?? []) as { student_id: string; teacher_id: string | null }[]

  const { data: settingsRows } = await supabaseAdmin.from('settings').select('key, value').eq('school', school)
  const settings: Record<string, string> = {}
  settingsRows?.forEach((r) => { settings[r.key] = r.value })

  // Current bathroom occupancy (same gender). School-wide counts shared teachers;
  // per-class counts everyone from a given teacher.
  const capacity = parseInt(mine.gender === 'male' ? (settings.max_bathroom_total_boys ?? '2') : (settings.max_bathroom_total_girls ?? '2'))
  const perRoomLimit = parseInt(mine.gender === 'male' ? (settings.max_bathroom_per_room_boys ?? '1') : (settings.max_bathroom_per_room_girls ?? '1'))
  const { data: bath } = await supabaseAdmin.from('checkouts')
    .select('teacher_id, students(gender), teacher:teachers!checkouts_teacher_id_fkey(has_private_bathroom)')
    .eq('is_checked_out', true).eq('location', 'Bathroom').eq('school', school)
  const sameGenderOut = (bath ?? []).filter((c: any) => c.students?.gender === mine.gender)
  const occupancy = sameGenderOut.filter((c: any) => !c.teacher?.has_private_bathroom).length

  // A queued student is "held" if a keep-apart partner is out OR a same-gender
  // classmate of theirs is already in the bathroom (per-class limit).
  const perRoomFull = (tid: string | null) => sameGenderOut.filter((c: any) => c.teacher_id === tid).length >= perRoomLimit
  const isHeld = async (sid: string, tid: string | null) => (await partnerIsOut(sid, school)) || perRoomFull(tid)

  const myHeld = await isHeld(studentId, mine.teacher_id)
  // First eligible = first not-held; if that's me, I'm at the front.
  let frontEligible = false
  for (const e of ordered) {
    if (e.student_id === studentId) { frontEligible = !myHeld; break }
    if (!(await isHeld(e.student_id, e.teacher_id))) break // someone eligible is ahead
  }

  const ready = frontEligible && occupancy < capacity
  return NextResponse.json({ inLine: true, ready }, noStore)
}
