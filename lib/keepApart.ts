import { supabaseAdmin } from './supabaseAdmin'
import { isUuid } from './validate'

// Students this student must stay apart from (keep-apart pairs, either direction).
export async function keepApartPartners(studentId: string, school: string): Promise<string[]> {
  if (!isUuid(studentId)) return []
  const { data } = await supabaseAdmin
    .from('keep_apart')
    .select('student_a, student_b')
    .eq('school', school)
    .or(`student_a.eq.${studentId},student_b.eq.${studentId}`)
  return (data ?? []).map((p) => (p.student_a === studentId ? p.student_b : p.student_a))
}

// True if any keep-apart partner of this student is currently checked out.
// Such a student may wait in line, but is never "ready" to go until the partner returns.
export async function partnerIsOut(studentId: string, school: string): Promise<boolean> {
  const partners = await keepApartPartners(studentId, school)
  if (partners.length === 0) return false
  const { count } = await supabaseAdmin
    .from('checkouts')
    .select('id', { count: 'exact', head: true })
    .eq('is_checked_out', true)
    .eq('school', school)
    .in('student_id', partners)
  return (count ?? 0) > 0
}

// Given an ordered list of queued student ids, is `studentId` the first ELIGIBLE
// one? Entries blocked by keep-apart are skipped so they don't hold up the line.
export async function isFrontEligible(orderedStudentIds: string[], studentId: string, school: string): Promise<boolean> {
  for (const id of orderedStudentIds) {
    if (id === studentId) return true
    if (!(await partnerIsOut(id, school))) return false // someone eligible is ahead
  }
  return false
}
