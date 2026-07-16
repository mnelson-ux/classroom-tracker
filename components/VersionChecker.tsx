'use client'

import { useEffect } from 'react'

// Periodically checks whether a newer version has been deployed. If so, it
// reloads the page (when the tab is hidden, or after a short grace period)
// so nobody is left running a stale, cached copy of the app.
export default function VersionChecker() {
  useEffect(() => {
    const myVersion = process.env.NEXT_PUBLIC_BUILD_ID
    if (!myVersion || myVersion === 'dev') return // skip in local dev

    let pending = false

    const reloadSoon = () => {
      if (document.hidden) { window.location.reload(); return }
      // Visible (e.g. a kiosk) — give a short grace period before refreshing.
      setTimeout(() => window.location.reload(), 45000)
    }

    const check = async () => {
      if (pending) return
      try {
        const r = await fetch('/api/version', { cache: 'no-store' })
        const d = await r.json()
        if (d?.version && d.version !== myVersion) { pending = true; reloadSoon() }
      } catch {}
    }

    const onVisible = () => { if (pending && document.hidden) window.location.reload() }

    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(check, 120000) // every 2 minutes
    check()
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  return null
}
