import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Never cache or pre-render this route — always query the database live.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, name, gender, active')
    .eq('active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
