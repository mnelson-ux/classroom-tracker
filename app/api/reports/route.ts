import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

// Any logged-in staff member (teacher or admin) may view reports.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface Bucket { trips: number; minutes: number }
const emptyBucket = (): Bucket => ({ trips: 0, minutes: 0 })

export async function GET(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Period boundaries (server time).
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // back to Sunday
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const { data: checkouts, error } = await supabaseAdmin
    .from('checkouts')
    .select('teacher_id, location, check_out_time, duration_minutes, teacher:teachers(id, name), student:students(id, name, gender)')
    .order('check_out_time', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type StudentAgg = { student_name: string; week: Bucket; month: Bucket; all: Bucket }
  type TeacherAgg = {
    teacher_id: string
    teacher_name: string
    week: Bucket; month: Bucket; all: Bucket
    students: Record<string, StudentAgg>
  }

  const teachers: Record<string, TeacherAgg> = {}

  for (const c of (checkouts ?? []) as any[]) {
    const tId = c.teacher_id ?? 'unknown'
    const tName = c.teacher?.name ?? 'Unknown teacher'
    const sName = c.student?.name ?? 'Unknown student'
    const mins = c.duration_minutes ?? 0
    const when = c.check_out_time ? new Date(c.check_out_time) : null

    if (!teachers[tId]) {
      teachers[tId] = { teacher_id: tId, teacher_name: tName, week: emptyBucket(), month: emptyBucket(), all: emptyBucket(), students: {} }
    }
    const t = teachers[tId]
    if (!t.students[sName]) {
      t.students[sName] = { student_name: sName, week: emptyBucket(), month: emptyBucket(), all: emptyBucket() }
    }
    const s = t.students[sName]

    const add = (b: Bucket) => { b.trips += 1; b.minutes += mins }
    add(t.all); add(s.all)
    if (when && when >= monthStart) { add(t.month); add(s.month) }
    if (when && when >= weekStart) { add(t.week); add(s.week) }
  }

  const result = Object.values(teachers)
    .map((t) => ({ ...t, students: Object.values(t.students).sort((a, b) => b.all.trips - a.all.trips) }))
    .sort((a, b) => a.teacher_name.localeCompare(b.teacher_name))

  return NextResponse.json({ teachers: result }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
