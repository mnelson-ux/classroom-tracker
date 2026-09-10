import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifySession, getTokenFromRequest } from '@/lib/auth'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

// A teacher/admin corrects how long a student was actually out (e.g. after a
// forgotten check-in). Closes the pass if still open and records the real time.
export async function POST(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { checkoutId, minutes } = await request.json()
  if (!isUuid(checkoutId)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const m = Math.round(Number(minutes))
  if (!Number.isFinite(m) || m < 0 || m > 600) return NextResponse.json({ error: 'Enter 0–600 minutes' }, { status: 400 })

  const { data: checkout } = await supabaseAdmin
    .from('checkouts').select('id, school, check_out_time').eq('id', checkoutId).single()
  if (!checkout) return NextResponse.json({ error: 'Pass not found' }, { status: 404 })

  // Teachers may only adjust their own school's passes; admins may adjust any.
  if (session.user_type === 'teacher') {
    const { data: t } = await supabaseAdmin.from('teachers').select('school').eq('id', session.user_id).single()
    if (t?.school && t.school !== 'both' && t.school !== checkout.school) {
      return NextResponse.json({ error: 'Not your school' }, { status: 403 })
    }
  }

  const checkIn = new Date(new Date(checkout.check_out_time).getTime() + m * 60000)
  const { error } = await supabaseAdmin
    .from('checkouts')
    .update({ duration_minutes: m, is_checked_out: false, check_in_time: checkIn.toISOString(), capped: false })
    .eq('id', checkoutId)
  if (error) return NextResponse.json({ error: 'Could not update' }, { status: 500 })
  return NextResponse.json({ success: true })
}
