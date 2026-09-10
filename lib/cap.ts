import { supabaseAdmin } from './supabaseAdmin'

// The most minutes a self-checkout pass may record. A pass that runs longer is
// treated as a forgotten check-in and capped to this value (configurable per school).
export async function maxRecordedMinutes(school: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('settings').select('value').eq('key', 'max_recorded_minutes').eq('school', school).maybeSingle()
  const n = parseInt(data?.value ?? '20')
  return Number.isFinite(n) && n > 0 ? n : 20
}

// Cap only student self-checkout passes (teacher-issued/excuse passes can be
// legitimately longer). Returns the minutes to record and whether it was capped.
export function applyCap(rawMinutes: number, passType: string | null, max: number): { minutes: number; capped: boolean } {
  if (passType === 'student' && rawMinutes > max) return { minutes: max, capped: true }
  return { minutes: Math.max(0, rawMinutes), capped: false }
}
