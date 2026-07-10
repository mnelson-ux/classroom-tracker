'use client'

import { useEffect, useState } from 'react'

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

      <div className="mt-6 flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="rounded-xl bg-purple-800 px-8 py-3 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-600">✓ Settings saved</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  )
}
