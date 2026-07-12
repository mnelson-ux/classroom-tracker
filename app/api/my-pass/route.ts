import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// A student proves identity with their PIN and gets their current active pass (if any).
export async function POST(request: Request) {
  const { studentId, pin } = await request.json()
  if (!studentId || !pin) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: student } = await supabaseAdmin
    .from('students').select('id, name, pin_hash').eq('id', studentId).eq('active', true).single()
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const ok = await bcrypt.compare(pin, student.pin_hash)
  if (!ok) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })

  const { data: pass } = await supabaseAdmin
    .from('checkouts')
    .select('*, teacher:teachers!checkouts_teacher_id_fkey(id, name)')
    .eq('student_id', studentId)
    .eq('is_checked_out', true)
    .order('check_out_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ pass: pass ?? null }, { headers: { 'Cache-Control': 'no-store' } })
}
