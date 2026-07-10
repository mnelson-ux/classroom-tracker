import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function projectRef(jwt?: string): string | null {
  if (!jwt) return null
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())
    return `${payload.ref}/${payload.role}`
  } catch {
    return null
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('name, active')
    .order('name')

  return NextResponse.json({
    fullUrl: url,
    anonKey: projectRef(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceKey: projectRef(process.env.SUPABASE_SERVICE_ROLE_KEY),
    studentCount: data?.length ?? 0,
    students: data?.map((s) => `${s.name}:${s.active}`) ?? [],
    queryError: error?.message ?? null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
