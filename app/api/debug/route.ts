import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30),
    anonKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20),
  })
}
