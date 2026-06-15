import { NextResponse } from 'next/server'
import { deleteSession, getTokenFromRequest } from '@/lib/auth'

export async function POST(request: Request) {
  const token = getTokenFromRequest(request)
  if (token) await deleteSession(token)
  return NextResponse.json({ success: true })
}
