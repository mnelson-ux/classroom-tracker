import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const noStore = { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }

// GET — pending PIN-change requests. A teacher sees the ones addressed to them;
// an admin sees all pending requests for the selected school.
export async function GET(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let q = supabaseAdmin
    .from('pin_change_requests')
    .select('id, created_at, student:students(id, name), teacher:teachers!pin_change_requests_teacher_id_fkey(id, name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (session.user_type === 'admin') {
    const school = new URL(request.url).searchParams.get('school')
    if (school) q = q.eq('school', school)
  } else {
    q = q.eq('teacher_id', session.user_id)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], noStore)
}

// POST — approve or deny a request. Approving applies the new PIN.
export async function POST(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await request.json()
  if (!id || !['approve', 'deny'].includes(action)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const { data: req } = await supabaseAdmin
    .from('pin_change_requests').select('*').eq('id', id).eq('status', 'pending').maybeSingle()
  if (!req) return NextResponse.json({ error: 'Request not found or already handled' }, { status: 404 })

  // Only the addressed teacher (or an admin) may resolve it.
  if (session.user_type !== 'admin' && req.teacher_id !== session.user_id) {
    return NextResponse.json({ error: 'Not your request to approve' }, { status: 403 })
  }

  if (action === 'approve') {
    const { error: upErr } = await supabaseAdmin
      .from('students').update({ pin_hash: req.new_pin_hash }).eq('id', req.student_id)
    if (upErr) return NextResponse.json({ error: 'Could not apply new PIN' }, { status: 500 })
  }

  await supabaseAdmin.from('pin_change_requests').update({
    status: action === 'approve' ? 'approved' : 'denied',
    resolved_at: new Date().toISOString(),
    resolved_by: session.user_type === 'admin' ? null : session.user_id,
  }).eq('id', id)

  return NextResponse.json({ success: true }, noStore)
}
