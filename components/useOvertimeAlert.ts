'use client'

import { useEffect } from 'react'
import { primeAudio, alertBeep } from '@/lib/passAudio'

// Shared overtime nudge for pass screens: while `active`, sound a triple-beep and
// vibrate every few seconds until the student checks in. Audio is unlocked on any
// tap (created inside the gesture) so it can play later even on iOS.
export function useOvertimeAlert(active: boolean) {
  useEffect(() => {
    primeAudio()
    const h = () => primeAudio()
    window.addEventListener('pointerdown', h)
    window.addEventListener('touchstart', h)
    return () => { window.removeEventListener('pointerdown', h); window.removeEventListener('touchstart', h) }
  }, [])

  useEffect(() => {
    if (!active) return
    const burst = () => {
      alertBeep()
      try { navigator.vibrate?.([250, 120, 250, 120, 250]) } catch {}
    }
    burst()
    const id = setInterval(burst, 7000)
    return () => clearInterval(id)
  }, [active])
}
