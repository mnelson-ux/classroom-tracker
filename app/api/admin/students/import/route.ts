import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

interface IncomingStudent {
  name?: string
  gender?: string
  pin?: string
}

function normalizeGender(raw?: string): 'male' | 'female' | null {
  const g = (raw ?? '').trim().toLowerCase()
  if (g.startsWith('m')) return 'male'
  if (g.startsWith('f')) return 'female'
  return null
}

function randomPin(): string {
  return Math.floor(10000 + Math.random() * 90000).toString()
}

export async function POST(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { students, school } = await request.json()
  if (!Array.isArray(students)) {
    return NextResponse.json({ error: 'Expected a "students" array' }, { status: 400 })
  }
  const targetSchool = school ?? 'hs'

  const rows: { name: string; gender: 'male' | 'female'; pin_hash: string }[] = []
  const generated: { name: string; pin: string }[] = []
  const skipped: string[] = []

  for (const raw of students as IncomingStudent[]) {
    const name = (raw.name ?? '').trim()
    const gender = normalizeGender(raw.gender)
    if (!name || !gender) { skipped.push(name || '(no name)'); continue }

    let pin = (raw.pin ?? '').toString().replace(/\D/g, '')
    if (pin.length !== 5) { pin = randomPin(); generated.push({ name, pin }) }

    rows.push({ name, gender, pin_hash: await bcrypt.hash(pin, 10) })
  }

  let inserted = 0
  if (rows.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert(rows.map((r) => ({ ...r, active: true, school: targetSchool })))
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    inserted = data?.length ?? 0
  }

  if (inserted > 0) await logAudit(request, { action: 'student.import', entity: 'student', detail: `Imported ${inserted} student(s)`, school: targetSchool })
  return NextResponse.json({ inserted, skippedCount: skipped.length, skipped, generated })
}
