import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminSession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Default setting values (match the initial migration).
const DEFAULT_SETTINGS: Record<string, string> = {
  page_title: 'Classroom Check-In/Out Tracker',
  girls_section_title: 'Girls',
  boys_section_title: 'Boys',
  max_bathroom_per_room_boys: '1',
  max_bathroom_per_room_girls: '1',
  max_bathroom_total_boys: '2',
  max_bathroom_total_girls: '2',
  time_limit_minutes: '10',
  locations: 'Bathroom,Office,Nurse',
}

export async function POST(request: Request) {
  if (!await verifyAdminSession(getTokenFromRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, school } = await request.json()
  if (!school) return NextResponse.json({ error: 'Missing school' }, { status: 400 })

  if (action === 'clear_active') {
    // Clear the currently-out board (end any in-progress checkouts).
    const { error, count } = await supabaseAdmin
      .from('checkouts')
      .delete({ count: 'exact' })
      .eq('school', school)
      .eq('is_checked_out', true)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: `Cleared ${count ?? 0} student(s) from the currently-out list.` })
  }

  if (action === 'clear_history') {
    // Delete ALL checkout records for the school (history + active). Irreversible.
    const { error, count } = await supabaseAdmin
      .from('checkouts')
      .delete({ count: 'exact' })
      .eq('school', school)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: `Deleted ${count ?? 0} checkout record(s).` })
  }

  if (action === 'auto_check') {
    // Runs on admin load: perform the year-end reset if it's due for this school.
    const { data: rows } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .eq('school', school)
      .in('key', ['auto_reset_enabled', 'auto_reset_date', 'auto_reset_last_year'])
    const cfg: Record<string, string> = {}
    rows?.forEach((r) => { cfg[r.key] = r.value })

    if (cfg.auto_reset_enabled !== 'true' || !cfg.auto_reset_date) {
      return NextResponse.json({ triggered: false })
    }
    const now = new Date()
    const thisYear = now.getFullYear()
    const lastYear = parseInt(cfg.auto_reset_last_year || '0')
    const d = new Date(`${cfg.auto_reset_date}T00:00:00`)
    if (isNaN(d.getTime())) return NextResponse.json({ triggered: false })
    const resetThisYear = new Date(thisYear, d.getMonth(), d.getDate())

    if (lastYear < thisYear && now >= resetThisYear) {
      const { error, count } = await supabaseAdmin
        .from('checkouts')
        .delete({ count: 'exact' })
        .eq('school', school)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      await supabaseAdmin.from('settings')
        .update({ value: String(thisYear) })
        .eq('key', 'auto_reset_last_year')
        .eq('school', school)
      return NextResponse.json({ triggered: true, message: `Year-end reset ran — deleted ${count ?? 0} checkout record(s).` })
    }
    return NextResponse.json({ triggered: false })
  }

  if (action === 'reset_settings') {
    const errors: string[] = []
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const { error } = await supabaseAdmin
        .from('settings')
        .update({ value })
        .eq('key', key)
        .eq('school', school)
      if (error) errors.push(`${key}: ${error.message}`)
    }
    if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 500 })
    return NextResponse.json({ message: 'Settings restored to defaults.' })
  }

  return NextResponse.json({ error: 'Unknown reset action' }, { status: 400 })
}
