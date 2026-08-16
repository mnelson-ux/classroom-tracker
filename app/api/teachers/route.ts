import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isSchool } from '@/lib/schools'

// Never cache or pre-render this route — always query the database live.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const school = new URL(request.url).searchParams.get('school')
  let query = supabaseAdmin
    .from('teachers')
    .select('id, name, room_id, school, rooms(name)')
    .eq('active', true)
    .eq('is_support', false) // support staff aren't selectable as a teacher
    .order('name')
  // Teachers assigned to 'both' schools appear in each school's list.
  if (isSchool(school)) query = query.or(`school.eq.${school},school.eq.both`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
