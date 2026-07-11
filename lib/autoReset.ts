import { supabaseAdmin } from './supabase'

// Performs the year-end history wipe for one school if it's enabled and due.
// Idempotent: runs at most once per calendar year (tracked via auto_reset_last_year).
export async function runAutoResetForSchool(
  school: string,
): Promise<{ triggered: boolean; message?: string; error?: string }> {
  const { data: rows } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .eq('school', school)
    .in('key', ['auto_reset_enabled', 'auto_reset_date', 'auto_reset_last_year'])

  const cfg: Record<string, string> = {}
  rows?.forEach((r) => { cfg[r.key] = r.value })

  if (cfg.auto_reset_enabled !== 'true' || !cfg.auto_reset_date) return { triggered: false }

  const now = new Date()
  const thisYear = now.getFullYear()
  const lastYear = parseInt(cfg.auto_reset_last_year || '0')
  const d = new Date(`${cfg.auto_reset_date}T00:00:00`)
  if (isNaN(d.getTime())) return { triggered: false }
  const resetThisYear = new Date(thisYear, d.getMonth(), d.getDate())

  if (lastYear < thisYear && now >= resetThisYear) {
    const { error, count } = await supabaseAdmin
      .from('checkouts')
      .delete({ count: 'exact' })
      .eq('school', school)
    if (error) return { triggered: false, error: error.message }
    await supabaseAdmin.from('settings')
      .update({ value: String(thisYear) })
      .eq('key', 'auto_reset_last_year')
      .eq('school', school)
    return { triggered: true, message: `Year-end reset ran — deleted ${count ?? 0} checkout record(s).` }
  }
  return { triggered: false }
}
