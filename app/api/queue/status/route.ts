import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getActiveProtectedWindow } from '@/lib/protected'

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
    .from('pass_queue').select('id, location, gender').eq('student_id', studentId).eq('school', school).maybeSingle()
  if (!mine) return NextResponse.json({ inLine: false }, noStore)

  // Am I at the front of my line?
  let lineQ = supabaseAdmin.from('pass_queue').select('student_id').eq('school', school).eq('location', mine.location).order('created_at')
  if (mine.gender) lineQ = lineQ.eq('gender', mine.gender)
  const { data: line } = await lineQ
  const isFront = (line ?? [])[0]?.student_id === studentId

  // Is there room right now?
  const { data: settingsRows } = await supabaseAdmin.from('settings').select('key, value').eq('school', school)
  const settings: Record<string, string> = {}
  settingsRows?.forEach((r) => { settings[r.key] = r.value })

  let occupancy = 0
  let capacity = 0
  if (mine.location === 'Nurse') {
    capacity = parseInt(settings.nurse_capacity || '2')
    const { count } = await supabaseAdmin.from('checkouts').select('id', { count: 'exact', head: true })
      .eq('is_checked_out', true).eq('location', 'Nurse').eq('school', school)
    occupancy = count ?? 0
  } else {
    // Bathroom — count same-gender students out via shared (non-private) teachers.
    capacity = parseInt(mine.gender === 'male' ? (settings.max_bathroom_total_boys ?? '2') : (settings.max_bathroom_total_girls ?? '2'))
    const { data: bath } = await supabaseAdmin.from('checkouts')
      .select('students(gender), teacher:teachers!checkouts_teacher_id_fkey(has_private_bathroom)')
      .eq('is_checked_out', true).eq('location', 'Bathroom').eq('school', school)
    occupancy = (bath ?? []).filter((c: any) => c.students?.gender === mine.gender && !c.teacher?.has_private_bathroom).length
  }

  const ready = isFront && occupancy < capacity
  return NextResponse.json({ inLine: true, ready }, noStore)
}
