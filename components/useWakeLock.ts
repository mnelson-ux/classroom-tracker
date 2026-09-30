'use client'

import { useEffect } from 'react'

// Keeps the screen awake while a pass is on-screen (iPadOS 16.4+ / Chrome), so the
// device doesn't go to standby and silence the overtime tone. The lock is released
// automatically when the page is hidden, so we re-acquire it when it becomes visible.
export function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    let cancelled = false
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }

    const request = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === 'visible' && !cancelled) {
          lock = await nav.wakeLock.request('screen')
        }
      } catch {}
    }
    request()

    const onVis = () => { if (document.visibilityState === 'visible') request() }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      try { lock?.release() } catch {}
    }
  }, [])
}
