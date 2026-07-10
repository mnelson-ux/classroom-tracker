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

  const school = new URL(request.url).searchParams.get('school')
  let cq = supabaseAdmin
    .from('checkouts')
    .select('teacher_id, location, check_out_time, duration_minutes, teacher:teachers(id, name), student:students(id, name, gender)')
    .order('check_out_time', { ascending: false })
  if (school) cq = cq.eq('school', school)

  const { data: checkouts, error } = await cq
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type StudentAgg = { student_name: string; week: PeriodStats; month: PeriodStats; all: PeriodStats }
  type TeacherAgg = {
    teacher_id: string
    teacher_name: string
    week: PeriodStats; month: PeriodStats; all: PeriodStats
    students: Record<string, StudentAgg>
  }

  const teachers: Record<string, TeacherAgg> = {}
  const locationSet = new Set<string>()

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

    addTo(t.all, location, mins); addTo(s.all, location, mins)
    if (when && when >= monthStart) { addTo(t.month, location, mins); addTo(s.month, location, mins) }
    if (when && when >= weekStart) { addTo(t.week, location, mins); addTo(s.week, location, mins) }
  }

  const result = Object.values(teachers)
    .map((t) => ({
      ...t,
      students: Object.values(t.students).sort((a, b) => (b.all.Total?.trips ?? 0) - (a.all.Total?.trips ?? 0)),
    }))
    .sort((a, b) => a.teacher_name.localeCompare(b.teacher_name))

  return NextResponse.json({ teachers: result, locations: Array.from(locationSet).sort() }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
