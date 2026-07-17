import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const { checkoutId, studentId, pin } = await request.json()

  if (!checkoutId || !studentId || !pin) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify student PIN
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const pinValid = await bcrypt.compare(pin, student.pin_hash)
  if (!pinValid) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  // Fetch the checkout record
  const { data: checkout } = await supabaseAdmin
    .from('checkouts')
    .select('*')
    .eq('id', checkoutId)
    .eq('student_id', studentId)
    .eq('is_checked_out', true)
    .single()

  if (!checkout) {
    return NextResponse.json({ error: 'Checkout record not found' }, { status: 404 })
  }

  const checkInTime = new Date()
  const checkOutTime = new Date(checkout.check_out_time)
  const durationMinutes = Math.max(0, Math.floor((checkInTime.getTime() - checkOutTime.getTime()) / 1000 / 60))

  const { error } = await supabaseAdmin
    .from('checkouts')
    .update({
      check_in_time: checkInTime.toISOString(),
      duration_minutes: durationMinutes,
      is_checked_out: false,
    })
    .eq('id', checkoutId)

  if (error) {
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
