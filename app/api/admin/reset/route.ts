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
