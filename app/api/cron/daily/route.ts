import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { runAutoResetForSchool } from '@/lib/autoReset'
import { SCHOOLS } from '@/lib/schools'
import { maxRecordedMinutes } from '@/lib/cap'

export const dynamic = 'force-dynamic'

// Invoked daily by Vercel Cron (see vercel.json).
// 1. Keep-alive: a trivial query so Supabase's free tier never pauses (important over breaks).
// 2. Year-end reset: runs the wipe for any school where it's due — but only when the
//    request is authenticated with CRON_SECRET, since it deletes data.
export async function GET(request: Request) {
  // Keep-alive — always safe to run, keeps the database active.
  let keptAlive = false
  try {
    await supabaseAdmin.from('settings').select('key').limit(1)
    keptAlive = true
  } catch {}

  // ---- Straggler cleanup (nothing carries day to day) ----
  // Age-based so it's safe to run at any time: only clears entries far older than
  // any legitimate one, and the nightly run wipes everything from the prior day.
  const cleaned: Record<string, number> = {}
  const threeHrsAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  const fourHrsAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  try {
    // Anonymous nurse visits (out + waiting) — nobody is legitimately at the nurse for 3h.
    const nv = await supabaseAdmin.from('nurse_visits').delete({ count: 'exact' }).lt('created_at', threeHrsAgo)
    cleaned.nurse_visits = nv.count ?? 0
    // Bathroom waiting-line entries.
    const pq = await supabaseAdmin.from('pass_queue').delete({ count: 'exact' }).lt('created_at', threeHrsAgo)
    cleaned.queue = pq.count ?? 0
    // Open checkouts a student never checked back in from — close them at the
    // school's cap (a forgotten pass records the cap, not a multi-hour duration).
    let closed = 0
    for (const s of SCHOOLS) {
      const capN = await maxRecordedMinutes(s.id)
      const co = await supabaseAdmin.from('checkouts')
        .update({ is_checked_out: false, check_in_time: new Date().toISOString(), duration_minutes: capN, capped: true }, { count: 'exact' })
        .eq('is_checked_out', true).eq('school', s.id).lt('check_out_time', fourHrsAgo)
      closed += co.count ?? 0
    }
    cleaned.checkouts_closed = closed
  } catch {}

  const secret = process.env.CRON_SECRET
  const authed = !!secret && request.headers.get('authorization') === `Bearer ${secret}`

  const resets: string[] = []
  if (authed) {
    for (const s of SCHOOLS) {
      try {
        const r = await runAutoResetForSchool(s.id)
        if (r.triggered) resets.push(`${s.label}: ${r.message}`)
      } catch {}
    }
  }

  return NextResponse.json({
    ok: true,
    keptAlive,
    cleaned,
    resetChecked: authed,
    resets,
    at: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
