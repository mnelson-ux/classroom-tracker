import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runAutoResetForSchool } from '@/lib/autoReset'
import { SCHOOLS } from '@/lib/schools'

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
    resetChecked: authed,
    resets,
    at: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
