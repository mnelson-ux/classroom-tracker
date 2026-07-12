import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Any signed-in staff member can report an issue or request a change.
export async function POST(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, message } = await request.json()
  if (!message || !message.trim()) return NextResponse.json({ error: 'Please enter a message' }, { status: 400 })

  let submitted_by = 'Admin'
  let teacher_id: string | null = null
  let school: string | null = null
  if (session.user_type === 'teacher') {
    const { data: t } = await supabaseAdmin.from('teachers').select('name, school').eq('id', session.user_id).single()
    submitted_by = t?.name ?? 'Teacher'
    teacher_id = session.user_id
    school = t?.school ?? null
  }

  const { error } = await supabaseAdmin.from('feedback').insert({
    type: type === 'request' ? 'request' : 'issue',
    message: message.trim(),
    submitted_by,
    teacher_id,
    school,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
