import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifySession, getTokenFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await verifySession(getTokenFromRequest(request))
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user_type === 'admin') {
    return NextResponse.json({ isAdmin: true, teacherId: null, name: 'Admin', school: null })
  }

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .select('id, name, school')
    .eq('id', session.user_id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

  return NextResponse.json({ isAdmin: false, teacherId: data.id, name: data.name, school: data.school })
}
