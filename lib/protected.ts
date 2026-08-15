import { supabaseAdmin } from './supabaseAdmin'
import { minutesOfDayInTz } from './timeWindows'

// Returns the currently-active protected-time window for a school, or null.
export async function getActiveProtectedWindow(school: string): Promise<{ label: string | null; start_minute: number; end_minute: number } | null> {
  const [{ data: windows }, { data: tzRow }] = await Promise.all([
    supabaseAdmin.from('protected_times').select('label, start_minute, end_minute').eq('school', school).eq('active', true),
    supabaseAdmin.from('settings').select('value').eq('key', 'timezone').eq('school', school).maybeSingle(),
  ])
  const tz = tzRow?.value || 'America/New_York'
  const nowMin = minutesOfDayInTz(tz)
  return (windows ?? []).find((w) => nowMin >= w.start_minute && nowMin < w.end_minute) ?? null
}
