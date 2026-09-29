'use client'

import { useEffect, useRef } from 'react'

// Shared overtime nudge for pass screens: while `active`, sound a triple-beep and
// vibrate every few seconds until the student checks in. Audio is primed on any
// tap so it can play later even on iOS (which blocks audio without a gesture).
export function useOvertimeAlert(active: boolean) {
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const resume = () => {
      try {
        if (!audioRef.current) {
          const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
          if (Ctor) audioRef.current = new Ctor()
        }
        audioRef.current?.resume()
      } catch {}
    }
    resume()
    window.addEventListener('pointerdown', resume)
    window.addEventListener('touchstart', resume)
    return () => { window.removeEventListener('pointerdown', resume); window.removeEventListener('touchstart', resume) }
  }, [])

  useEffect(() => {
    if (!active) return
    const burst = () => {
      const ctx = audioRef.current
      if (ctx && ctx.state === 'running') {
        [0, 0.35, 0.7].forEach((t) => {
          const o = ctx.createOscillator(); const g = ctx.createGain()
          o.connect(g); g.connect(ctx.destination)
          o.type = 'sine'; o.frequency.value = 880
          const s = ctx.currentTime + t
          g.gain.setValueAtTime(0.0001, s)
          g.gain.exponentialRampToValueAtTime(0.45, s + 0.02)
          g.gain.exponentialRampToValueAtTime(0.0001, s + 0.28)
          o.start(s); o.stop(s + 0.3)
        })
      }
      try { navigator.vibrate?.([250, 120, 250, 120, 250]) } catch {}
    }
    burst()
    const id = setInterval(burst, 7000)
    return () => clearInterval(id)
  }, [active])
}
