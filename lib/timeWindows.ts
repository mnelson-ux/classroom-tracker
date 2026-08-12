// Helpers for protected-time windows. Times are stored as minutes from midnight
// and evaluated against the school's configured IANA timezone.

export function minutesOfDayInTz(tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date())
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0')
    return h * 60 + m
  } catch {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }
}

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesToHHMM(min: number): string {
  return `${Math.floor(min / 60).toString().padStart(2, '0')}:${(min % 60).toString().padStart(2, '0')}`
}
