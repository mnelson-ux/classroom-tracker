import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('checkouts')
    .select(`
      *,
      student:students(id, name, gender),
      teacher:teachers(id, name),
      room:rooms(id, name)
    `)
    .eq('is_checked_out', true)
    .order('check_out_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
