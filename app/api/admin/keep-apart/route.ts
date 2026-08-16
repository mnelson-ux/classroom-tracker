import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const school = new URL(request.url).searchParams.get('school') ?? 'hs'
  const { data, error } = await supabaseAdmin
    .from('keep_apart')
    .select('id, created_at, a:students!keep_apart_student_a_fkey(id, name), b:students!keep_apart_student_b_fkey(id, name)')
    .eq('school', school)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { school, studentA, studentB } = await request.json()
  if (!studentA || !studentB) return NextResponse.json({ error: 'Pick two students' }, { status: 400 })
  if (studentA === studentB) return NextResponse.json({ error: 'Pick two different students' }, { status: 400 })
  if (!isUuid(studentA) || !isUuid(studentB)) return NextResponse.json({ error: 'Invalid student' }, { status: 400 })

  // Avoid duplicate pairs (either order).
  const { data: dupe } = await supabaseAdmin
    .from('keep_apart').select('id').eq('school', school ?? 'hs')
    .or(`and(student_a.eq.${studentA},student_b.eq.${studentB}),and(student_a.eq.${studentB},student_b.eq.${studentA})`)
    .maybeSingle()
  if (dupe) return NextResponse.json({ error: 'These two are already paired' }, { status: 409 })

  const { data, error } = await supabaseAdmin
    .from('keep_apart')
    .insert({ school: school ?? 'hs', student_a: studentA, student_b: studentB })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('keep_apart').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
