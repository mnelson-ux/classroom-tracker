import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

// Any logged-in staff member (teacher or admin) may view reports.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface Bucket { trips: number; minutes: number }
// PeriodStats is keyed by location name, plus a 'Total' key that sums all locations.
type PeriodStats = Record<string, Bucket>

function addTo(stats: PeriodStats, location: string, minutes: number) {
  for (const key of ['Total', location]) {
    if (!stats[key]) stats[key] = { trips: 0, minutes: 0 }
    stats[key].trips += 1
    stats[key].minutes += minutes
  }
}

export async function GET(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Period boundaries (server time).
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // back to Sunday
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  let school = new URL(request.url).searchParams.get('school')
  // Teachers are locked to their own school regardless of the requested one.
  if (session.user_type === 'teacher') {
    const { data: t } = await supabaseAdmin.from('teachers').select('school').eq('id', session.user_id).single()
    if (t?.school) school = t.school
  }
  let cq = supabaseAdmin
    .from('checkouts')
    .select('teacher_id, location, check_out_time, duration_minutes, teacher:teachers!checkouts_teacher_id_fkey(id, name), student:students(id, name, gender)')
    .order('check_out_time', { ascending: false })
  if (school) cq = cq.eq('school', school)

  const { data: checkouts, error } = await cq
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Full roster so every student is searchable, even with zero checkouts.
  let rq = supabaseAdmin.from('students').select('id, name').eq('active', true).order('name')
  if (school) rq = rq.eq('school', school)
  const { data: roster } = await rq

  type StudentAgg = { student_name: string; week: PeriodStats; month: PeriodStats; all: PeriodStats }
  type TeacherAgg = {
    teacher_id: string
    teacher_name: string
    week: PeriodStats; month: PeriodStats; all: PeriodStats
    students: Record<string, StudentAgg>
  }

  const teachers: Record<string, TeacherAgg> = {}
  const locationSet = new Set<string>()

  // Cross-teacher per-student totals, seeded with the whole roster (zeros).
  const studentTotals: Record<string, StudentAgg> = {}
  for (const r of (roster ?? []) as any[]) {
    studentTotals[r.name] = { student_name: r.name, week: {}, month: {}, all: {} }
  }

  for (const c of (checkouts ?? []) as any[]) {
    const tId = c.teacher_id ?? 'unknown'
    const tName = c.teacher?.name ?? 'Unknown teacher'
    const sName = c.student?.name ?? 'Unknown student'
    const location = c.location ?? 'Other'
    const mins = c.duration_minutes ?? 0
    const when = c.check_out_time ? new Date(c.check_out_time) : null
    locationSet.add(location)

    if (!teachers[tId]) {
      teachers[tId] = { teacher_id: tId, teacher_name: tName, week: {}, month: {}, all: {}, students: {} }
    }
    const t = teachers[tId]
    if (!t.students[sName]) {
      t.students[sName] = { student_name: sName, week: {}, month: {}, all: {} }
    }
    const s = t.students[sName]
    if (!studentTotals[sName]) studentTotals[sName] = { student_name: sName, week: {}, month: {}, all: {} }
    const st = studentTotals[sName]

    addTo(t.all, location, mins); addTo(s.all, location, mins); addTo(st.all, location, mins)
    if (when && when >= monthStart) { addTo(t.month, location, mins); addTo(s.month, location, mins); addTo(st.month, location, mins) }
    if (when && when >= weekStart) { addTo(t.week, location, mins); addTo(s.week, location, mins); addTo(st.week, location, mins) }
  }

  const result = Object.values(teachers)
    .map((t) => ({
      ...t,
      students: Object.values(t.students).sort((a, b) => (b.all.Total?.trips ?? 0) - (a.all.Total?.trips ?? 0)),
    }))
    .sort((a, b) => a.teacher_name.localeCompare(b.teacher_name))

  const students = Object.values(studentTotals).sort((a, b) => a.student_name.localeCompare(b.student_name))

  return NextResponse.json({ teachers: result, students, locations: Array.from(locationSet).sort() }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
