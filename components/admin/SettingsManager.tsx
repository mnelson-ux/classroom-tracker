'use client'

import { useEffect, useState } from 'react'
import { schoolLabel } from '@/lib/schools'

interface SettingRow {
  key: string
  value: string
  label: string
  description: string
}

interface Props {
  settings: SettingRow[]
  token: string
  school: string
  onRefresh: () => void
}

export default function SettingsManager({ settings, token, school, onRefresh }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState('')
  const [resetMsg, setResetMsg] = useState('')

  const label = schoolLabel(school)

  const autoEnabled = values['auto_reset_enabled'] === 'true'
  const toggleAuto = (on: boolean) => {
    const next: Record<string, string> = { ...values, auto_reset_enabled: on ? 'true' : 'false' }
    // Prevent a surprise wipe: if enabling after this year's date already passed, mark this year done.
    if (on) {
      const dstr = values['auto_reset_date']
      const d = dstr ? new Date(`${dstr}T00:00:00`) : null
      if (d && !isNaN(d.getTime())) {
        const now = new Date()
        const resetThisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate())
        if (now >= resetThisYear) next['auto_reset_last_year'] = String(now.getFullYear())
      }
    }
    setValues(next)
  }

  const handleExport = async () => {
    setResetting('export'); setError('')
    const res = await fetch(`/api/admin/history?school=${school}&ts=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    })
    const records = await res.json()
    setResetting('')
    if (!Array.isArray(records)) { setError('Export failed'); return }
    const header = 'Student,Gender,Teacher,Location,Check-Out,Check-In,Duration (min)\n'
    const rows = records.map((r: any) => {
      const s = r.student || {}, t = r.teacher || {}
      return [s.name, s.gender, t.name, r.location,
        r.check_out_time ? new Date(r.check_out_time).toLocaleString() : '',
        r.check_in_time ? new Date(r.check_in_time).toLocaleString() : '',
        r.duration_minutes ?? ''].map((v) => `"${v ?? ''}"`).join(',')
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${label.replace(/\s+/g, '-').toLowerCase()}-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const runReset = async (action: string, opts: { confirm: string; typed?: string }) => {
    if (opts.typed) {
      const input = window.prompt(`This permanently affects ${label} data and cannot be undone.\n\nType ${opts.typed} to confirm:`)
      if (input !== opts.typed) return
    } else if (!window.confirm(opts.confirm)) {
      return
    }
    setResetting(action); setResetMsg(''); setError('')
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, school }),
    })
    const data = await res.json()
    setResetting('')
    if (!res.ok) { setError(data.error ?? 'Reset failed'); return }
    setResetMsg(data.message ?? 'Done')
    onRefresh()
    setTimeout(() => setResetMsg(''), 6000)
  }

  // Re-sync the editable values whenever the loaded settings change (e.g. switching school).
  useEffect(() => {
    setValues(Object.fromEntries(settings.map((s) => [s.key, s.value])))
  }, [settings])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    const updates = Object.entries(values).map(([key, value]) => ({ key, value }))
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ updates, school }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setSaved(true); onRefresh(); setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const groups = [
    { title: 'Display', keys: ['page_title', 'girls_section_title', 'boys_section_title'] },
    { title: 'Bathroom Limits', keys: ['max_bathroom_per_room_boys', 'max_bathroom_per_room_girls', 'max_bathroom_total_boys', 'max_bathroom_total_girls', 'time_limit_minutes'] },
    { title: 'Locations', keys: ['locations'] },
  ]

  const input = 'w-full max-w-md rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20'

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Settings</h2>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-800">{group.title}</h3>
            <div className="space-y-5">
              {group.keys.map((key) => {
                const setting = settings.find((s) => s.key === key)
                if (!setting) return null
                return (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-semibold text-gray-900">{setting.label}</label>
                    {setting.description && (
                      <p className="mb-2 text-xs text-gray-500">{setting.description}</p>
                    )}
                    <input
                      type={key.includes('minutes') || key.includes('max') ? 'number' : 'text'}
                      min={key.includes('max') || key.includes('minutes') ? '0' : undefined}
                      value={values[key] ?? setting.value}
                      onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                      className={input}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Automatic year-end reset (saved with the Save Settings button) */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-800">Automatic Year-End Reset</h3>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={autoEnabled} onChange={(e) => toggleAuto(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-purple-800 focus:ring-purple-700" />
          <span className="text-sm font-medium text-gray-900">
            Automatically delete all checkout history once a year for {label}
          </span>
        </label>
        {autoEnabled && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold text-gray-900">Reset date (repeats every year)</label>
            <p className="mb-2 text-xs text-gray-500">Only the month and day are used. The reset runs the next time an admin opens the panel on or after this date.</p>
            <input type="date" value={values['auto_reset_date'] ?? ''}
              onChange={(e) => setValues({ ...values, auto_reset_date: e.target.value })}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" />
          </div>
        )}
        <p className="mt-3 text-xs text-amber-700">Tip: export a CSV backup (below) before your reset date. Click “Save Settings” to apply changes.</p>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="rounded-xl bg-purple-800 px-8 py-3 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-600">✓ Settings saved</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      {/* Reset / data management */}
      <div className="mt-10 rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-red-600">Reset &amp; Data</h3>
        <p className="mb-5 text-sm text-gray-500">
          These actions apply to <span className="font-semibold text-gray-900">{label}</span> only. Switch the
          school toggle at the top to affect the other school.
        </p>

        <div className="space-y-4">
          {/* Export history CSV */}
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Export checkout history (CSV)</p>
              <p className="text-xs text-gray-500">Download a backup of all {label} checkout records. Do this before deleting history.</p>
            </div>
            <button
              onClick={handleExport}
              disabled={resetting !== ''}
              className="shrink-0 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-40">
              {resetting === 'export' ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>

          {/* Clear currently-out list */}
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Clear currently-out list</p>
              <p className="text-xs text-gray-500">Checks everyone back in. Use if students are stuck as “out”. Keeps history.</p>
            </div>
            <button
              onClick={() => runReset('clear_active', { confirm: `Clear the currently-out list for ${label}?` })}
              disabled={resetting !== ''}
              className="shrink-0 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-40">
              {resetting === 'clear_active' ? 'Clearing…' : 'Clear board'}
            </button>
          </div>

          {/* Reset settings to defaults */}
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Reset settings to defaults</p>
              <p className="text-xs text-gray-500">Restores titles, bathroom limits, and time limit to their default values.</p>
            </div>
            <button
              onClick={() => runReset('reset_settings', { confirm: `Reset all settings for ${label} to defaults?` })}
              disabled={resetting !== ''}
              className="shrink-0 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-40">
              {resetting === 'reset_settings' ? 'Resetting…' : 'Reset settings'}
            </button>
          </div>

          {/* Delete all checkout history */}
          <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Delete all checkout history</p>
              <p className="text-xs text-red-600">Permanently erases every checkout record for {label} (reports &amp; history). Cannot be undone. Students, teachers, and rooms are kept.</p>
            </div>
            <button
              onClick={() => runReset('clear_history', { confirm: '', typed: 'DELETE' })}
              disabled={resetting !== ''}
              className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40">
              {resetting === 'clear_history' ? 'Deleting…' : 'Delete history'}
            </button>
          </div>
        </div>

        {resetMsg && <p className="mt-4 text-sm font-semibold text-emerald-600">✓ {resetMsg}</p>}
      </div>
    </div>
  )
}
