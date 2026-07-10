import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function projectRef(jwt?: string): string | null {
  if (!jwt) return null
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString())
    return payload.ref ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return NextResponse.json({
    fullUrl: url,
    anonKeyProjectRef: projectRef(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceKeyProjectRef: projectRef(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
