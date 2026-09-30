// Shared audio for pass screens. The browser only lets sound start from a user
// gesture, so we create AND resume the AudioContext the first time `primeAudio`
// runs inside a tap — then the overtime tone can play later on its own.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) ctx = new Ctor()
  }
  return ctx
}

// Call this from inside a user gesture (a tap) to unlock audio for the session.
export function primeAudio() {
  const c = getCtx()
  if (!c) return
  if (c.state !== 'running') c.resume().catch(() => {})
  // A one-sample silent buffer fully unlocks WebAudio on iOS.
  try {
    const b = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = b
    src.connect(c.destination)
    src.start(0)
  } catch {}
}

// Triple-beep. No-op if audio isn't unlocked (e.g. device muted / never tapped).
export function alertBeep() {
  const c = getCtx()
  if (!c) return
  if (c.state !== 'running') { c.resume().catch(() => {}); return }
  ;[0, 0.35, 0.7].forEach((t) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(c.destination)
    o.type = 'sine'; o.frequency.value = 880
    const s = c.currentTime + t
    g.gain.setValueAtTime(0.0001, s)
    g.gain.exponentialRampToValueAtTime(0.5, s + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.28)
    o.start(s); o.stop(s + 0.3)
  })
}
