import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Never cache or pre-render this route — always query the database live.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const school = new URL(request.url).searchParams.get('school') ?? 'hs'
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key, value')
    .eq('school', school)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings: Record<string, string> = {}
  data?.forEach((row) => { settings[row.key] = row.value })
  return NextResponse.json(settings, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
