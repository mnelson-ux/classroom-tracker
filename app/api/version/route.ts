import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Returns the currently-deployed version, read at runtime.
export function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA || 'dev' },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  )
}
